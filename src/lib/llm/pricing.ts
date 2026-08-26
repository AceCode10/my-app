/**
 * Model rates, in USD per million tokens.
 *
 * A model that is absent here is priced as `null` — not as zero. An unpriced
 * call still records its token counts, and `llm_usage_daily.unpriced_calls`
 * makes the gap visible instead of quietly understating spend.
 */

export interface ModelRate {
  inputPerMTok: number;
  outputPerMTok: number;
  /** When these figures were last confirmed against the provider's price list. */
  verifiedOn: string;
}

/**
 * Anthropic first-party API rates, confirmed 2026-06-24.
 * Batch API is half of these; cache reads are ~0.1x input and cache writes ~1.25x.
 */
const ANTHROPIC_RATES: Record<string, ModelRate> = {
  'claude-fable-5': { inputPerMTok: 10, outputPerMTok: 50, verifiedOn: '2026-06-24' },
  'claude-opus-5': { inputPerMTok: 5, outputPerMTok: 25, verifiedOn: '2026-06-24' },
  'claude-opus-4-8': { inputPerMTok: 5, outputPerMTok: 25, verifiedOn: '2026-06-24' },
  'claude-opus-4-7': { inputPerMTok: 5, outputPerMTok: 25, verifiedOn: '2026-06-24' },
  'claude-opus-4-6': { inputPerMTok: 5, outputPerMTok: 25, verifiedOn: '2026-06-24' },
  'claude-sonnet-5': { inputPerMTok: 2, outputPerMTok: 10, verifiedOn: '2026-06-24' },
  'claude-sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15, verifiedOn: '2026-06-24' },
  'claude-haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5, verifiedOn: '2026-06-24' },
};

/**
 * OpenAI rates are deliberately empty.
 *
 * The three legacy extraction routes run on gpt-4o and account for most of the
 * historical spend, but these figures were never confirmed against OpenAI's
 * current price list. Recording a guessed rate would produce a cost dashboard
 * that looks authoritative and is wrong, which is worse than one that shows the
 * gap. Add entries here once verified — token counts are already being
 * recorded, so backfilling cost is a single UPDATE.
 */
const OPENAI_RATES: Record<string, ModelRate> = {};

export const MODEL_RATES: Record<string, ModelRate> = {
  ...ANTHROPIC_RATES,
  ...OPENAI_RATES,
};

export function getModelRate(model: string): ModelRate | null {
  if (MODEL_RATES[model]) return MODEL_RATES[model];

  // Tolerate dated snapshot ids ("claude-haiku-4-5-20251001") by matching the
  // longest known prefix, so a pinned model still prices correctly.
  const match = Object.keys(MODEL_RATES)
    .filter((known) => model.startsWith(known))
    .sort((a, b) => b.length - a.length)[0];

  return match ? MODEL_RATES[match] : null;
}

/**
 * Cost of one call in USD, or null when the model has no known rate.
 *
 * `batch` halves both sides, matching the Batch API discount.
 */
export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  options: { batch?: boolean } = {},
): number | null {
  const rate = getModelRate(model);
  if (!rate) return null;

  const multiplier = options.batch ? 0.5 : 1;
  const cost =
    (inputTokens / 1_000_000) * rate.inputPerMTok * multiplier +
    (outputTokens / 1_000_000) * rate.outputPerMTok * multiplier;

  // The column is NUMERIC(12,6); round here so the stored value matches what
  // the caller computed.
  return Math.round(cost * 1_000_000) / 1_000_000;
}
