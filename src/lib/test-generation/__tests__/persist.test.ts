import { describe, expect, it } from 'vitest';

import { buildAssessmentQuestionRows } from '../persist';
import { allocateRowMarks, buildTrees, computeTreeMarks } from '../trees';
import type { QuestionRow, SolverResult } from '../types';
import { leafRow, multiPartRow, resetIds } from './fixtures';

function row(id: string, parent: string | null, marks: number, partLabel: string | null, displayOrder: number | null): QuestionRow {
  return {
    id,
    parent_question_id: parent,
    part_label: partLabel,
    marks,
    difficulty: 'medium',
    question_type: 'short_answer',
    topic_id: 'topic-a',
    display_order: displayOrder,
    image_url: null,
    paper_id: 'paper-1',
  };
}

/** Question 2 of a real paper: stem, (a), (b) with sub-parts (i) and (ii). */
function threeLevelTree(): QuestionRow[] {
  return [
    row('q2', null, 6, null, 200), // denormalised total on the stem
    row('q2b', 'q2', 4, 'b', 220), // denormalised total on the part stem
    row('q2bii', 'q2b', 2, 'b(ii)', 222),
    row('q2a', 'q2', 2, 'a', 210),
    row('q2bi', 'q2b', 2, 'b(i)', 221),
  ];
}

function solved(rows: QuestionRow[], sections: { name: string | null; treeIds: string[] }[]): SolverResult {
  const trees = buildTrees(rows);
  return {
    status: 'ok',
    trees,
    totalMarks: trees.reduce((sum, t) => sum + t.marks, 0),
    sections: sections.map((s) => ({
      name: s.name,
      instructions: null,
      treeIds: s.treeIds,
      marks: s.treeIds.reduce((sum, id) => sum + trees.find((t) => t.root.id === id)!.marks, 0),
    })),
    diagnostics: {} as SolverResult['diagnostics'],
  };
}

describe('allocateRowMarks', () => {
  it('gives context stems 0 and parts their own marks, summing to the tree marks', () => {
    const [tree] = buildTrees(threeLevelTree());
    const rows = allocateRowMarks(tree.root);

    expect(rows.map((r) => [r.node.id, r.marks])).toEqual([
      ['q2', 0],
      ['q2a', 2],
      ['q2b', 0],
      ['q2bi', 2],
      ['q2bii', 2],
    ]);
    expect(rows.reduce((sum, r) => sum + r.marks, 0)).toBe(computeTreeMarks(tree.root));
  });

  it('keeps the marks on the parent when its children carry none', () => {
    resetIds();
    const rows = multiPartRow([0, 0]);
    rows[0].marks = 6;
    const [tree] = buildTrees(rows);
    const allocated = allocateRowMarks(tree.root);

    expect(allocated.map((r) => r.marks)).toEqual([6, 0, 0]);
    expect(tree.marks).toBe(6);
  });
});

describe('buildAssessmentQuestionRows', () => {
  it('stores every row of each tree, parent first, with its own marks', () => {
    resetIds();
    const single = leafRow({ marks: 3 });
    const result = solved([...threeLevelTree(), ...single], [{ name: 'Section A', treeIds: ['q2', single[0].id] }]);

    const rows = buildAssessmentQuestionRows('assessment-1', result);

    expect(rows.map((r) => [r.question_id, r.custom_marks, r.question_order])).toEqual([
      ['q2', 0, 1],
      ['q2a', 2, 2],
      ['q2b', 0, 3],
      ['q2bi', 2, 4],
      ['q2bii', 2, 5],
      [single[0].id, 3, 6],
    ]);
    expect(rows.every((r) => r.assessment_id === 'assessment-1' && r.section_name === 'Section A')).toBe(true);
  });

  it('keeps the stored marks equal to the solver total', () => {
    resetIds();
    const a = multiPartRow([2, 3]);
    const b = multiPartRow([1, 1, 4]);
    const result = solved([...a, ...b], [
      { name: 'Section A', treeIds: [a[0].id] },
      { name: 'Section B', treeIds: [b[0].id] },
    ]);

    const rows = buildAssessmentQuestionRows('x', result);
    const stored = rows.reduce((sum, r) => sum + (r.custom_marks as number), 0);

    expect(rows).toHaveLength(7);
    expect(stored).toBe(result.totalMarks);
    expect(rows.filter((r) => r.section_name === 'Section B')).toHaveLength(4);
  });

  it('orders parts by part label when display_order is missing', () => {
    const rows = [
      row('root', null, 0, null, null),
      row('part-c', 'root', 1, 'c', null),
      row('part-a', 'root', 1, 'a', null),
      row('part-b', 'root', 1, 'b', null),
    ];
    const result = solved(rows, [{ name: null, treeIds: ['root'] }]);

    expect(buildAssessmentQuestionRows('x', result).map((r) => r.question_id)).toEqual([
      'root',
      'part-a',
      'part-b',
      'part-c',
    ]);
  });
});
