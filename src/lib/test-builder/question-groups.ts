/**
 * Grouping of test questions into top-level "questions" with their parts.
 *
 * A multi-part question is a tree linked by parent_question_id. question_number
 * is NOT an identity: the bank holds questions ingested from many past papers,
 * so dozens of unrelated questions share question_number "1". Grouping by it
 * merged every paper's Q1 into one giant question.
 */

export interface GroupableQuestion {
  id: string;
  parent_question_id?: string | null;
  question_number?: string | number | null;
  paper_id?: string | null;
}

/**
 * Key identifying the top-level question this item belongs to: the id of its
 * root ancestor within `byId`. Legacy parts that were never linked to a parent
 * fall back to paper + question number, but only when the paper is known.
 */
export function questionGroupKey<Q extends GroupableQuestion>(
  question: Q,
  byId: Map<string, Q>,
): string {
  let root = question;
  const seen = new Set<string>();
  while (root.parent_question_id && byId.has(root.parent_question_id) && !seen.has(root.id)) {
    seen.add(root.id);
    root = byId.get(root.parent_question_id)!;
  }
  if (root.paper_id && root.question_number != null && root.question_number !== '') {
    return `paper:${root.paper_id}:${baseQuestionNumber(root.question_number)}`;
  }
  return `root:${root.id}`;
}

/** "7(b)(ii)" -> "7" */
export function baseQuestionNumber(questionNumber: string | number): string {
  return String(questionNumber).match(/^\s*(\d+)/)?.[1] ?? String(questionNumber);
}

/**
 * Split items into top-level question groups, preserving the order in which
 * each group first appears. `getQuestion` maps an item to its question.
 */
export function groupByTopLevelQuestion<T, Q extends GroupableQuestion>(
  items: T[],
  getQuestion: (item: T) => Q | null | undefined,
): T[][] {
  const byId = new Map<string, Q>();
  items.forEach(item => {
    const q = getQuestion(item);
    if (q) byId.set(q.id, q);
  });

  const groups = new Map<string, T[]>();
  items.forEach(item => {
    const q = getQuestion(item);
    if (!q) return;
    const key = questionGroupKey(q, byId);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  });
  return Array.from(groups.values());
}
