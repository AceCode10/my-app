/**
 * Test assembly solver.
 *
 * Pure: no Supabase, no network, no Date.now(), no Math.random(). Given the
 * same pool, spec and seed it always returns the same test — which is what
 * makes it unit-testable, and what lets a teacher regenerate a paper they liked.
 *
 * The LLM never runs here. Selection is a constraint problem with a checkable
 * answer (hit a mark budget, spread topics, respect a difficulty curve, keep
 * trees intact), so it belongs in code that can be asserted against.
 */

import {
  deficitRatio,
  fillQuota,
  largestRemainder,
  mulberry32,
  type Quota,
} from './rng';
import {
  DIFFICULTIES,
  type Difficulty,
  type ExclusionReason,
  type QuestionTree,
  type QuotaCoverage,
  type SolvedSection,
  type SolverDiagnostics,
  type SolverResult,
  type TestSpec,
  TYPE_GROUPS,
} from './types';

/** Topic spread matters most: an off-syllabus-balance test is the loudest failure. */
const W_TOPIC = 3.0;
const W_DIFFICULTY = 2.0;
const W_TYPE = 1.0;
/** Small enough to break ties, not large enough to override a real deficit. */
const W_JITTER = 0.35;

const MAX_REPAIR_ITERATIONS = 200;
/** Guards against a pathological pool spinning the greedy loop. */
const MAX_GREEDY_ITERATIONS = 5000;

/** A section split is only worth it when both halves are substantial. */
const SECTION_SPLIT_MIN_SHARE = 0.15;

// ---------------------------------------------------------------------------
// Exclusions
// ---------------------------------------------------------------------------

interface Exclusion {
  reason: ExclusionReason;
  treeCount: number;
  marks: number;
}

function excludeTree(tree: QuestionTree, spec: TestSpec): ExclusionReason | null {
  if (tree.marks <= 0) return 'zero_marks';
  if (tree.fromPastPaper && !spec.allowPastPaperContent) return 'past_paper_excluded';
  if (tree.marks > spec.maxMarksPerTree) return 'oversized';
  if (spec.topicIds.length > 0 && !spec.topicIds.includes(tree.quotaTopicId)) {
    return 'topic_out_of_scope';
  }
  if (
    spec.questionTypes.length > 0 &&
    !tree.types.some((t) => spec.questionTypes.includes(t))
  ) {
    return 'type_excluded';
  }
  return null;
}

function partitionPool(pool: QuestionTree[], spec: TestSpec) {
  const candidates: QuestionTree[] = [];
  const byReason = new Map<ExclusionReason, Exclusion>();

  for (const tree of pool) {
    const reason = excludeTree(tree, spec);
    if (!reason) {
      candidates.push(tree);
      continue;
    }
    const entry = byReason.get(reason) ?? { reason, treeCount: 0, marks: 0 };
    entry.treeCount += 1;
    entry.marks += Math.max(0, tree.marks);
    byReason.set(reason, entry);
  }

  return { candidates, exclusions: [...byReason.values()] };
}

// ---------------------------------------------------------------------------
// Quotas
// ---------------------------------------------------------------------------

function buildTopicQuotas(spec: TestSpec, candidates: QuestionTree[]): Quota[] {
  const availability = new Map<string, number>();
  for (const tree of candidates) {
    availability.set(
      tree.quotaTopicId,
      (availability.get(tree.quotaTopicId) ?? 0) + tree.marks,
    );
  }

  const topics =
    spec.topicIds.length > 0
      ? spec.topicIds
      : [...availability.keys()].sort();

  if (topics.length === 0) return [];

  // Weighting by available depth stops a thin topic being handed a quota the
  // bank cannot fill, which would otherwise strand marks the solver never
  // allocates and produce a short test.
  return largestRemainder(
    topics.map((key) => ({ key, share: availability.get(key) ?? 0 })),
    spec.targetMarks,
  );
}

function buildDifficultyQuotas(spec: TestSpec): Quota[] {
  return largestRemainder(
    DIFFICULTIES.map((d) => ({ key: d, share: spec.difficultyMix[d] ?? 0 })),
    spec.targetMarks,
  );
}

/** Rewards a tree whose types the teacher explicitly asked for. */
function typeBonus(spec: TestSpec, tree: QuestionTree): number {
  if (spec.questionTypes.length === 0) return 0;
  const hits = tree.types.filter((t) => spec.questionTypes.includes(t)).length;
  return hits / Math.max(tree.types.length, 1);
}

// ---------------------------------------------------------------------------
// Solve
// ---------------------------------------------------------------------------

export function solve(pool: QuestionTree[], spec: TestSpec): SolverResult {
  const rng = mulberry32(spec.seed);
  const { candidates, exclusions } = partitionPool(pool, spec);

  const topicQuotas = buildTopicQuotas(spec, candidates);
  const diffQuotas = buildDifficultyQuotas(spec);
  const perPaper = new Map<string, number>();

  const picked: QuestionTree[] = [];
  // Sorted by id so the scan order — and therefore tie-breaking — is stable.
  const remaining = [...candidates].sort((a, b) => a.root.id.localeCompare(b.root.id));
  let marks = 0;
  let iterations = 0;

  const canTake = (tree: QuestionTree, budgetLeft: number): boolean => {
    if (tree.marks > budgetLeft) return false;
    if (tree.paperId && (perPaper.get(tree.paperId) ?? 0) >= spec.maxTreesPerSourcePaper) {
      return false;
    }
    return true;
  };

  const score = (tree: QuestionTree): number =>
    W_TOPIC * deficitRatio(topicQuotas, tree.quotaTopicId) +
    W_DIFFICULTY * deficitRatio(diffQuotas, tree.difficulty) +
    W_TYPE * typeBonus(spec, tree) +
    W_JITTER * rng();

  // ---- greedy fill -------------------------------------------------------
  while (
    marks < spec.targetMarks - spec.marksTolerance &&
    remaining.length > 0 &&
    iterations < MAX_GREEDY_ITERATIONS
  ) {
    iterations += 1;
    const budgetLeft = spec.targetMarks + spec.marksTolerance - marks;

    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i += 1) {
      const tree = remaining[i];
      if (!canTake(tree, budgetLeft)) continue;
      const s = score(tree);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break; // nothing left fits the remaining budget

    const [tree] = remaining.splice(bestIdx, 1);
    picked.push(tree);
    marks += tree.marks;
    fillQuota(topicQuotas, tree.quotaTopicId, tree.marks);
    fillQuota(diffQuotas, tree.difficulty, tree.marks);
    if (tree.paperId) perPaper.set(tree.paperId, (perPaper.get(tree.paperId) ?? 0) + 1);
  }

  // ---- repair ------------------------------------------------------------
  // The greedy pass stops as soon as it is within tolerance or nothing fits.
  // When it stopped short, try swapping a picked tree for a larger unpicked one
  // rather than accepting the gap.
  let repairs = 0;
  while (
    spec.targetMarks - marks > spec.marksTolerance &&
    repairs < MAX_REPAIR_ITERATIONS
  ) {
    repairs += 1;
    const gap = spec.targetMarks - marks;
    const swap = findSwap(picked, remaining, gap, spec, perPaper);
    if (!swap) break;

    const [out] = picked.splice(swap.pickedIdx, 1);
    const [into] = remaining.splice(swap.remainingIdx, 1);
    picked.push(into);
    remaining.push(out);

    fillQuota(topicQuotas, out.quotaTopicId, -out.marks);
    fillQuota(diffQuotas, out.difficulty, -out.marks);
    fillQuota(topicQuotas, into.quotaTopicId, into.marks);
    fillQuota(diffQuotas, into.difficulty, into.marks);

    if (out.paperId) {
      perPaper.set(out.paperId, Math.max(0, (perPaper.get(out.paperId) ?? 1) - 1));
    }
    if (into.paperId) {
      perPaper.set(into.paperId, (perPaper.get(into.paperId) ?? 0) + 1);
    }

    marks += into.marks - out.marks;
  }

  const sections = buildSections(picked, spec);
  const diagnostics = buildDiagnostics({
    spec,
    pool,
    candidates,
    picked,
    marks,
    exclusions,
    topicQuotas,
    diffQuotas,
    iterations: iterations + repairs,
  });

  return {
    status: resolveStatus(picked, marks, spec),
    trees: sections.flatMap((s) =>
      s.treeIds.map((id) => picked.find((t) => t.root.id === id)!),
    ),
    totalMarks: marks,
    sections,
    diagnostics,
  };
}

interface Swap {
  pickedIdx: number;
  remainingIdx: number;
}

/**
 * Find a picked/unpicked pair whose mark difference closes the gap.
 *
 * Prefers swaps that do not worsen topic balance, and never accepts one that
 * overshoots the tolerance in the other direction.
 */
function findSwap(
  picked: QuestionTree[],
  remaining: QuestionTree[],
  gap: number,
  spec: TestSpec,
  perPaper: Map<string, number>,
): Swap | null {
  let best: Swap | null = null;
  let bestError = Infinity;

  for (let p = 0; p < picked.length; p += 1) {
    const out = picked[p];
    for (let r = 0; r < remaining.length; r += 1) {
      const into = remaining[r];
      const delta = into.marks - out.marks;
      if (delta <= 0) continue; // only useful when we are short

      const error = Math.abs(gap - delta);
      if (error >= bestError) continue;
      if (into.marks > spec.maxMarksPerTree) continue;

      // Respect the per-source-paper cap, discounting the tree being removed.
      if (into.paperId) {
        const current =
          (perPaper.get(into.paperId) ?? 0) - (out.paperId === into.paperId ? 1 : 0);
        if (current >= spec.maxTreesPerSourcePaper) continue;
      }

      bestError = error;
      best = { pickedIdx: p, remainingIdx: r };
    }
  }

  // Reject a swap that would leave us further out than we started.
  if (best && bestError > Math.abs(gap)) return null;
  return best;
}

function resolveStatus(
  picked: QuestionTree[],
  marks: number,
  spec: TestSpec,
): SolverResult['status'] {
  if (picked.length === 0) return 'failed';
  if (Math.abs(spec.targetMarks - marks) <= spec.marksTolerance) return 'ok';
  return 'partial';
}

// ---------------------------------------------------------------------------
// Sections and ordering
// ---------------------------------------------------------------------------

const DIFFICULTY_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };

function isMcqTree(tree: QuestionTree): boolean {
  return tree.types.every((t) => (TYPE_GROUPS.mcq as readonly string[]).includes(t));
}

/**
 * Order within a section ramps easy -> hard, which is the convention candidates
 * are used to and reduces the chance of a student stalling on question one.
 */
function rampSort(a: QuestionTree, b: QuestionTree): number {
  return (
    DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] ||
    a.marks - b.marks ||
    a.root.id.localeCompare(b.root.id)
  );
}

export function buildSections(picked: QuestionTree[], spec: TestSpec): SolvedSection[] {
  if (picked.length === 0) return [];

  const total = picked.reduce((sum, t) => sum + t.marks, 0);
  const mcq = picked.filter(isMcqTree).sort(rampSort);
  const rest = picked.filter((t) => !isMcqTree(t)).sort(rampSort);

  const mcqMarks = mcq.reduce((sum, t) => sum + t.marks, 0);
  const restMarks = total - mcqMarks;

  const worthSplitting =
    mcq.length > 0 &&
    rest.length > 0 &&
    mcqMarks / total >= SECTION_SPLIT_MIN_SHARE &&
    restMarks / total >= SECTION_SPLIT_MIN_SHARE;

  if (!worthSplitting) {
    const all = [...picked].sort(rampSort);
    return [
      {
        name: null,
        instructions: null,
        treeIds: all.map((t) => t.root.id),
        marks: total,
      },
    ];
  }

  return [
    {
      name: 'Section A (Multiple Choice)',
      instructions: 'Answer all questions in this section.',
      treeIds: mcq.map((t) => t.root.id),
      marks: mcqMarks,
    },
    {
      name: 'Section B (Structured Questions)',
      instructions: `Answer all questions in this section. ${
        spec.calculatorAllowed ? 'A calculator may be used.' : 'Calculators are not permitted.'
      }`,
      treeIds: rest.map((t) => t.root.id),
      marks: restMarks,
    },
  ];
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

function toCoverage(quotas: Quota[]): QuotaCoverage[] {
  return quotas.map((q) => ({
    key: q.key,
    targetMarks: q.targetMarks,
    achievedMarks: q.filledMarks,
  }));
}

function buildDiagnostics(args: {
  spec: TestSpec;
  pool: QuestionTree[];
  candidates: QuestionTree[];
  picked: QuestionTree[];
  marks: number;
  exclusions: Exclusion[];
  topicQuotas: Quota[];
  diffQuotas: Quota[];
  iterations: number;
}): SolverDiagnostics {
  const { spec, pool, candidates, picked, marks, exclusions } = args;
  const shortfallReasons: string[] = [];

  if (spec.targetMarks - marks > spec.marksTolerance) {
    const excludedPastPaper = exclusions.find((e) => e.reason === 'past_paper_excluded');
    if (excludedPastPaper && excludedPastPaper.marks > 0) {
      shortfallReasons.push('past_paper_content_excluded_from_export');
    }

    const thin = args.topicQuotas
      .filter((q) => q.targetMarks - q.filledMarks > 0)
      .sort((a, b) => b.targetMarks - b.filledMarks - (a.targetMarks - a.filledMarks));
    for (const q of thin.slice(0, 5)) {
      shortfallReasons.push(
        `topic_short:${q.key}:${q.targetMarks - q.filledMarks}`,
      );
    }

    if (candidates.length === 0) shortfallReasons.push('no_candidate_questions');
  }

  if (spec.unresolvedTopics.length > 0) {
    shortfallReasons.push(`unmatched_topics:${spec.unresolvedTopics.join(',')}`);
  }

  return {
    targetMarks: spec.targetMarks,
    achievedMarks: marks,
    marksTolerance: spec.marksTolerance,
    poolSize: pool.length,
    candidateTrees: candidates.length,
    selectedTrees: picked.length,
    topicCoverage: toCoverage(args.topicQuotas),
    difficultyCoverage: toCoverage(args.diffQuotas),
    exclusions,
    shortfallReasons,
    unresolvedTopics: spec.unresolvedTopics,
    iterations: args.iterations,
  };
}
