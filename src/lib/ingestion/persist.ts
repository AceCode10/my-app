import type { SupabaseClient } from '@supabase/supabase-js';
import { buildIngestionKey } from './filename-parser';
import type { ExtractedQuestion, PaperMeta, PipelineOptions } from './types';

/**
 * Write a parsed paper into `past_papers` + `paper_questions`.
 *
 * Idempotency rests on two unique keys added by the ingestion migration:
 *   past_papers.ingestion_key            — one row per (board, subject, sitting)
 *   paper_questions (paper_id, question_ref) — one row per question
 *
 * Re-ingesting the same paper therefore reuses the SAME row ids, which is what
 * keeps `questions.source_paper_question_id` stable and stops live teacher
 * tests from losing their questions.
 *
 * Rows that stop being produced are soft-deleted via `archived_at`, never hard
 * deleted — they may sit inside a published assessment.
 */

export interface PersistResult {
  paperId: string;
  inserted: number;
  updated: number;
  archived: number;
  figuresUploaded: number;
  /** question_ref -> paper_questions.id, for the mirror step. */
  idByRef: Map<string, string>;
  warnings: string[];
}

const QUESTION_IMAGES_BUCKET = 'question-images';

function sessionLabel(meta: PaperMeta): string {
  switch (meta.session) {
    case 'mj': return 'May/June';
    case 'on': return 'Oct/Nov';
    case 'fm': return 'Feb/March';
    default: return '';
  }
}

function paperTitle(meta: PaperMeta): string {
  const parts = [
    meta.subjectName || meta.subjectCode || 'Paper',
    meta.year ? String(meta.year) : '',
    sessionLabel(meta),
    meta.componentCode ? `Paper ${meta.componentCode}` : meta.paperNumber ? `Paper ${meta.paperNumber}` : '',
  ].filter(Boolean);
  return parts.join(' ');
}

/** Find or create the `past_papers` row for this sitting. */
export async function upsertPaper(
  supabase: SupabaseClient,
  meta: PaperMeta,
  options: PipelineOptions,
  extra: {
    questionPaperUrl?: string;
    markSchemeUrl?: string;
    totalMarks?: number;
    /**
     * Files-only mode: metadata comes from the filename alone, so most fields
     * are null. Never overwrite a populated column with one of those nulls,
     * and never re-decide the status of a row that already exists — a paper
     * an admin has parked as draft must stay draft.
     */
    nullSafe?: boolean;
  } = {},
): Promise<{ paperId: string; created: boolean }> {
  const ingestionKey = buildIngestionKey(meta);

  const { data: existing, error: findError } = await supabase
    .from('past_papers')
    .select('id')
    .eq('ingestion_key', ingestionKey)
    .maybeSingle();

  if (findError) throw new Error(`Looking up the paper failed: ${findError.message}`);

  const payload: Record<string, unknown> = {
    ingestion_key: ingestionKey,
    title: paperTitle(meta),
    year: meta.year,
    session: meta.session,
    paper_number: meta.paperNumber ? Number(meta.paperNumber) : null,
    variant: meta.variant,
    component_code: meta.componentCode,
    total_marks: extra.totalMarks ?? meta.statedTotalMarks,
    duration_minutes: meta.durationMinutes,
    status: options.autoPublish ? 'published' : 'draft',
  };
  if (options.subjectId) payload.subject_id = options.subjectId;
  if (options.examBoardId) payload.exam_board_id = options.examBoardId;
  if (options.level) payload.level = options.level;
  if (extra.questionPaperUrl) {
    payload.question_paper_url = extra.questionPaperUrl;
    // paper_url is NOT NULL on this table and is the column the existing paper
    // views read, so it must always be populated.
    payload.paper_url = extra.questionPaperUrl;
  }
  if (extra.markSchemeUrl) payload.mark_scheme_url = extra.markSchemeUrl;

  if (extra.nullSafe) {
    for (const key of Object.keys(payload)) {
      if (payload[key] === null || payload[key] === undefined) delete payload[key];
    }
    // The row already has a status someone may have chosen deliberately.
    if (existing?.id) delete payload.status;
  }

  // Never attempt an insert that would violate the NOT NULL constraint.
  if (!existing?.id && !payload.paper_url) {
    payload.paper_url = '';
  }

  if (existing?.id) {
    const { error } = await supabase.from('past_papers').update(payload).eq('id', existing.id);
    if (error) throw new Error(`Updating the paper failed: ${error.message}`);
    return { paperId: existing.id, created: false };
  }

  const { data, error } = await supabase
    .from('past_papers')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw new Error(`Creating the paper failed: ${error.message}`);
  return { paperId: data.id, created: true };
}

async function uploadFigures(
  supabase: SupabaseClient,
  questions: ExtractedQuestion[],
  meta: PaperMeta,
  boardCode: string,
  warnings: string[],
): Promise<number> {
  let uploaded = 0;

  for (const question of questions) {
    const withPng = question.figures.filter((f) => f.png);
    if (withPng.length === 0) continue;

    for (const [index, figure] of withPng.entries()) {
      // Deterministic path: a re-run overwrites rather than accumulating orphans.
      const safeRef = question.ref.replace(/[()]/g, '');
      const path =
        `ingested/${boardCode}/${meta.subjectCode ?? 'unknown'}/` +
        `${meta.year ?? 'unknown'}-${meta.session}/${meta.componentCode ?? meta.paperNumber ?? 'p'}/` +
        `q${safeRef}-fig${index + 1}.png`;

      try {
        const bytes = Uint8Array.from(Buffer.from(figure.png!, 'base64'));
        const { error } = await supabase.storage
          .from(QUESTION_IMAGES_BUCKET)
          .upload(path, bytes, { contentType: 'image/png', upsert: true });
        if (error) throw new Error(error.message);

        const { data } = supabase.storage.from(QUESTION_IMAGES_BUCKET).getPublicUrl(path);
        if (index === 0) {
          (question as ExtractedQuestion & { imageUrl?: string }).imageUrl = data.publicUrl;
        }
        uploaded += 1;
      } catch (error) {
        warnings.push(`Uploading a figure for ${question.ref} failed: ${(error as Error).message}`);
      }
    }
  }

  return uploaded;
}

export async function persistQuestions(
  supabase: SupabaseClient,
  paperId: string,
  questions: ExtractedQuestion[],
  meta: PaperMeta,
  options: PipelineOptions & { jobId?: string; boardCode?: string },
): Promise<PersistResult> {
  const warnings: string[] = [];

  const figuresUploaded = options.figures
    ? await uploadFigures(supabase, questions, meta, options.boardCode ?? 'unknown', warnings)
    : 0;

  // Existing rows, so we can tell inserts from updates and archive removals.
  const { data: existingRows, error: existingError } = await supabase
    .from('paper_questions')
    .select('id, question_ref')
    .eq('paper_id', paperId)
    .is('archived_at', null);
  if (existingError) throw new Error(`Reading existing questions failed: ${existingError.message}`);

  const existingByRef = new Map<string, string>(
    (existingRows ?? []).map((r: { id: string; question_ref: string }) => [r.question_ref, r.id]),
  );

  const rows = questions.map((q) => ({
    paper_id: paperId,
    question_ref: q.ref,
    question_number: q.questionNumber,
    part_label: q.partLabel,
    question_text: q.questionText || (q.figures.length > 0 ? '[See figure]' : ''),
    question_type: q.questionType,
    marks: q.marks,
    difficulty: q.marks >= 6 ? 'hard' : q.marks >= 3 ? 'medium' : 'easy',
    correct_answer: q.correctAnswer || null,
    mark_scheme: q.markScheme || null,
    options: q.options ? JSON.parse(JSON.stringify(q.options)) : null,
    sub_inputs: q.subInputs,
    table_data: q.tableData ? JSON.parse(JSON.stringify(q.tableData)) : null,
    context_text: q.contextText,
    is_context_only: q.isContextOnly,
    needs_answer: q.needsAnswer,
    display_order: q.displayOrder,
    section_name: q.sectionName,
    has_image: q.figures.length > 0,
    question_image_url: (q as ExtractedQuestion & { imageUrl?: string }).imageUrl ?? null,
    image_position: q.figures.length > 0 ? 'after_text' : null,
    image_metadata: q.figures.length > 0
      ? { page: q.sourcePage, count: q.figures.length, labels: q.figures.map((f) => f.label) }
      : null,
    source_page: q.sourcePage,
    source_bbox: q.sourceBBox,
    extraction_confidence: q.confidence,
    extraction_method: 'python_v2',
    error_codes: q.errorCodes,
    review_status: q.errorCodes.length > 0 || q.confidence < 0.8 ? 'needs_review' : 'approved',
    ingestion_job_id: options.jobId ?? null,
    archived_at: null,
  }));

  // The unique index on (paper_id, question_ref) is PARTIAL — it excludes
  // archived rows — and PostgREST's onConflict cannot target a partial index.
  // Splitting into explicit inserts and updates is both correct here and
  // independent of upsert semantics.
  const idByRef = new Map<string, string>();

  const toInsert = rows.filter((r) => !existingByRef.has(r.question_ref));
  const toUpdate = rows.filter((r) => existingByRef.has(r.question_ref));

  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from('paper_questions')
      .insert(toInsert)
      .select('id, question_ref');
    if (error) throw new Error(`Saving new questions failed: ${error.message}`);
    for (const row of (data ?? []) as { id: string; question_ref: string }[]) {
      idByRef.set(row.question_ref, row.id);
    }
  }

  for (const row of toUpdate) {
    const id = existingByRef.get(row.question_ref)!;
    const { error } = await supabase.from('paper_questions').update(row).eq('id', id);
    if (error) throw new Error(`Updating question ${row.question_ref} failed: ${error.message}`);
    idByRef.set(row.question_ref, id);
  }

  // --- parent links, second pass ------------------------------------------
  const parentUpdates = questions
    .filter((q) => q.parentRef && idByRef.has(q.ref) && idByRef.has(q.parentRef))
    .map((q) => ({ id: idByRef.get(q.ref)!, parent_question_id: idByRef.get(q.parentRef!)! }));

  for (const update of parentUpdates) {
    const { error } = await supabase
      .from('paper_questions')
      .update({ parent_question_id: update.parent_question_id })
      .eq('id', update.id);
    if (error) warnings.push(`Linking a parent question failed: ${error.message}`);
  }

  // --- archive rows this run no longer produces ----------------------------
  const producedRefs = new Set(questions.map((q) => q.ref));
  const staleIds = [...existingByRef.entries()]
    .filter(([ref]) => !producedRefs.has(ref))
    .map(([, id]) => id);

  if (staleIds.length > 0) {
    const { error } = await supabase
      .from('paper_questions')
      .update({ archived_at: new Date().toISOString() })
      .in('id', staleIds);
    if (error) warnings.push(`Archiving removed questions failed: ${error.message}`);
  }

  const inserted = [...producedRefs].filter((ref) => !existingByRef.has(ref)).length;

  return {
    paperId,
    inserted,
    updated: rows.length - inserted,
    archived: staleIds.length,
    figuresUploaded,
    idByRef,
    warnings,
  };
}
