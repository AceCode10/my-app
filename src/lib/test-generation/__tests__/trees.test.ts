import { describe, expect, it } from 'vitest';

import { buildTrees, computeTreeMarks, flattenTree } from '../trees';
import { leafRow, multiPartRow, resetIds, standardPool } from './fixtures';

describe('buildTrees', () => {
  it('nests parts under their main question', () => {
    resetIds();
    const trees = buildTrees(multiPartRow([2, 3]));

    expect(trees).toHaveLength(1);
    expect(trees[0].root.children).toHaveLength(2);
    expect(trees[0].nodeCount).toBe(3);
  });

  it('counts each mark once when the parent holds a denormalised total', () => {
    resetIds();
    // Root says 5, children say 2 + 3. Summing both would give 10.
    const trees = buildTrees(multiPartRow([2, 3]));
    expect(trees[0].marks).toBe(5);
  });

  it('falls back to the parent marks when children carry none', () => {
    resetIds();
    const rows = multiPartRow([0, 0]);
    rows[0].marks = 6;
    const trees = buildTrees(rows);
    expect(trees[0].marks).toBe(6);
  });

  it('uses the root marks for a single-part question', () => {
    resetIds();
    const trees = buildTrees(leafRow({ marks: 4 }));
    expect(trees[0].marks).toBe(4);
  });

  it('promotes orphans to roots rather than dropping them', () => {
    resetIds();
    const rows = multiPartRow([2, 3]);
    const withoutParent = rows.slice(1); // children only
    const trees = buildTrees(withoutParent);

    expect(trees).toHaveLength(2);
    expect(trees.reduce((s, t) => s + t.marks, 0)).toBe(5);
  });

  it('weights difficulty by where the marks actually sit', () => {
    resetIds();
    const rows = multiPartRow([1, 9]);
    rows[1].difficulty = 'easy';
    rows[2].difficulty = 'hard';

    expect(buildTrees(rows)[0].difficulty).toBe('hard');
  });

  it('maps child topics onto their root topic for quota accounting', () => {
    resetIds();
    const trees = buildTrees(leafRow({ topicId: 'osmosis' }), {
      topicRoots: new Map([['osmosis', 'movement-of-substances']]),
    });
    expect(trees[0].quotaTopicId).toBe('movement-of-substances');
  });

  it('marks past-paper provenance from the root row', () => {
    resetIds();
    const trees = buildTrees(multiPartRow([2, 3], { paperId: 'paper-9' }));
    expect(trees[0].fromPastPaper).toBe(true);
    expect(trees[0].paperId).toBe('paper-9');
  });

  it('is order independent', () => {
    const rows = standardPool();
    const forward = buildTrees(rows).map((t) => t.root.id);
    const backward = buildTrees([...rows].reverse()).map((t) => t.root.id);
    expect(forward).toEqual(backward);
  });
});

describe('computeTreeMarks', () => {
  it('sums three levels without double counting', () => {
    resetIds();
    const rows = multiPartRow([0, 0]);
    const [root, partA, partB] = rows;
    root.marks = 7;

    const subParts = [
      { ...partA, id: 'sub-1', parent_question_id: partA.id, marks: 3 },
      { ...partB, id: 'sub-2', parent_question_id: partB.id, marks: 4 },
    ];

    const trees = buildTrees([...rows, ...subParts]);
    expect(computeTreeMarks(trees[0].root)).toBe(7);
    expect(flattenTree(trees[0].root)).toHaveLength(5);
  });
});
