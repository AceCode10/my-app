/**
 * Turn flat question rows into the trees the solver selects over.
 *
 * `questions` stores a three-level hierarchy via `parent_question_id`:
 * main question -> part (a) -> sub-part (i). The parent holds the context stem
 * ("Fig 3.1 shows a plant cell.") and the children hold the marks. Selecting a
 * child on its own emits a question with no stem, so the tree is the atom.
 */

import type {
  Difficulty,
  QuestionNode,
  QuestionRow,
  QuestionTree,
  QuestionType,
} from './types';
import { DIFFICULTIES } from './types';

const UNTOPICED = '__no_topic__';

function normaliseDifficulty(value: Difficulty | null): Difficulty {
  return value && (DIFFICULTIES as readonly string[]).includes(value) ? value : 'medium';
}

function normaliseType(value: QuestionType | null): QuestionType {
  return value ?? 'short_answer';
}

function toNode(row: QuestionRow): QuestionNode {
  return {
    id: row.id,
    parentId: row.parent_question_id,
    partLabel: row.part_label,
    marks: row.marks ?? 0,
    difficulty: normaliseDifficulty(row.difficulty),
    questionType: normaliseType(row.question_type),
    topicId: row.topic_id,
    displayOrder: row.display_order ?? 0,
    hasImage: Boolean(row.image_url),
    children: [],
  };
}

/**
 * Marks for a whole tree, counting each mark exactly once.
 *
 * A parent that has children is a context stem. Its own `marks` column is
 * frequently a denormalised total of those children, so adding both
 * double-counts every multi-part question — which shows up as generated tests
 * coming out at roughly half their intended length. Trust the children when
 * they carry marks; fall back to the parent when they do not.
 */
export function computeTreeMarks(node: QuestionNode): number {
  if (node.children.length === 0) return node.marks;
  const childSum = node.children.reduce((sum, c) => sum + computeTreeMarks(c), 0);
  return childSum > 0 ? childSum : node.marks;
}

/** Every node in the tree, parent before children. */
export function flattenTree(node: QuestionNode): QuestionNode[] {
  return [node, ...node.children.flatMap(flattenTree)];
}

/**
 * Mark-weighted dominant difficulty. A tree whose marks sit mostly in a hard
 * final part is a hard question, even if it opens with two easy recall parts.
 */
function dominantDifficulty(node: QuestionNode): Difficulty {
  const weights = new Map<Difficulty, number>();
  for (const n of flattenTree(node)) {
    // Only leaves carry real marks; interior nodes would double-count.
    const marks = n.children.length === 0 ? n.marks : 0;
    if (marks <= 0) continue;
    weights.set(n.difficulty, (weights.get(n.difficulty) ?? 0) + marks);
  }
  if (weights.size === 0) return node.difficulty;

  let best: Difficulty = 'medium';
  let bestWeight = -1;
  // Iterate in fixed difficulty order so ties resolve deterministically.
  for (const d of DIFFICULTIES) {
    const w = weights.get(d) ?? 0;
    if (w > bestWeight) {
      best = d;
      bestWeight = w;
    }
  }
  return best;
}

function distinctTypes(node: QuestionNode): QuestionType[] {
  return [...new Set(flattenTree(node).map((n) => n.questionType))].sort();
}

/**
 * The topic a tree counts against for spread purposes. Topics are themselves a
 * hierarchy, so a question tagged to "Osmosis" should fill the quota for
 * "Movement of Substances". `topicRoots` maps child topic id -> root topic id;
 * without it the question's own topic is used.
 */
function resolveQuotaTopic(
  node: QuestionNode,
  topicRoots?: Map<string, string>,
): string {
  const own = node.topicId ?? flattenTree(node).find((n) => n.topicId)?.topicId ?? null;
  if (!own) return UNTOPICED;
  return topicRoots?.get(own) ?? own;
}

export interface BuildTreesOptions {
  /** child topic id -> root topic id, from `topics.parent_topic_id`. */
  topicRoots?: Map<string, string>;
}

/**
 * Build trees from an unordered row set.
 *
 * Rows whose parent is absent from the set are promoted to roots rather than
 * dropped — a truncated pool fetch should cost variety, not silently lose
 * questions.
 */
export function buildTrees(
  rows: QuestionRow[],
  options: BuildTreesOptions = {},
): QuestionTree[] {
  const nodes = new Map<string, QuestionNode>();
  for (const row of rows) nodes.set(row.id, toNode(row));

  const roots: QuestionNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Stable ordering everywhere: display order, then id. Postgres makes no row
  // order guarantee, and the solver's determinism depends on this.
  const sortNodes = (list: QuestionNode[]) => {
    list.sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id));
    for (const n of list) sortNodes(n.children);
  };
  sortNodes(roots);

  const paperIds = new Map(rows.map((r) => [r.id, r.paper_id]));

  return roots
    .map((root) => {
      const flat = flattenTree(root);
      // Provenance lives on the root; a part inherits its main question's source.
      const paperId = paperIds.get(root.id) ?? null;
      return {
        root,
        marks: computeTreeMarks(root),
        nodeCount: flat.length,
        quotaTopicId: resolveQuotaTopic(root, options.topicRoots),
        difficulty: dominantDifficulty(root),
        types: distinctTypes(root),
        paperId,
        fromPastPaper: paperId !== null,
      } satisfies QuestionTree;
    })
    .sort((a, b) => a.root.id.localeCompare(b.root.id));
}
