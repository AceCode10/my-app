/**
 * Deterministic helpers for the solver.
 *
 * Every source of randomness in test generation runs through here so that the
 * same spec and seed always produce the same test. A teacher who regenerates
 * expecting a small change should not get a completely different paper.
 */

/**
 * mulberry32 — small, fast, seedable PRNG with a good enough distribution for
 * tie-breaking. Not cryptographic; it is not used for anything that needs to be.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export interface Quota {
  key: string;
  targetMarks: number;
  filledMarks: number;
}

/**
 * Split `total` integer marks across weighted keys without drift.
 *
 * Rounding each share independently leaves the quotas summing to something
 * other than the target, which then shows up as a test that is consistently a
 * mark or two short. Largest-remainder allocates the rounding leftovers instead.
 */
export function largestRemainder(
  shares: { key: string; share: number }[],
  total: number,
): Quota[] {
  if (shares.length === 0) return [];

  const weightSum = shares.reduce((sum, s) => sum + Math.max(0, s.share), 0);
  if (weightSum <= 0) {
    // Degenerate input: spread evenly rather than handing everything to key[0].
    return largestRemainder(
      shares.map((s) => ({ key: s.key, share: 1 })),
      total,
    );
  }

  const exact = shares.map((s) => ({
    key: s.key,
    value: (Math.max(0, s.share) / weightSum) * total,
  }));

  const quotas: Quota[] = exact.map((e) => ({
    key: e.key,
    targetMarks: Math.floor(e.value),
    filledMarks: 0,
  }));

  let assigned = quotas.reduce((sum, q) => sum + q.targetMarks, 0);
  let leftover = total - assigned;

  // Hand out the remaining whole marks to the largest fractional parts first.
  // Ties break on key so the result is stable across runs.
  const byRemainder = exact
    .map((e, i) => ({ i, frac: e.value - Math.floor(e.value), key: e.key }))
    .sort((a, b) => (b.frac - a.frac) || a.key.localeCompare(b.key));

  let cursor = 0;
  while (leftover > 0 && byRemainder.length > 0) {
    quotas[byRemainder[cursor % byRemainder.length].i].targetMarks += 1;
    leftover -= 1;
    cursor += 1;
  }

  assigned = quotas.reduce((sum, q) => sum + q.targetMarks, 0);
  if (assigned !== total && quotas.length > 0) {
    // Only reachable when total is negative; clamp rather than emit a bad quota.
    quotas[0].targetMarks += total - assigned;
  }

  return quotas;
}

/**
 * How far short of its target a quota is, as a fraction of that target.
 *
 * Clamped at zero: a satisfied quota stops attracting selections but does not
 * repel them, so a thin bank still produces a full-length test rather than
 * refusing to fill the remaining marks.
 */
export function deficitRatio(quotas: Quota[], key: string): number {
  const q = quotas.find((x) => x.key === key);
  if (!q) return 0;
  return Math.max(0, (q.targetMarks - q.filledMarks) / Math.max(q.targetMarks, 1));
}

export function fillQuota(quotas: Quota[], key: string, marks: number): void {
  const q = quotas.find((x) => x.key === key);
  if (q) q.filledMarks += marks;
}
