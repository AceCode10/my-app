/**
 * AI Test Builder — shared types.
 *
 * Pipeline: prompt -> RawIntent (LLM) -> TestSpec (DB resolution) ->
 * SolverResult (pure) -> assessment row.
 *
 * See docs/ai-test-builder-spec.md
 */

import type { Difficulty, QuestionType } from '@/types/assessment';

export type { Difficulty, QuestionType };

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'] as const;

export type SolverStatus = 'ok' | 'partial' | 'failed';

/** Coarse buckets the teacher speaks in, mapped onto concrete question types. */
export type TypeGroup = 'mcq' | 'structured' | 'extended';

export const TYPE_GROUPS: Record<TypeGroup, readonly QuestionType[]> = {
  mcq: ['mcq', 'true_false'],
  structured: ['short_answer', 'calculation', 'fill_in_blank'],
  extended: ['essay'],
};

/**
 * Stage 1 output — what the model is allowed to say.
 *
 * Strings only. The model never emits an id, and never guesses a value the
 * teacher did not state: null means "not stated" and the resolver decides.
 */
export interface RawIntent {
  subject: string | null;
  examBoard: string | null;
  level: string | null;
  durationMinutes: number | null;
  totalMarks: number | null;
  topics: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed' | null;
  questionTypes: string[];
  calculatorAllowed: boolean | null;
  title: string | null;
  notes: string | null;
}

/** Stage 2 output — fully resolved, safe to hand the solver. */
export interface TestSpec {
  subjectId: string;
  subjectName: string;
  examBoardId: string | null;
  level: string | null;
  durationMinutes: number;
  targetMarks: number;
  /** Absolute marks either side of target that still counts as a hit. */
  marksTolerance: number;
  /** Empty means "spread across every root topic in the pool". */
  topicIds: string[];
  difficultyMix: Record<Difficulty, number>;
  /** Empty means "any type". */
  questionTypes: QuestionType[];
  allowPastPaperContent: boolean;
  maxMarksPerTree: number;
  maxTreesPerSourcePaper: number;
  calculatorAllowed: boolean;
  title: string;
  seed: number;
  /** Topic names the teacher asked for that matched nothing. Surfaced, not swallowed. */
  unresolvedTopics: string[];
  /** Free text the model could not map to a field. */
  notes: string | null;
}

/** A row from the questions table, narrowed to what the solver needs. */
export interface QuestionRow {
  id: string;
  parent_question_id: string | null;
  part_label: string | null;
  marks: number | null;
  difficulty: Difficulty | null;
  question_type: QuestionType | null;
  topic_id: string | null;
  display_order: number | null;
  image_url: string | null;
  paper_id: string | null;
}

export interface QuestionNode {
  id: string;
  parentId: string | null;
  partLabel: string | null;
  marks: number;
  difficulty: Difficulty;
  questionType: QuestionType;
  topicId: string | null;
  displayOrder: number;
  hasImage: boolean;
  children: QuestionNode[];
}

/**
 * The atom of selection. A main question plus every part and sub-part beneath
 * it. Never split — the parent carries the context stem the children rely on.
 */
export interface QuestionTree {
  root: QuestionNode;
  /** Summed across the tree, counting each mark exactly once. */
  marks: number;
  nodeCount: number;
  /** Root-level ancestor topic, used for spread accounting. */
  quotaTopicId: string;
  /** Mark-weighted dominant difficulty across the tree. */
  difficulty: Difficulty;
  types: QuestionType[];
  paperId: string | null;
  fromPastPaper: boolean;
}

export interface SolvedSection {
  name: string | null;
  instructions: string | null;
  treeIds: string[];
  marks: number;
}

export interface QuotaCoverage {
  key: string;
  targetMarks: number;
  achievedMarks: number;
}

export interface SolverDiagnostics {
  targetMarks: number;
  achievedMarks: number;
  marksTolerance: number;
  poolSize: number;
  candidateTrees: number;
  selectedTrees: number;
  topicCoverage: QuotaCoverage[];
  difficultyCoverage: QuotaCoverage[];
  exclusions: { reason: ExclusionReason; treeCount: number; marks: number }[];
  shortfallReasons: string[];
  unresolvedTopics: string[];
  iterations: number;
}

export type ExclusionReason =
  | 'past_paper_excluded'
  | 'zero_marks'
  | 'oversized'
  | 'topic_out_of_scope'
  | 'type_excluded';

export interface SolverResult {
  status: SolverStatus;
  trees: QuestionTree[];
  totalMarks: number;
  sections: SolvedSection[];
  diagnostics: SolverDiagnostics;
}

/** Defaults applied when the teacher did not say. */
export const DEFAULT_DURATION_MINUTES = 45;
export const DEFAULT_MARKS_PER_MINUTE = 1.0;
export const DEFAULT_MAX_TREES_PER_SOURCE_PAPER = 3;
export const POOL_LIMIT = 2000;

export const DIFFICULTY_MIX: Record<
  'easy' | 'medium' | 'hard' | 'mixed',
  Record<Difficulty, number>
> = {
  easy: { easy: 0.6, medium: 0.35, hard: 0.05 },
  medium: { easy: 0.25, medium: 0.55, hard: 0.2 },
  hard: { easy: 0.1, medium: 0.4, hard: 0.5 },
  mixed: { easy: 0.3, medium: 0.5, hard: 0.2 },
};
