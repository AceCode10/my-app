import Anthropic from '@anthropic-ai/sdk';
import {
  type CompleteOptions,
  type LlmProvider,
  type LlmResult,
  type VisionOptions,
  parseJsonLoose,
} from './provider';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5';

/**
 * Anthropic-backed provider. Lazily constructs the client so importing this
 * module during `next build` (when env vars are absent) cannot throw — the same
 * pattern the existing extract-* routes use.
 */
export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  readonly model: string;

  private client: Anthropic | null = null;
  private readonly apiKey: string | undefined;

  constructor(opts?: { apiKey?: string; model?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.ANTHROPIC_API_KEY;
    this.model = opts?.model ?? process.env.LLM_MODEL ?? DEFAULT_ANTHROPIC_MODEL;
  }

  private getClient(): Anthropic {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not set');
    }
    if (!this.client) {
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
    return this.client;
  }

  private buildSystem(system: string, jsonSchema?: Record<string, unknown>): string {
    if (!jsonSchema) return system;
    return `${system}\n\nRespond with raw JSON only — no prose, no markdown fence. Match this shape:\n${JSON.stringify(
      jsonSchema,
      null,
      2,
    )}`;
  }

  async complete<T = unknown>(opts: CompleteOptions): Promise<LlmResult<T>> {
    const response = await this.getClient().messages.create({
      model: this.model,
      max_tokens: opts.maxTokens ?? 8192,
      temperature: opts.temperature ?? 0,
      system: this.buildSystem(opts.system, opts.jsonSchema),
      messages: [{ role: 'user', content: opts.user }],
    });

    return this.toResult<T>(response);
  }

  async vision<T = unknown>(opts: VisionOptions): Promise<LlmResult<T>> {
    const content: Anthropic.ContentBlockParam[] = opts.images.map((data) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: 'image/png' as const, data },
    }));
    content.push({ type: 'text', text: opts.user });

    const response = await this.getClient().messages.create({
      model: this.model,
      max_tokens: opts.maxTokens ?? 8192,
      temperature: 0,
      system: opts.system,
      messages: [{ role: 'user', content }],
    });

    return this.toResult<T>(response);
  }

  private toResult<T>(response: Anthropic.Message): LlmResult<T> {
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      json: parseJsonLoose<T>(text),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      model: this.model,
      provider: this.name,
    };
  }
}
