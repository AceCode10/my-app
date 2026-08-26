import { describe, expect, it } from 'vitest';

import { solve } from '../solver';
import { buildTrees } from '../trees';
import { DIFFICULTY_MIX, type QuestionTree } from '../types';
import {
  makeSpec,
  pastPaperPool,
  resetIds,
  standardPool,
  leafRow,
  multiPartRow,
} from './fixtures';

function pool(): QuestionTree[] {
  return buildTrees(standardPool());
}

describe('solve — mark budget', () => {
  it('lands within tolerance across many seeds', () => {
    const trees = pool();
    const misses: number[] = [];

    for (let seed = 0; seed < 100; seed += 1) {
      const spec = makeSpec({ seed });
      const result = solve(trees, spec);
      if (Math.abs(result.totalMarks - spec.targetMarks) > spec.marksTolerance) {
        misses.push(seed);
      }
    }

    expect(misses).toEqual([]);
  });

  it('reports totalMarks equal to the sum of selected trees', () => {
    const result = solve(pool(), makeSpec());
    const summed = result.trees.reduce((s, t) => s + t.marks, 0);
    expect(result.totalMarks).toBe(summed);
  });

  it('honours an explicit mark target rather than the duration', () => {
    const spec = makeSpec({ targetMarks: 20, marksTolerance: 2 });
    const result = solve(pool(), spec);
    expect(result.totalMarks).toBeGreaterThanOrEqual(18);
    expect(result.totalMarks).toBeLessThanOrEqual(22);
  });
});

describe('solve — determinism', () => {
  it('produces identical output for the same seed', () => {
    const trees = pool();
    const a = solve(trees, makeSpec({ seed: 777 }));
    const b = solve(trees, makeSpec({ seed: 777 }));

    expect(a.trees.map((t) => t.root.id)).toEqual(b.trees.map((t) => t.root.id));
    expect(JSON.stringify(a.sections)).toBe(JSON.stringify(b.sections));
    expect(a.totalMarks).toBe(b.totalMarks);
  });

  it('is unaffected by the input ordering of the pool', () => {
    const rows = standardPool();
    const a = solve(buildTrees(rows), makeSpec({ seed: 42 }));
    const b = solve(buildTrees([...rows].reverse()), makeSpec({ seed: 42 }));
    expect(a.trees.map((t) => t.root.id)).toEqual(b.trees.map((t) => t.root.id));
  });

  it('produces a different paper for a different seed', () => {
    const trees = pool();
    const a = solve(trees, makeSpec({ seed: 1 })).trees.map((t) => t.root.id);
    const b = solve(trees, makeSpec({ seed: 2 })).trees.map((t) => t.root.id);
    expect(a).not.toEqual(b);
  });
});

describe('solve — tree integrity', () => {
  it('never emits a child as a top-level question', () => {
    const result = solve(pool(), makeSpec());
    for (const tree of result.trees) {
      expect(tree.root.parentId).toBeNull();
    }
  });

  it('emits every selected tree exactly once across sections', () => {
    const result = solve(pool(), makeSpec());
    const ids = result.sections.flatMap((s) => s.treeIds);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(result.trees.length);
  });

  it('keeps section marks consistent with the total', () => {
    const result = solve(pool(), makeSpec());
    const summed = result.sections.reduce((s, sec) => s + sec.marks, 0);
    expect(summed).toBe(result.totalMarks);
  });
});

describe('solve — copyright gate', () => {
  it('excludes past-paper content when the spec forbids it', () => {
    const trees = buildTrees(pastPaperPool());
    const result = solve(trees, makeSpec({ allowPastPaperContent: false }));

    expect(result.trees).toHaveLength(0);
    expect(result.status).toBe('failed');
    expect(result.diagnostics.exclusions.map((e) => e.reason)).toContain(
      'past_paper_excluded',
    );
  });

  it('names the copyright exclusion as a shortfall reason', () => {
    const rows = [...pastPaperPool(), ...leafRow({ marks: 3, paperId: null })];
    const result = solve(buildTrees(rows), makeSpec({ allowPastPaperContent: false }));

    expect(result.status).toBe('partial');
    expect(result.diagnostics.shortfallReasons).toContain(
      'past_paper_content_excluded_from_export',
    );
  });

  it('uses past-paper content when explicitly allowed', () => {
    const trees = buildTrees(pastPaperPool());
    const result = solve(
      trees,
      makeSpec({ allowPastPaperContent: true, maxTreesPerSourcePaper: 99 }),
    );
    expect(result.trees.length).toBeGreaterThan(0);
  });
});

describe('solve — constraints', () => {
  it('respects the per-source-paper cap', () => {
    const trees = buildTrees(pastPaperPool());
    const result = solve(
      trees,
      makeSpec({ allowPastPaperContent: true, maxTreesPerSourcePaper: 2 }),
    );

    const counts = new Map<string, number>();
    for (const t of result.trees) {
      if (!t.paperId) continue;
      counts.set(t.paperId, (counts.get(t.paperId) ?? 0) + 1);
    }
    for (const count of counts.values()) expect(count).toBeLessThanOrEqual(2);
  });

  it('rejects a tree larger than maxMarksPerTree', () => {
    resetIds();
    const rows = [...multiPartRow([10, 10, 10]), ...leafRow({ marks: 2 })];
    const result = solve(buildTrees(rows), makeSpec({ maxMarksPerTree: 8 }));

    expect(result.trees.every((t) => t.marks <= 8)).toBe(true);
    expect(result.diagnostics.exclusions.map((e) => e.reason)).toContain('oversized');
  });

  it('drops zero-mark trees', () => {
    resetIds();
    const rows = [...leafRow({ marks: 0 }), ...leafRow({ marks: 3 })];
    const result = solve(buildTrees(rows), makeSpec({ targetMarks: 3 }));

    expect(result.trees.every((t) => t.marks > 0)).toBe(true);
    expect(result.diagnostics.exclusions.map((e) => e.reason)).toContain('zero_marks');
  });

  it('restricts to requested topics', () => {
    const result = solve(pool(), makeSpec({ topicIds: ['topic-b'] }));
    expect(result.trees.every((t) => t.quotaTopicId === 'topic-b')).toBe(true);
  });

  it('restricts to requested question types', () => {
    const result = solve(pool(), makeSpec({ questionTypes: ['mcq'] }));
    expect(result.trees.every((t) => t.types.includes('mcq'))).toBe(true);
  });
});

describe('solve — shortfall honesty', () => {
  it('reports partial rather than silently returning a short test', () => {
    const result = solve(
      pool(),
      makeSpec({ topicIds: ['topic-d'], targetMarks: 40 }),
    );

    expect(result.status).toBe('partial');
    expect(result.totalMarks).toBeLessThan(40);
    expect(
      result.diagnostics.shortfallReasons.some((r) => r.startsWith('topic_short:')),
    ).toBe(true);
  });

  it('fails without throwing on an empty pool', () => {
    const result = solve([], makeSpec());
    expect(result.status).toBe('failed');
    expect(result.trees).toEqual([]);
    expect(result.diagnostics.shortfallReasons).toContain('no_candidate_questions');
  });

  it('surfaces topic names that matched nothing', () => {
    const result = solve(pool(), makeSpec({ unresolvedTopics: ['photosynthesis'] }));
    expect(result.diagnostics.shortfallReasons).toContain(
      'unmatched_topics:photosynthesis',
    );
  });
});

describe('solve — balance', () => {
  it('spreads across topics rather than draining one', () => {
    const result = solve(pool(), makeSpec({ seed: 9 }));
    const topics = new Set(result.trees.map((t) => t.quotaTopicId));
    expect(topics.size).toBeGreaterThanOrEqual(3);
  });

  it('follows the difficulty mix roughly', () => {
    const spec = makeSpec({ difficultyMix: DIFFICULTY_MIX.easy, seed: 5 });
    const result = solve(pool(), spec);

    const easyMarks = result.trees
      .filter((t) => t.difficulty === 'easy')
      .reduce((s, t) => s + t.marks, 0);

    // The easy mix targets 60%; allow slack for integer trees and a finite bank.
    expect(easyMarks / result.totalMarks).toBeGreaterThan(0.4);
  });

  it('splits sections only when both halves are substantial', () => {
    const result = solve(pool(), makeSpec({ seed: 3 }));
    if (result.sections.length === 2) {
      for (const section of result.sections) {
        expect(section.marks / result.totalMarks).toBeGreaterThanOrEqual(0.15);
      }
    } else {
      expect(result.sections).toHaveLength(1);
    }
  });

  it('ramps difficulty within a section', () => {
    const rank = { easy: 0, medium: 1, hard: 2 } as const;
    const result = solve(pool(), makeSpec({ seed: 11 }));

    for (const section of result.sections) {
      const ranks = section.treeIds.map(
        (id) => rank[result.trees.find((t) => t.root.id === id)!.difficulty],
      );
      const sorted = [...ranks].sort((a, b) => a - b);
      expect(ranks).toEqual(sorted);
    }
  });
});
