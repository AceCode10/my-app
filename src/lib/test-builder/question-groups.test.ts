import { describe, expect, it } from 'vitest';
import { groupByTopLevelQuestion } from './question-groups';

const q = (id: string, extra: Record<string, unknown> = {}) => ({ id, ...extra });

describe('groupByTopLevelQuestion', () => {
  it('keeps unrelated questions that share a question number apart', () => {
    const items = [
      q('a', { question_number: '1' }),
      q('b', { question_number: '1' }),
      q('c', { question_number: '1' }),
    ];
    expect(groupByTopLevelQuestion(items, x => x)).toHaveLength(3);
  });

  it('groups a parent with its parts and nested sub-parts', () => {
    const items = [
      q('root', { question_number: '2' }),
      q('a', { question_number: '2(a)', parent_question_id: 'root' }),
      q('ai', { question_number: '2(a)(i)', parent_question_id: 'a' }),
      q('other', { question_number: '2' }),
    ];
    const groups = groupByTopLevelQuestion(items, x => x);
    expect(groups.map(g => g.map(x => x.id))).toEqual([['root', 'a', 'ai'], ['other']]);
  });

  it('groups unlinked parts only when they come from the same paper', () => {
    const items = [
      q('a', { question_number: '16', paper_id: 'p1' }),
      q('b', { question_number: '16', paper_id: 'p1' }),
      q('c', { question_number: '16', paper_id: 'p2' }),
    ];
    const groups = groupByTopLevelQuestion(items, x => x);
    expect(groups.map(g => g.map(x => x.id))).toEqual([['a', 'b'], ['c']]);
  });
});
