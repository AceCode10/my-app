import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getLlmProvider } from '@/lib/llm';
import { persistPaperResult } from '@/lib/ingestion/persist-result';
import { runPaper } from '@/lib/ingestion/pipeline';
import { getProfile } from '@/lib/ingestion/profiles';
import { parseFilename } from '@/lib/ingestion/filename-parser';
import { DEFAULT_PIPELINE_OPTIONS, type FileRef, type PipelineOptions } from '@/lib/ingestion/types';
import type { PairedPaper } from '@/lib/ingestion/pairing';
import { PAST_PAPERS_BUCKET, requireAdmin } from '../../../_lib';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface FileRow {
  id: string;
  original_name: string;
  doc_type: string;
  storage_path: string | null;
}

/**
 * POST /api/admin/ingestion/jobs/[jobId]/step
 *
 * Advances ONE job. The client calls this in a bounded loop across the batch,
 * so no single serverless invocation has to carry a whole folder, progress
 * reporting is free, and closing the tab pauses rather than fails.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;
  const { jobId } = await params;

  const { data: job, error: jobError } = await ctx.service
    .from('ingestion_jobs')
    .select('*, batch:ingestion_batches(*)')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (['completed', 'completed_with_warnings', 'skipped', 'cancelled'].includes(job.status)) {
    return NextResponse.json({ jobId, status: job.status, done: true });
  }

  const batch = job.batch as {
    subject_id: string | null;
    exam_board_id: string | null;
    level: string | null;
    profile_id: string | null;
    options: Record<string, unknown> | null;
  };

  await ctx.service
    .from('ingestion_jobs')
    .update({
      status: 'running',
      stage: 'text',
      started_at: job.started_at ?? new Date().toISOString(),
      attempt_count: (job.attempt_count ?? 0) + 1,
    })
    .eq('id', jobId);

  try {
    const { data: files, error: filesError } = await ctx.service
      .from('ingestion_files')
      .select('id, original_name, doc_type, storage_path')
      .eq('job_id', jobId);
    if (filesError) throw new Error(`Reading job files failed: ${filesError.message}`);

    const rows = (files ?? []) as FileRow[];
    const qpRow = rows.find((f) => f.doc_type === 'qp');
    if (!qpRow?.storage_path) throw new Error('This job has no stored question paper.');
    const msRow = rows.find((f) => f.doc_type === 'ms');

    const toRef = (row: FileRow): FileRef => ({
      name: row.original_name,
      path: row.storage_path!,
      size: undefined,
    });

    const meta = parseFilename(qpRow.original_name, batch.profile_id ?? job.profile_id ?? null);
    const { profile: _profile, ...paperMeta } = meta;

    const pair: PairedPaper = {
      pairKey: job.pair_key,
      meta: paperMeta,
      questionPaper: toRef(qpRow),
      markScheme: msRow?.storage_path ? toRef(msRow) : null,
      extras: [],
      duplicates: [],
      issues: [],
    };

    const options: PipelineOptions = {
      ...DEFAULT_PIPELINE_OPTIONS,
      ...(batch.options ?? {}),
      dryRun: false,
      subjectId: batch.subject_id ?? undefined,
      examBoardId: batch.exam_board_id ?? undefined,
      level: batch.level ?? undefined,
      profileId: (batch.profile_id ?? undefined) as PipelineOptions['profileId'],
    };

    const hasLlmKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
    const llm = hasLlmKey ? getLlmProvider() : undefined;

    // Files live in Supabase storage here, on disk in the CLI — the only
    // difference between the two entry points.
    const readFile = async (ref: FileRef): Promise<Uint8Array> => {
      const { data, error } = await ctx.service.storage.from(PAST_PAPERS_BUCKET).download(ref.path);
      if (error || !data) throw new Error(`Downloading ${ref.name} failed: ${error?.message}`);
      return new Uint8Array(await data.arrayBuffer());
    };

    const result = await runPaper(pair, { readFile, llm }, options);

    if (result.status === 'failed') {
      await ctx.service
        .from('ingestion_jobs')
        .update({
          status: 'failed',
          stage: 'text',
          error_message: result.errors.join('; '),
          error_stage: 'extract',
          warnings: result.warnings,
          degraded_mode: result.degradedMode,
          progress_percent: 100,
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      return NextResponse.json({ jobId, status: 'failed', done: true, errors: result.errors });
    }

    await ctx.service.from('ingestion_jobs').update({ stage: 'persist' }).eq('id', jobId);

    const outcome = await persistPaperResult(ctx.service, result, pair, { ...options, jobId, llm }, {
      readFile,
    });

    const marksExtracted = result.questions.reduce((sum, q) => sum + q.marks, 0);
    const status =
      result.status === 'completed'
        ? 'completed'
        : result.status === 'needs_review'
          ? 'needs_review'
          : 'completed_with_warnings';

    await ctx.service
      .from('ingestion_jobs')
      .update({
        paper_id: outcome.paperId,
        status,
        stage: 'gate',
        progress_percent: 100,
        profile_id: result.profile.id,
        subject_code: result.meta.subjectCode,
        exam_year: result.meta.year,
        session_code: result.meta.session,
        paper_number: result.meta.paperNumber,
        variant: result.meta.variant,
        metadata_source: result.meta.source,
        metadata_confidence: result.meta.confidence,
        questions_extracted: result.questions.length,
        answers_matched: result.answersMatched,
        answers_unmatched: result.qpOnly.length,
        figures_extracted: outcome.questions.figuresUploaded,
        questions_mirrored: outcome.mirror?.mirrored ?? 0,
        marks_extracted: marksExtracted,
        marks_stated_qp: result.meta.statedTotalMarks,
        confidence: result.validation.confidence,
        gate_results: result.validation.gates,
        error_codes: result.validation.errorCodes,
        warnings: [...result.warnings, ...outcome.warnings],
        degraded_mode: result.degradedMode,
        llm_calls: result.usedLlm ? 1 : 0,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    await refreshBatchCounters(ctx.service, job.batch_id);

    return NextResponse.json({
      jobId,
      status,
      done: true,
      paperId: outcome.paperId,
      questions: result.questions.length,
      answersMatched: result.answersMatched,
      mirrored: outcome.mirror?.mirrored ?? 0,
      confidence: result.validation.confidence,
    });
  } catch (error) {
    await ctx.service
      .from('ingestion_jobs')
      .update({
        status: 'failed',
        error_message: (error as Error).message,
        progress_percent: 100,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    await refreshBatchCounters(ctx.service, job.batch_id);

    console.error('[ingestion] job step failed', error);
    return NextResponse.json({ jobId, status: 'failed', error: (error as Error).message }, { status: 500 });
  }
}

async function refreshBatchCounters(service: SupabaseClient, batchId: string): Promise<void> {
  const { data } = await service.from('ingestion_jobs').select('status').eq('batch_id', batchId);
  const jobs = (data ?? []) as { status: string }[];

  const terminal = ['completed', 'completed_with_warnings', 'needs_review', 'failed', 'skipped'];
  const completed = jobs.filter((j) => terminal.includes(j.status)).length;
  const failed = jobs.filter((j) => j.status === 'failed').length;
  const allDone = jobs.length > 0 && completed === jobs.length;
  const anyWarn = jobs.some(
    (j) => j.status === 'needs_review' || j.status === 'completed_with_warnings',
  );

  await service
    .from('ingestion_batches')
    .update({
      completed_jobs: completed,
      failed_jobs: failed,
      status: allDone
        ? failed > 0
          ? 'failed'
          : anyWarn
            ? 'completed_with_warnings'
            : 'completed'
        : 'running',
      ...(allDone ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('id', batchId);
}
