/**
 * Provider-agnostic LLM interface for the ingestion pipeline.
 *
 * The pipeline is deterministic-first: on Cambridge papers the happy path makes
 * ZERO calls through this interface. It exists for mark schemes on boards that
 * publish no machine-readable answer table, for repairing question blocks the
 * geometric segmenter could not resolve, and for topic assignment.
 */

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmResult<T = unknown> {
  json: T;
  usage: LlmUsage;
  model: string;
  provider: string;
}

export interface CompleteOptions {
  system: string;
  user: string;
  /** Shape hint appended to the system prompt. Both providers are asked for raw JSON. */
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface VisionOptions {
  system: string;
  user: string;
  /** Base64-encoded PNG payloads, without the data: URI prefix. */
  images: string[];
  maxTokens?: number;
}

export interface LlmProvider {
  readonly name: string;
  readonly model: string;
  complete<T = unknown>(opts: CompleteOptions): Promise<LlmResult<T>>;
  vision<T = unknown>(opts: VisionOptions): Promise<LlmResult<T>>;
}

/**
 * Models occasionally wrap JSON in prose or a fenced block despite instructions.
 * Recover the outermost JSON value rather than failing the whole stage.
 */
export function parseJsonLoose<T = unknown>(raw: string): T {
  const text = raw.trim();

  try {
    return JSON.parse(text) as T;
  } catch {
    // fall through to recovery
  }

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim()) as T;
    } catch {
      // fall through
    }
  }

  // Outermost {...} or [...]
  const firstBrace = text.search(/[{[]/);
  if (firstBrace !== -1) {
    const opener = text[firstBrace];
    const closer = opener === '{' ? '}' : ']';
    const lastCloser = text.lastIndexOf(closer);
    if (lastCloser > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastCloser + 1)) as T;
      } catch {
        // fall through
      }
    }
  }

  throw new Error(`LLM did not return parseable JSON. First 300 chars: ${text.slice(0, 300)}`);
}

/**
 * Errors where the provider itself is unusable — not the request.
 *
 * Retrying these on the same provider is pointless: a revoked key, an empty
 * credit balance or an exhausted quota fails identically a second later. But
 * they are exactly the cases where the secondary provider would have worked,
 * so they must fail over rather than throw.
 *
 * Both providers report billing and quota problems with a status that is
 * otherwise ambiguous (400 for Anthropic credit, 429 for OpenAI quota), so the
 * message body is the only reliable signal.
 */
export function isProviderUnavailableError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const message = String((err as Error)?.message ?? '').toLowerCase();

  // Never reached the wire — the key was absent at construction.
  if (message.includes('is not set')) return true;

  // Key is wrong, revoked, or lacks access to the model.
  if (status === 401 || status === 403 || status === 402) return true;

  return (
    message.includes('credit balance') ||
    message.includes('insufficient_quota') ||
    message.includes('insufficient quota') ||
    message.includes('exceeded your current quota') ||
    message.includes('billing') ||
    message.includes('payment required') ||
    message.includes('account is not active') ||
    message.includes('invalid api key') ||
    message.includes('invalid x-api-key') ||
    message.includes('authentication')
  );
}

/** Errors worth retrying on the same provider, or failing over on. */
export function isTransientLlmError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (typeof status === 'number') {
    return status === 408 || status === 409 || status === 429 || status >= 500;
  }
  const message = String((err as Error)?.message ?? '').toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('etimedout') ||
    message.includes('fetch failed') ||
    message.includes('overloaded')
  );
}
