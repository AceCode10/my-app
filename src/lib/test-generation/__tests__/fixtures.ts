/**
 * Synthetic pools for solver tests.
 *
 * Deliberately shaped like the real bank: multi-part trees where marks live on
 * the children, a topic that is far thinner than the rest, and a mix of
 * past-paper and original provenance.
 */

import type { Difficulty, QuestionRow, QuestionType, TestSpec } from '../types';
import { DIFFICULTY_MIX } from '../types';

let counter = 0;

/** Ids are padded so lexicographic order matches creation order. */
function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${String(counter).padStart(5, '0')}`;
}

export function resetIds(): void {
  counter = 0;
}

export interface RowOverrides {
  marks?: number;
  difficulty?: Difficulty;
  questionType?: QuestionType;
  topicId?: string;
  paperId?: string | null;
}

/** A single-part question: marks sit on the root. */
export function leafRow(overrides: RowOverrides = {}): QuestionRow[] {
  return [
    {
      id: nextId('q'),
      parent_question_id: null,
      part_label: null,
      marks: overrides.marks ?? 2,
      difficulty: overrides.difficulty ?? 'medium',
      question_type: overrides.questionType ?? 'short_answer',
      topic_id: overrides.topicId ?? 'topic-a',
      display_order: 0,
      image_url: null,
      paper_id: overrides.paperId ?? null,
    },
  ];
}

/**
 * A multi-part question. The root carries a denormalised total in `marks` —
 * exactly the trap the tree-marks rule exists to avoid — and each child carries
 * its real allocation.
 */
export function multiPartRow(
  childMarks: number[],
  overrides: RowOverrides = {},
): QuestionRow[] {
  const rootId = nextId('q');
  const total = childMarks.reduce((s, m) => s + m, 0);

  const root: QuestionRow = {
    id: rootId,
    parent_question_id: null,
    part_label: null,
    marks: total, // denormalised total, must not be added to the children
    difficulty: overrides.difficulty ?? 'medium',
    question_type: overrides.questionType ?? 'short_answer',
    topic_id: overrides.topicId ?? 'topic-a',
    display_order: 0,
    image_url: null,
    paper_id: overrides.paperId ?? null,
  };

  const children = childMarks.map((marks, i) => ({
    id: nextId('q'),
    parent_question_id: rootId,
    part_label: `(${String.fromCharCode(97 + i)})`,
    marks,
    difficulty: overrides.difficulty ?? 'medium',
    question_type: overrides.questionType ?? 'short_answer',
    topic_id: overrides.topicId ?? 'topic-a',
    display_order: i,
    image_url: null,
    paper_id: overrides.paperId ?? null,
  })) satisfies QuestionRow[];

  return [root, ...children];
}

/**
 * A pool with four topics, three difficulties and both provenances.
 * topic-d is deliberately thin, to exercise the shortfall path.
 */
export function standardPool(): QuestionRow[] {
  resetIds();
  const rows: QuestionRow[] = [];

  for (const topicId of ['topic-a', 'topic-b', 'topic-c']) {
    for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
      for (let i = 0; i < 4; i += 1) {
        rows.push(...leafRow({ topicId, difficulty, marks: 1, questionType: 'mcq' }));
        rows.push(...leafRow({ topicId, difficulty, marks: 3 }));
        rows.push(...multiPartRow([2, 3], { topicId, difficulty }));
      }
    }
  }

  // Thin topic: one question only.
  rows.push(...leafRow({ topicId: 'topic-d', difficulty: 'medium', marks: 2 }));

  return rows;
}

/** Every question sourced from a past paper — used for the copyright gate. */
export function pastPaperPool(): QuestionRow[] {
  resetIds();
  const rows: QuestionRow[] = [];
  for (let i = 0; i < 30; i += 1) {
    rows.push(
      ...leafRow({
        topicId: `topic-${'abc'[i % 3]}`,
        difficulty: (['easy', 'medium', 'hard'] as Difficulty[])[i % 3],
        marks: 3,
        paperId: `paper-${i % 4}`,
      }),
    );
  }
  return rows;
}

export function makeSpec(overrides: Partial<TestSpec> = {}): TestSpec {
  const targetMarks = overrides.targetMarks ?? 40;
  return {
    subjectId: 'subject-1',
    subjectName: 'Biology',
    examBoardId: 'board-1',
    level: 'igcse',
    durationMinutes: 40,
    targetMarks,
    marksTolerance: Math.max(2, Math.ceil(targetMarks * 0.1)),
    topicIds: [],
    difficultyMix: DIFFICULTY_MIX.mixed,
    questionTypes: [],
    allowPastPaperContent: false,
    maxMarksPerTree: Math.max(8, Math.ceil(targetMarks * 0.35)),
    maxTreesPerSourcePaper: 3,
    calculatorAllowed: false,
    title: 'Biology Test',
    seed: 12345,
    unresolvedTopics: [],
    notes: null,
    ...overrides,
  };
}
