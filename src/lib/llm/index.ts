import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import {
  type CompleteOptions,
  type LlmProvider,
  type LlmResult,
  type VisionOptions,
  isProviderUnavailableError,
  isTransientLlmError,
} from './provider';

export * from './provider';
export { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL } from './anthropic';
export { OpenAIProvider, DEFAULT_OPENAI_MODEL } from './openai';

/**
 * Wraps a primary provider and falls back to a secondary one on transient
 * failures (rate limits, 5xx, timeouts) or a missing API key. Also retries the
 * primary once, since a single 429 is far more common than a real outage.
 *
 * Every call is counted so a job row can report exactly how much LLM work a
 * paper required — the golden-run assertion is that Cambridge papers need zero.
 */
export class FailoverLlmProvider implements LlmProvider {
  readonly name: string;
  readonly model: string;

  private callCount = 0;
  private inputTokens = 0;
  private outputTokens = 0;

  constructor(
    private readonly primary: LlmProvider,
    private readonly secondary?: LlmProvider,
  ) {
    this.name = secondary ? `${primary.name}->${secondary.name}` : primary.name;
    this.model = primary.model;
  }

  get stats() {
    return {
      calls: this.callCount,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
    };
  }

  private record<T>(result: LlmResult<T>): LlmResult<T> {
    this.callCount += 1;
    this.inputTokens += result.usage.inputTokens;
    this.outputTokens += result.usage.outputTokens;
    return result;
  }

  private async attempt<T>(run: (p: LlmProvider) => Promise<LlmResult<T>>): Promise<LlmResult<T>> {
    try {
      return this.record(await run(this.primary));
    } catch (primaryError) {
      const unavailable = isProviderUnavailableError(primaryError);
      const retryable = isTransientLlmError(primaryError);

      // A revoked key, an empty credit balance or an exhausted quota fails the
      // same way a second later. Skip the retry and go straight to the
      // secondary — this is the case failover exists for.
      if (retryable && !unavailable) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          return this.record(await run(this.primary));
        } catch {
          // fall through to the secondary
        }
      }

      // A malformed request is the caller's bug: the secondary would reject it
      // identically, so surface it rather than doubling the cost of a failure.
      if (!this.secondary || (!retryable && !unavailable)) {
        throw primaryError;
      }

      console.warn(
        `[llm] ${this.primary.name} failed (${(primaryError as Error).message}); failing over to ${this.secondary.name}`,
      );
      return this.record(await run(this.secondary));
    }
  }

  complete<T = unknown>(opts: CompleteOptions): Promise<LlmResult<T>> {
    return this.attempt<T>((p) => p.complete<T>(opts));
  }

  vision<T = unknown>(opts: VisionOptions): Promise<LlmResult<T>> {
    return this.attempt<T>((p) => p.vision<T>(opts));
  }
}

/**
 * Build the provider pair from env. `LLM_PROVIDER` picks the primary
 * ('anthropic' | 'openai'); the other becomes the failover when its key exists.
 */
export function getLlmProvider(opts?: { provider?: string; model?: string }): FailoverLlmProvider {
  const choice = (opts?.provider ?? process.env.LLM_PROVIDER ?? 'anthropic').toLowerCase();

  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

  if (choice === 'openai') {
    return new FailoverLlmProvider(
      new OpenAIProvider({ model: opts?.model }),
      hasAnthropic ? new AnthropicProvider() : undefined,
    );
  }

  return new FailoverLlmProvider(
    new AnthropicProvider({ model: opts?.model }),
    hasOpenAI ? new OpenAIProvider() : undefined,
  );
}
