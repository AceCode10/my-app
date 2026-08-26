import { describe, expect, it } from 'vitest';

import { estimateCostUsd, getModelRate } from '../pricing';

describe('getModelRate', () => {
  it('prices a known model', () => {
    expect(getModelRate('claude-sonnet-5')).toMatchObject({
      inputPerMTok: 2,
      outputPerMTok: 10,
    });
  });

  it('resolves a dated snapshot id to its base model', () => {
    expect(getModelRate('claude-haiku-4-5-20251001')).toMatchObject({
      inputPerMTok: 1,
      outputPerMTok: 5,
    });
  });

  it('returns null for an unpriced model rather than guessing', () => {
    // gpt-4o is deliberately absent: the rate was never verified, and a wrong
    // number in a cost dashboard is worse than a visible gap.
    expect(getModelRate('gpt-4o')).toBeNull();
  });
});

describe('estimateCostUsd', () => {
  it('computes a known cost', () => {
    // 1M in + 1M out on Sonnet 5 = $2 + $10.
    expect(estimateCostUsd('claude-sonnet-5', 1_000_000, 1_000_000)).toBe(12);
  });

  it('matches the measured topic-assignment call', () => {
    // ~3,300 in / ~740 out per paper, the figure the cost audit was built on.
    const cost = estimateCostUsd('claude-sonnet-5', 3300, 740);
    expect(cost).toBeCloseTo(0.014, 3);
  });

  it('halves for the Batch API', () => {
    const standard = estimateCostUsd('claude-sonnet-5', 3300, 740)!;
    const batch = estimateCostUsd('claude-sonnet-5', 3300, 740, { batch: true })!;
    expect(batch).toBeCloseTo(standard / 2, 6);
  });

  it('is null, not zero, for an unpriced model', () => {
    expect(estimateCostUsd('gpt-4o', 30_000, 12_000)).toBeNull();
  });

  it('handles a zero-token call', () => {
    expect(estimateCostUsd('claude-sonnet-5', 0, 0)).toBe(0);
  });

  it('shows Haiku at half of Sonnet', () => {
    const sonnet = estimateCostUsd('claude-sonnet-5', 3300, 740)!;
    const haiku = estimateCostUsd('claude-haiku-4-5', 3300, 740)!;
    expect(haiku).toBeCloseTo(sonnet / 2, 6);
  });
});
