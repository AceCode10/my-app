import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../_lib';

export const dynamic = 'force-dynamic';

const TERMINAL = ['completed', 'completed_with_warnings', 'needs_review', 'failed', 'skipped', 'cancelled'];

/**
 * Supabase cannot infer row types from a select list built by string
 * concatenation, so the shape the UI depends on is declared explicitly.
 */
interface JobSummaryRow {
  id: string;
  status: string;
  questions_extracted: number | null;
  answers_matched: number | null;
  questions_mirrored: number | null;
  llm_calls: number | null;
}

/**
 * GET /api/admin/ingestion/batches/[batchId]
 *
 * One request returns every job row, so the UI polls a single endpoint rather
 * than fanning out per paper. `allTerminal` lets the client stop polling.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { batchId } = await params;

  const { data: batch, error: batchError } = await auth.ctx.service
    .from('ingestion_batches')
    .select('*')
    .eq('id', batchId)
    .single();

  if (batchError || !batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  const { data: jobs, error: jobsError } = await auth.ctx.service
    .from('ingestion_jobs')
    .select(
      'id, pair_key, paper_id, status, stage, progress_percent, profile_id, subject_code, ' +
        'exam_year, session_code, paper_number, variant, metadata_source, metadata_confidence, ' +
        'questions_extracted, answers_matched, answers_unmatched, figures_extracted, ' +
        'questions_mirrored, marks_extracted, marks_stated_qp, marks_stated_ms, confidence, ' +
        'gate_results, error_codes, warnings, error_message, degraded_mode, llm_calls, ' +
        'figures_pending, created_at, completed_at',
    )
    .eq('batch_id', batchId)
    .order('pair_key');

  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 });

  const { data: orphans } = await auth.ctx.service
    .from('ingestion_files')
    .select('id, original_name, doc_type, status, error_message')
    .eq('batch_id', batchId)
    .is('job_id', null);

  const rows = (jobs ?? []) as unknown as JobSummaryRow[];
  const pending = rows.filter((j) => !TERMINAL.includes(j.status));

  return NextResponse.json({
    batch,
    jobs: rows,
    orphans: orphans ?? [],
    pendingJobIds: pending.map((j) => j.id),
    allTerminal: rows.length > 0 && pending.length === 0,
    summary: {
      total: rows.length,
      completed: rows.filter((j) => j.status === 'completed').length,
      needsReview: rows.filter((j) => j.status === 'needs_review').length,
      withWarnings: rows.filter((j) => j.status === 'completed_with_warnings').length,
      failed: rows.filter((j) => j.status === 'failed').length,
      questions: rows.reduce((sum, j) => sum + (j.questions_extracted ?? 0), 0),
      answers: rows.reduce((sum, j) => sum + (j.answers_matched ?? 0), 0),
      mirrored: rows.reduce((sum, j) => sum + (j.questions_mirrored ?? 0), 0),
      llmCalls: rows.reduce((sum, j) => sum + (j.llm_calls ?? 0), 0),
    },
  });
}

/** DELETE — cancel every job that has not finished. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const { batchId } = await params;

  const { error } = await auth.ctx.service
    .from('ingestion_jobs')
    .update({ status: 'cancelled' })
    .eq('batch_id', batchId)
    .in('status', ['pending', 'running']);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await auth.ctx.service
    .from('ingestion_batches')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', batchId);

  return NextResponse.json({ cancelled: true });
}
