/**
 * Stage 2 — turn the teacher's words into a spec the solver can run.
 *
 * This is the trust boundary. Everything upstream is free text produced by a
 * language model; everything downstream is identifiers that came from the
 * database. Nothing crosses it except by lookup.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { AmbiguousResolutionError, UnresolvedFieldError } from './errors';
import { resolveMany, resolveOne, type MatchTarget } from './matching';
import { allowPastPaperContent, type GenerationTarget } from './policy';
import { randomSeed } from './rng';
import {
  DEFAULT_DURATION_MINUTES,
  DEFAULT_MARKS_PER_MINUTE,
  DEFAULT_MAX_TREES_PER_SOURCE_PAPER,
  DIFFICULTY_MIX,
  TYPE_GROUPS,
  type QuestionType,
  type RawIntent,
  type TestSpec,
  type TypeGroup,
} from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = SupabaseClient<any, any, any>;

export interface ResolveContext {
  userId: string;
  classId?: string;
  seed?: number;
  target?: GenerationTarget;
}

interface SubjectRow {
  id: string;
  name: string | null;
  display_name: string | null;
  code: string | null;
  slug: string | null;
  level: string | null;
  exam_board_id: string | null;
}

interface BoardRow {
  id: string;
  code: string | null;
  name: string | null;
  short_name: string | null;
  full_name: string | null;
}

/**
 * Teachers say "structured" and "extended"; the column stores concrete types.
 * An unrecognised word is ignored rather than treated as a filter that matches
 * nothing, which would silently empty the pool.
 */
function resolveQuestionTypes(words: string[]): QuestionType[] {
  const out = new Set<QuestionType>();

  for (const word of words) {
    const key = word.toLowerCase().replace(/[^a-z]/g, '');

    const group = (
      {
        mcq: 'mcq',
        multiplechoice: 'mcq',
        truefalse: 'mcq',
        structured: 'structured',
        shortanswer: 'structured',
        calculation: 'structured',
        fillintheblank: 'structured',
        extended: 'extended',
        essay: 'extended',
        longanswer: 'extended',
      } as Record<string, TypeGroup>
    )[key];

    if (group) {
      for (const t of TYPE_GROUPS[group]) out.add(t);
    }
  }

  return [...out].sort();
}

/**
 * Marks per minute for this subject, measured from papers already ingested.
 *
 * Components differ enough that a single constant is wrong for most of them, so
 * fall back to 1.0 only when there is no sample to learn from.
 */
async function getMarksPerMinute(
  supabase: Db,
  subjectId: string,
  level: string | null,
): Promise<number> {
  const { data, error } = await supabase
    .from('subject_timing_calibration')
    .select('marks_per_minute, level, sample_papers')
    .eq('subject_id', subjectId);

  if (error || !data || data.length === 0) return DEFAULT_MARKS_PER_MINUTE;

  const scoped = level
    ? data.filter((r: any) => !r.level || r.level === level)
    : data;
  const rows = scoped.length > 0 ? scoped : data;

  // Weight by sample size so a well-evidenced component dominates a thin one.
  const totalSamples = rows.reduce((s: number, r: any) => s + (r.sample_papers ?? 1), 0);
  if (totalSamples === 0) return DEFAULT_MARKS_PER_MINUTE;

  const weighted = rows.reduce(
    (s: number, r: any) => s + Number(r.marks_per_minute ?? 0) * (r.sample_papers ?? 1),
    0,
  );
  const rate = weighted / totalSamples;

  // Guard against a malformed paper poisoning the calibration.
  return rate > 0.2 && rate < 4 ? rate : DEFAULT_MARKS_PER_MINUTE;
}

/** Map a topic id to its root ancestor, for quota accounting. */
export async function fetchTopicRoots(
  supabase: Db,
  subjectId: string,
): Promise<{ roots: Map<string, string>; topics: MatchTarget[] }> {
  const { data } = await supabase
    .from('topics')
    .select('id, name, slug, code, parent_topic_id')
    .eq('subject_id', subjectId);

  const rows = (data ?? []) as {
    id: string;
    name: string | null;
    slug: string | null;
    code: string | null;
    parent_topic_id: string | null;
  }[];

  const parentOf = new Map(rows.map((r) => [r.id, r.parent_topic_id]));
  const roots = new Map<string, string>();

  for (const row of rows) {
    let current = row.id;
    const guard = new Set<string>([current]);
    // Walk up to the top-level topic; the guard stops a cyclic row hanging us.
    while (true) {
      const parent = parentOf.get(current);
      if (!parent || guard.has(parent)) break;
      guard.add(parent);
      current = parent;
    }
    roots.set(row.id, current);
  }

  const topics: MatchTarget[] = rows.map((r) => ({
    id: r.id,
    code: r.code,
    slug: r.slug,
    names: [r.name],
  }));

  return { roots, topics };
}

export async function resolveSpec(
  supabase: Db,
  intent: RawIntent,
  ctx: ResolveContext,
): Promise<TestSpec> {
  // Class context supplies what the teacher did not need to say out loud.
  let classSubjectId: string | null = null;
  let classBoardId: string | null = null;

  if (ctx.classId) {
    const { data } = await supabase
      .from('classes')
      .select('subject_id, exam_board_id')
      .eq('id', ctx.classId)
      .single();
    classSubjectId = data?.subject_id ?? null;
    classBoardId = data?.exam_board_id ?? null;
  }

  // ---- subject ----------------------------------------------------------
  const { data: subjectRows } = await supabase
    .from('subjects')
    .select('id, name, display_name, code, slug, level, exam_board_id')
    .eq('status', 'published');

  const subjects = (subjectRows ?? []) as SubjectRow[];
  const subjectTargets: MatchTarget[] = subjects.map((s) => ({
    id: s.id,
    code: s.code,
    slug: s.slug,
    names: [s.display_name, s.name, s.level ? `${s.level} ${s.name}` : null],
  }));

  let subjectId: string | null = null;
  const subjectMatch = resolveOne(intent.subject, subjectTargets);

  if (subjectMatch.kind === 'resolved') {
    subjectId = subjectMatch.target.id;
  } else if (subjectMatch.kind === 'ambiguous') {
    // The class narrows a genuine tie without asking the teacher again.
    const inClass = subjectMatch.candidates.find((c) => c.target.id === classSubjectId);
    if (inClass) {
      subjectId = inClass.target.id;
    } else {
      throw new AmbiguousResolutionError(
        'subject',
        subjectMatch.candidates.map((c) => ({
          id: c.target.id,
          label: labelSubject(subjects.find((s) => s.id === c.target.id)),
        })),
      );
    }
  } else {
    subjectId = classSubjectId;
  }

  if (!subjectId) {
    throw new UnresolvedFieldError('subject', intent.subject);
  }

  const subject = subjects.find((s) => s.id === subjectId) ?? null;

  // ---- exam board -------------------------------------------------------
  const { data: boardRows } = await supabase
    .from('exam_boards')
    .select('id, code, name, short_name, full_name')
    .eq('is_active', true);

  const boards = (boardRows ?? []) as BoardRow[];
  const boardMatch = resolveOne(
    intent.examBoard,
    boards.map((b) => ({
      id: b.id,
      code: b.code,
      names: [b.short_name, b.name, b.full_name],
    })),
  );

  let examBoardId: string | null = null;
  if (boardMatch.kind === 'resolved') {
    examBoardId = boardMatch.target.id;
  } else if (boardMatch.kind === 'ambiguous') {
    throw new AmbiguousResolutionError(
      'examBoard',
      boardMatch.candidates.map((c) => ({
        id: c.target.id,
        label: boards.find((b) => b.id === c.target.id)?.name ?? c.target.id,
      })),
    );
  } else {
    examBoardId = classBoardId ?? subject?.exam_board_id ?? (await preferredBoard(supabase, ctx.userId));
  }

  const boardCode = boards.find((b) => b.id === examBoardId)?.code ?? null;

  // ---- level ------------------------------------------------------------
  const level = intent.level?.trim() || subject?.level || null;

  // ---- topics -----------------------------------------------------------
  const { roots, topics } = await fetchTopicRoots(supabase, subjectId);
  const { matched, unmatched } = resolveMany(intent.topics ?? [], topics);
  // Quotas are accounted at root level, so map the requested topics up.
  const topicIds = [...new Set(matched.map((t) => roots.get(t.id) ?? t.id))];

  // ---- duration and marks ----------------------------------------------
  const durationMinutes = intent.durationMinutes ?? DEFAULT_DURATION_MINUTES;
  const rate = await getMarksPerMinute(supabase, subjectId, level);
  const targetMarks = intent.totalMarks ?? Math.max(1, Math.round(durationMinutes * rate));
  const marksTolerance = Math.max(2, Math.ceil(targetMarks * 0.1));

  // ---- everything else --------------------------------------------------
  const target = ctx.target ?? 'pdf_export';

  return {
    subjectId,
    subjectName: subject?.display_name ?? subject?.name ?? 'Test',
    examBoardId,
    level,
    durationMinutes,
    targetMarks,
    marksTolerance,
    topicIds,
    difficultyMix: DIFFICULTY_MIX[intent.difficulty ?? 'mixed'],
    questionTypes: resolveQuestionTypes(intent.questionTypes ?? []),
    allowPastPaperContent: allowPastPaperContent(boardCode, target),
    // One long question should not swallow a third of a short paper.
    maxMarksPerTree: Math.max(8, Math.ceil(targetMarks * 0.35)),
    maxTreesPerSourcePaper: DEFAULT_MAX_TREES_PER_SOURCE_PAPER,
    calculatorAllowed: intent.calculatorAllowed ?? false,
    title: intent.title?.trim() || defaultTitle(subject, durationMinutes),
    seed: ctx.seed ?? randomSeed(),
    unresolvedTopics: unmatched,
    notes: intent.notes,
  };
}

function labelSubject(subject: SubjectRow | undefined): string {
  if (!subject) return 'Unknown subject';
  const name = subject.display_name ?? subject.name ?? 'Subject';
  const parts = [subject.level, name, subject.code ? `(${subject.code})` : null];
  return parts.filter(Boolean).join(' ');
}

function defaultTitle(subject: SubjectRow | null, durationMinutes: number): string {
  const name = subject?.display_name ?? subject?.name ?? 'Practice';
  return `${name} — ${durationMinutes} Minute Test`;
}

async function preferredBoard(supabase: Db, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('users')
    .select('preferred_exam_board_id')
    .eq('id', userId)
    .single();
  return data?.preferred_exam_board_id ?? null;
}
