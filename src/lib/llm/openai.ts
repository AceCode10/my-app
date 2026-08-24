import OpenAI from 'openai';
import {
  type CompleteOptions,
  type LlmProvider,
  type LlmResult,
  type VisionOptions,
  parseJsonLoose,
} from './provider';

export const DEFAULT_OPENAI_MODEL = 'gpt-4o';

/**
 * OpenAI-backed provider. Kept as the failover path for the Anthropic provider,
 * and as the engine behind the pre-existing single-paper extract routes.
 */
export class OpenAIProvider implements LlmProvider {
  readonly name = 'openai';
  readonly model: string;

  private client: OpenAI | null = null;
  private readonly apiKey: string | undefined;

  constructor(opts?: { apiKey?: string; model?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.OPENAI_API_KEY;
    this.model = opts?.model ?? process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
  }

  private getClient(): OpenAI {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    if (!this.client) {
      this.client = new OpenAI({ apiKey: this.apiKey });
    }
    return this.client;
  }

  private buildSystem(system: string, jsonSchema?: Record<string, unknown>): string {
    // response_format json_object requires the word "JSON" somewhere in the prompt.
    if (!jsonSchema) return `${system}\n\nRespond with valid JSON only.`;
    return `${system}\n\nRespond with valid JSON only — no prose, no markdown fence. Match this shape:\n${JSON.stringify(
      jsonSchema,
      null,
      2,
    )}`;
  }

  async complete<T = unknown>(opts: CompleteOptions): Promise<LlmResult<T>> {
    const response = await this.getClient().chat.completions.create({
      model: this.model,
      temperature: opts.temperature ?? 0,
      max_tokens: opts.maxTokens ?? 8192,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: this.buildSystem(opts.system, opts.jsonSchema) },
        { role: 'user', content: opts.user },
      ],
    });

    return this.toResult<T>(response);
  }

  async vision<T = unknown>(opts: VisionOptions): Promise<LlmResult<T>> {
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = opts.images.map((data) => ({
      type: 'image_url' as const,
      image_url: { url: `data:image/png;base64,${data}`, detail: 'high' as const },
    }));
    content.push({ type: 'text', text: opts.user });

    const response = await this.getClient().chat.completions.create({
      model: this.model,
      temperature: 0,
      max_tokens: opts.maxTokens ?? 8192,
      messages: [
        { role: 'system', content: this.buildSystem(opts.system) },
        { role: 'user', content },
      ],
    });

    return this.toResult<T>(response);
  }

  private toResult<T>(response: OpenAI.Chat.Completions.ChatCompletion): LlmResult<T> {
    const text = response.choices[0]?.message?.content ?? '';

    return {
      json: parseJsonLoose<T>(text),
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
      model: this.model,
      provider: this.name,
    };
  }
}
