import { describe, expect, it } from 'vitest';

import { deficitRatio, largestRemainder, mulberry32 } from '../rng';

describe('mulberry32', () => {
  it('repeats exactly for the same seed', () => {
    const a = mulberry32(2026);
    const b = mulberry32(2026);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('diverges for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('stays inside [0, 1)', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 1000; i += 1) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('largestRemainder', () => {
  it('allocates exactly the total', () => {
    const quotas = largestRemainder(
      [
        { key: 'a', share: 1 },
        { key: 'b', share: 1 },
        { key: 'c', share: 1 },
      ],
      40,
    );
    expect(quotas.reduce((s, q) => s + q.targetMarks, 0)).toBe(40);
  });

  it('does not drift on shares that do not divide evenly', () => {
    // Plain rounding of 0.3/0.5/0.2 against 37 leaves the total off by one.
    const quotas = largestRemainder(
      [
        { key: 'easy', share: 0.3 },
        { key: 'medium', share: 0.5 },
        { key: 'hard', share: 0.2 },
      ],
      37,
    );
    expect(quotas.reduce((s, q) => s + q.targetMarks, 0)).toBe(37);
  });

  it('tracks the weighting', () => {
    const quotas = largestRemainder(
      [
        { key: 'big', share: 0.9 },
        { key: 'small', share: 0.1 },
      ],
      100,
    );
    expect(quotas.find((q) => q.key === 'big')!.targetMarks).toBe(90);
  });

  it('spreads evenly when every share is zero', () => {
    const quotas = largestRemainder(
      [
        { key: 'a', share: 0 },
        { key: 'b', share: 0 },
      ],
      10,
    );
    expect(quotas.map((q) => q.targetMarks).sort()).toEqual([5, 5]);
  });

  it('returns nothing for no keys', () => {
    expect(largestRemainder([], 40)).toEqual([]);
  });

  it('is stable across identical inputs', () => {
    const shares = [
      { key: 'a', share: 1 / 3 },
      { key: 'b', share: 1 / 3 },
      { key: 'c', share: 1 / 3 },
    ];
    expect(largestRemainder(shares, 10)).toEqual(largestRemainder(shares, 10));
  });
});

describe('deficitRatio', () => {
  it('is 1 for an untouched quota and 0 once met', () => {
    const quotas = [{ key: 'a', targetMarks: 10, filledMarks: 0 }];
    expect(deficitRatio(quotas, 'a')).toBe(1);

    quotas[0].filledMarks = 10;
    expect(deficitRatio(quotas, 'a')).toBe(0);
  });

  it('clamps at zero so an overfilled quota does not repel selections', () => {
    const quotas = [{ key: 'a', targetMarks: 10, filledMarks: 25 }];
    expect(deficitRatio(quotas, 'a')).toBe(0);
  });

  it('is 0 for a key with no quota', () => {
    expect(deficitRatio([], 'missing')).toBe(0);
  });
});
