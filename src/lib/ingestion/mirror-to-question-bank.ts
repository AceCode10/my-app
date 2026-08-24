import type { SupabaseClient } from '@supabase/supabase-js';
import type { LlmProvider } from '../llm';
import { toQuestionsEnum } from './structure/classify';
import {
  assignTopics,
  ensureUnclassifiedTopic,
  loadTopics,
  type TopicAssignment,
} from './topic-assignment';
import type { ExtractedQuestion, PipelineOptions } from './types';

/**
 * Mirror ingested questions into the `questions` bank.
 *
 * This is the bridge that was missing. Extraction wrote `paper_questions`,
 * while the teacher test builder reads `questions` filtered by
 * `status='published'` AND `.not('topic_id','is',null)` — so every ingested
 * question was invisible to it. The source even admitted as much:
 * "Paper questions must first be added to a topic to appear here."
 *
 * Idempotency comes from the unique index on `questions.source_paper_question_id`:
 * a re-run upserts onto the same rows, so `assessment_questions` foreign keys in
 * live teacher tests keep resolving.
 */

export interface MirrorResult {
  mirrored: number;
  skipped: number;
  archived: number;
  topicsAssigned: number;
  topicsFallback: number;
  warnings: string[];
}

/** Types the `questions` CHECK constraint accepts. */
function safeType(question: ExtractedQuestion): string {
  return toQuestionsEnum(question.questionType);
}

export async function mirrorToQuestionBank(
  supabase: SupabaseClient,
  paperId: string,
  questions: ExtractedQuestion[],
  idByRef: Map<string, string>,
  options: PipelineOptions & { jobId?: string; llm?: LlmProvider; publish: boolean },
): Promise<MirrorResult> {
  const warnings: string[] = [];

  const { data: paper, error: paperError } = await supabase
    .from('past_papers')
    .select('id, subject_id, exam_board_id, level')
    .eq('id', paperId)
    .single();
  if (paperError) throw new Error(`Reading the paper failed: ${paperError.message}`);

  const subjectId = paper.subject_id ?? options.subjectId;
  if (!subjectId) {
    return {
      mirrored: 0,
      skipped: questions.length,
      archived: 0,
      topicsAssigned: 0,
      topicsFallback: 0,
      warnings: ['The paper has no subject, so nothing can be mirrored into the question bank.'],
    };
  }

  // --- topics ---------------------------------------------------------------
  const topics = await loadTopics(supabase, subjectId, paper.exam_board_id ?? undefined);
  const fallbackTopicId = await ensureUnclassifiedTopic(supabase, subjectId);
  if (topics.length === 0) {
    warnings.push(
      'This subject has no topics, so every question is parked as Unclassified. ' +
        'Add a topic tree and re-run the mirror to classify them.',
    );
  }

  const assignments: Map<string, TopicAssignment> = await assignTopics(
    questions,
    topics,
    options.llm,
    fallbackTopicId,
  );

  // --- rows -----------------------------------------------------------------
  // A stub created for an unmatched mark-scheme id has no real question text,
  // so it must never reach the bank.
  const mirrorable = questions.filter(
    (q) => idByRef.has(q.ref) && !q.errorCodes.includes('E012_MS_ID_UNMATCHED'),
  );

  const rows = mirrorable.map((q) => {
    const assignment = assignments.get(q.ref);
    const text = q.questionText || (q.figures.length > 0 ? '[See figure]' : '');
    const perQuestionOk = q.confidence >= 0.8 && q.errorCodes.length === 0;

    return {
      source_paper_question_id: idByRef.get(q.ref)!,
      subject_id: subjectId,
      exam_board_id: paper.exam_board_id ?? options.examBoardId ?? null,
      topic_id: assignment?.topicId ?? fallbackTopicId,
      paper_id: paperId,
      question_number: q.ref,
      part_label: q.partLabel,
      question_type: safeType(q),
      // Both columns are written on purpose: browseQuestionBank searches
      // stem_markdown while other call sites read stem_md, and a divergence
      // between them is the top cause of "the question is not in the builder".
      stem_md: text,
      stem_markdown: text,
      context_text: q.contextText,
      is_context_only: q.isContextOnly,
      needs_answer: q.needsAnswer,
      marks: q.marks,
      difficulty: q.marks >= 6 ? 'hard' : q.marks >= 3 ? 'medium' : 'easy',
      options: q.options ? JSON.parse(JSON.stringify(q.options)) : null,
      correct_answer: q.correctAnswer ?? '',
      mark_scheme: q.markScheme,
      // The pre-existing manual bridge wrote only `explanation`; write both so
      // every renderer finds the answer where it expects it.
      explanation: q.markScheme,
      image_url: (q as ExtractedQuestion & { imageUrl?: string }).imageUrl ?? null,
      display_order: q.displayOrder,
      level: paper.level ?? options.level ?? null,
      status: options.publish && perQuestionOk ? 'published' : 'draft',
      visibility: options.publish && perQuestionOk ? 'published' : 'draft',
      review_status: perQuestionOk ? 'approved' : 'needs_review',
      topic_confidence: assignment?.confidence ?? 0,
      topic_assigned_by: assignment?.assignedBy ?? 'fallback',
      ingestion_job_id: options.jobId ?? null,
      ingested_at: new Date().toISOString(),
    };
  });

  if (rows.length === 0) {
    return {
      mirrored: 0,
      skipped: questions.length,
      archived: 0,
      topicsAssigned: 0,
      topicsFallback: 0,
      warnings,
    };
  }

  // As with paper_questions, the unique index on source_paper_question_id is
  // partial, so onConflict cannot target it. Look up what already exists and
  // split the write instead — this is what keeps question ids stable across
  // re-runs, and therefore keeps live teacher tests intact.
  const sourceIds = rows.map((r) => r.source_paper_question_id);
  const { data: existingBank, error: existingBankError } = await supabase
    .from('questions')
    .select('id, source_paper_question_id')
    .in('source_paper_question_id', sourceIds);
  if (existingBankError) {
    throw new Error(`Reading existing bank questions failed: ${existingBankError.message}`);
  }

  const bankIdBySource = new Map<string, string>(
    (existingBank ?? []).map((r: { id: string; source_paper_question_id: string }) => [
      r.source_paper_question_id,
      r.id,
    ]),
  );

  const upserted: { id: string; source_paper_question_id: string }[] = [];

  const bankInserts = rows.filter((r) => !bankIdBySource.has(r.source_paper_question_id));
  if (bankInserts.length > 0) {
    const { data, error } = await supabase
      .from('questions')
      .insert(bankInserts)
      .select('id, source_paper_question_id');
    if (error) throw new Error(`Mirroring into the question bank failed: ${error.message}`);
    upserted.push(...((data ?? []) as { id: string; source_paper_question_id: string }[]));
  }

  for (const row of rows.filter((r) => bankIdBySource.has(r.source_paper_question_id))) {
    const id = bankIdBySource.get(row.source_paper_question_id)!;
    const { error } = await supabase.from('questions').update(row).eq('id', id);
    if (error) throw new Error(`Updating bank question failed: ${error.message}`);
    upserted.push({ id, source_paper_question_id: row.source_paper_question_id });
  }

  // --- parent links, remapped into question-bank ids ------------------------
  const questionIdBySourceId = new Map<string, string>(
    (upserted ?? []).map((r: { id: string; source_paper_question_id: string }) => [
      r.source_paper_question_id,
      r.id,
    ]),
  );

  for (const q of mirrorable) {
    if (!q.parentRef) continue;
    const childSource = idByRef.get(q.ref);
    const parentSource = idByRef.get(q.parentRef);
    if (!childSource || !parentSource) continue;

    const childId = questionIdBySourceId.get(childSource);
    const parentId = questionIdBySourceId.get(parentSource);
    if (!childId || !parentId) continue;

    const { error } = await supabase
      .from('questions')
      .update({ parent_question_id: parentId })
      .eq('id', childId);
    if (error) warnings.push(`Linking a parent in the question bank failed: ${error.message}`);
  }

  // --- MCQ choices, so browseQuestionBank's join returns something ----------
  for (const q of mirrorable) {
    if (!q.options || q.options.length === 0) continue;
    const sourceId = idByRef.get(q.ref);
    const questionId = sourceId ? questionIdBySourceId.get(sourceId) : null;
    if (!questionId) continue;

    await supabase.from('question_choices').delete().eq('question_id', questionId);
    const { error } = await supabase.from('question_choices').insert(
      q.options.map((option, index) => ({
        question_id: questionId,
        choice_text: option.text,
        is_correct: option.isCorrect,
        choice_order: index,
      })),
    );
    if (error) warnings.push(`Saving choices for ${q.ref} failed: ${error.message}`);
  }

  // --- archive bank rows whose source question was archived ----------------
  const { data: archivedSources } = await supabase
    .from('paper_questions')
    .select('id')
    .eq('paper_id', paperId)
    .not('archived_at', 'is', null);

  let archived = 0;
  const archivedIds = (archivedSources ?? []).map((r: { id: string }) => r.id);
  if (archivedIds.length > 0) {
    const { data, error } = await supabase
      .from('questions')
      .update({ status: 'archived', visibility: 'archived' })
      .in('source_paper_question_id', archivedIds)
      .select('id');
    if (error) warnings.push(`Archiving stale bank questions failed: ${error.message}`);
    archived = data?.length ?? 0;
  }

  const topicsAssigned = [...assignments.values()].filter((a) => a.assignedBy === 'llm').length;
  const topicsFallback = [...assignments.values()].filter((a) => a.assignedBy === 'fallback').length;

  return {
    mirrored: upserted.length,
    skipped: questions.length - mirrorable.length,
    archived,
    topicsAssigned,
    topicsFallback,
    warnings,
  };
}
