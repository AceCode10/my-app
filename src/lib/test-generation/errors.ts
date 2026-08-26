/**
 * Failures the route turns into specific HTTP responses.
 *
 * Each of these is something the teacher can act on, so they carry the data the
 * UI needs to offer a fix rather than just an apology.
 */

export interface LlmCallUsage {
  inputTokens: number;
  outputTokens: number;
  model: string;
  provider: string;
}

export class IntentParseError extends Error {
  readonly issues: unknown[];
  /** The call still cost money even though its output was unusable. */
  readonly usage?: LlmCallUsage;

  constructor(message: string, issues: unknown[] = [], usage?: LlmCallUsage) {
    super(message);
    this.name = 'IntentParseError';
    this.issues = issues;
    this.usage = usage;
  }
}

export interface ResolutionCandidate {
  id: string;
  label: string;
}

/** More than one subject or board matched what the teacher typed. */
export class AmbiguousResolutionError extends Error {
  readonly field: string;
  readonly candidates: ResolutionCandidate[];

  constructor(field: string, candidates: ResolutionCandidate[]) {
    super(`Multiple matches for ${field}`);
    this.name = 'AmbiguousResolutionError';
    this.field = field;
    this.candidates = candidates;
  }
}

/** Nothing matched, and there was no class context to fall back on. */
export class UnresolvedFieldError extends Error {
  readonly field: string;
  readonly value: string | null;

  constructor(field: string, value: string | null) {
    super(`Could not identify the ${field}`);
    this.name = 'UnresolvedFieldError';
    this.field = field;
    this.value = value;
  }
}
