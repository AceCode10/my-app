import { describe, expect, it } from 'vitest';

import { resolveMany, resolveOne, scoreTarget, type MatchTarget } from '../matching';

const SUBJECTS: MatchTarget[] = [
  { id: 'bio-igcse', code: '0610', slug: 'biology-igcse', names: ['Biology', 'IGCSE Biology'] },
  { id: 'bio-alevel', code: '9700', slug: 'biology-a-level', names: ['Biology', 'A Level Biology'] },
  { id: 'ict', code: '0417', slug: 'ict-igcse', names: ['Information and Communication Technology', 'ICT'] },
  { id: 'chem', code: '0620', slug: 'chemistry-igcse', names: ['Chemistry'] },
];

const BOARDS: MatchTarget[] = [
  { id: 'cie', code: 'CIE', slug: 'cambridge', names: ['Cambridge Assessment International Education', 'Cambridge'] },
  { id: 'edx', code: 'EDEXCEL', slug: 'edexcel', names: ['Pearson Edexcel', 'Edexcel'] },
];

describe('scoreTarget', () => {
  it('scores an exact subject code highest', () => {
    expect(scoreTarget('0610', SUBJECTS[0])).toBe(1);
  });

  it('finds a code embedded in a longer phrase', () => {
    expect(scoreTarget('cambridge igcse 0610', SUBJECTS[0])).toBeGreaterThanOrEqual(0.95);
  });

  it('is case and punctuation insensitive', () => {
    expect(scoreTarget('I.C.T.', SUBJECTS[2])).toBeGreaterThan(0.55);
  });

  it('gives an unrelated word nothing', () => {
    expect(scoreTarget('geography', SUBJECTS[3])).toBeLessThan(0.55);
  });
});

describe('resolveOne', () => {
  it('resolves an unambiguous code', () => {
    const out = resolveOne('0417', SUBJECTS);
    expect(out.kind).toBe('resolved');
    if (out.kind === 'resolved') expect(out.target.id).toBe('ict');
  });

  it('reports ambiguity when two subjects share a name', () => {
    const out = resolveOne('biology', SUBJECTS);
    expect(out.kind).toBe('ambiguous');
    if (out.kind === 'ambiguous') {
      expect(out.candidates.map((c) => c.target.id).sort()).toEqual([
        'bio-alevel',
        'bio-igcse',
      ]);
    }
  });

  it('breaks the tie when the level is included', () => {
    const out = resolveOne('igcse biology', SUBJECTS);
    expect(out.kind).toBe('resolved');
    if (out.kind === 'resolved') expect(out.target.id).toBe('bio-igcse');
  });

  it('resolves a board by its short name', () => {
    const out = resolveOne('cambridge', BOARDS);
    expect(out.kind).toBe('resolved');
    if (out.kind === 'resolved') expect(out.target.id).toBe('cie');
  });

  it('returns none for an empty query', () => {
    expect(resolveOne(null, SUBJECTS).kind).toBe('none');
    expect(resolveOne('   ', SUBJECTS).kind).toBe('none');
  });

  it('returns none when nothing clears the threshold', () => {
    expect(resolveOne('astrophysics', SUBJECTS).kind).toBe('none');
  });

  it('is deterministic for equal scores', () => {
    const a = resolveOne('biology', SUBJECTS);
    const b = resolveOne('biology', [...SUBJECTS].reverse());
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('resolveMany', () => {
  const TOPICS: MatchTarget[] = [
    { id: 't1', names: ['Photosynthesis'] },
    { id: 't2', names: ['Movement of Substances'] },
    { id: 't3', names: ['Human Nutrition'] },
  ];

  it('keeps what matched and reports what did not', () => {
    const out = resolveMany(['photosynthesis', 'quantum tunnelling'], TOPICS);
    expect(out.matched.map((t) => t.id)).toEqual(['t1']);
    expect(out.unmatched).toEqual(['quantum tunnelling']);
  });

  it('deduplicates two phrasings of the same topic', () => {
    const out = resolveMany(['human nutrition', 'nutrition'], TOPICS);
    expect(out.matched).toHaveLength(1);
  });

  it('returns nothing for no queries', () => {
    expect(resolveMany([], TOPICS)).toEqual({ matched: [], unmatched: [] });
  });
});
