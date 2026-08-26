/**
 * LLM spend recorder.
 *
 * Every model call in the app should go through here. Writes are
 * fire-and-forget by design: cost telemetry must never be able to fail a
 * teacher's request, so a failed insert is logged and swallowed.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { estimateCostUsd } from './pricing';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

/** Call sites, so the dashboard can attribute spend without parsing strings. */
export type LlmFeature =
  | 'test_generation'
  | 'ingestion_topic_assignment'
  | 'ingestion_mark_scheme'
  | 'ingestion_structure'
  | 'paper_extract_questions'
  | 'paper_extract_answers'
  | 'paper_vision_extraction';

export interface LlmUsageRecord {
  feature: LlmFeature;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  userId?: string | null;
  paperId?: string | null;
  jobId?: string | null;
  succeeded?: boolean;
  error?: string | null;
  /** Anything worth keeping for later analysis — page counts, prompt length. */
  metadata?: Record<string, unknown> | null;
  /** Halves the cost estimate, matching the Batch API discount. */
  batch?: boolean;
}

export async function recordLlmUsage(
  supabase: Db,
  record: LlmUsageRecord,
): Promise<void> {
  try {
    const { error } = await supabase.from('llm_usage').insert({
      feature: record.feature,
      provider: record.provider,
      model: record.model,
      input_tokens: Math.max(0, Math.round(record.inputTokens || 0)),
      output_tokens: Math.max(0, Math.round(record.outputTokens || 0)),
      estimated_cost_usd: estimateCostUsd(
        record.model,
        record.inputTokens || 0,
        record.outputTokens || 0,
        { batch: record.batch },
      ),
      user_id: record.userId ?? null,
      paper_id: record.paperId ?? null,
      job_id: record.jobId ?? null,
      succeeded: record.succeeded ?? true,
      error: record.error ?? null,
      metadata: record.metadata ?? null,
    });

    if (error) {
      console.warn(`[llm-usage] insert failed (${record.feature}): ${error.message}`);
    }
  } catch (err) {
    console.warn(`[llm-usage] insert threw (${record.feature}):`, err);
  }
}

/**
 * Record without making the caller wait.
 *
 * Serverless runtimes can freeze the process the moment the response is
 * returned, so this is only safe where the caller keeps the promise alive or
 * the extra few milliseconds do not matter. When in doubt, await instead.
 */
export function recordLlmUsageAsync(supabase: Db, record: LlmUsageRecord): void {
  void recordLlmUsage(supabase, record);
}
