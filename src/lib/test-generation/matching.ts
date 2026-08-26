/**
 * Fuzzy matching of teacher wording onto database rows.
 *
 * Deliberately local rather than a trigram query: the reference tables
 * (subjects, exam boards, a subject's topics) are small enough to score in
 * memory, and doing so avoids depending on the pg_trgm extension being enabled
 * in every environment. Pure, so the tie-breaking rules can be tested.
 */

export interface MatchTarget {
  id: string;
  /** Highest-confidence keys first: code, slug, then names and aliases. */
  code?: string | null;
  slug?: string | null;
  names: (string | null | undefined)[];
}

export interface Match<T extends MatchTarget = MatchTarget> {
  target: T;
  score: number;
}

/** Below this a candidate is not a match at all. */
export const MATCH_THRESHOLD = 0.55;
/** Two candidates this close together are a genuine ambiguity, not a near miss. */
export const AMBIGUITY_MARGIN = 0.05;

export function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value: string): string[] {
  return normalise(value).split(' ').filter(Boolean);
}

/**
 * Everything but letters and digits removed, spaces included.
 *
 * Teachers punctuate initialisms inconsistently — "I.C.T.", "ICT" and "I C T"
 * are the same subject, but they tokenise differently. Comparing the compact
 * forms catches that without loosening the general matching.
 */
function compact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Fraction of the query's words that appear in the candidate. */
function tokenOverlap(query: string, candidate: string): number {
  const q = tokens(query);
  const c = new Set(tokens(candidate));
  if (q.length === 0) return 0;
  return q.filter((t) => c.has(t)).length / q.length;
}

function scoreAgainstName(query: string, name: string): number {
  const q = normalise(query);
  const n = normalise(name);
  if (!q || !n) return 0;

  if (q === n) return 0.9;
  if (compact(query) === compact(name)) return 0.9;
  if (n.startsWith(q) || q.startsWith(n)) return 0.75;
  if (n.includes(q) || q.includes(n)) return 0.65;

  const overlap = tokenOverlap(query, name);
  // A single shared word out of several is noise, not a match.
  return overlap >= 0.5 ? 0.5 + overlap * 0.15 : overlap * 0.4;
}

export function scoreTarget(query: string, target: MatchTarget): number {
  const q = normalise(query);
  if (!q) return 0;

  // Subject codes ("0610") are unambiguous when they match, so they win outright.
  if (target.code && compact(target.code) === compact(query)) return 1;
  if (target.slug && compact(target.slug) === compact(query)) return 0.95;

  let best = 0;
  for (const name of target.names) {
    if (!name) continue;
    best = Math.max(best, scoreAgainstName(query, name));
  }

  // A code embedded in a longer phrase ("cambridge igcse 0610") still counts.
  if (target.code && tokens(query).includes(normalise(target.code))) {
    best = Math.max(best, 0.95);
  }

  return best;
}

export function rankMatches<T extends MatchTarget>(query: string, targets: T[]): Match<T>[] {
  return targets
    .map((target) => ({ target, score: scoreTarget(query, target) }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.target.id.localeCompare(b.target.id));
}

export type ResolveOutcome<T extends MatchTarget> =
  | { kind: 'resolved'; target: T; score: number }
  | { kind: 'ambiguous'; candidates: Match<T>[] }
  | { kind: 'none' };

/**
 * Pick a single row, or say why we could not.
 *
 * Two candidates scoring within `AMBIGUITY_MARGIN` of each other is reported as
 * ambiguous rather than resolved by coin toss — "biology" matching both IGCSE
 * and A-level Biology is a question for the teacher, not a guess for us.
 */
export function resolveOne<T extends MatchTarget>(
  query: string | null,
  targets: T[],
): ResolveOutcome<T> {
  if (!query || !query.trim()) return { kind: 'none' };

  const ranked = rankMatches(query, targets).filter((m) => m.score >= MATCH_THRESHOLD);
  if (ranked.length === 0) return { kind: 'none' };
  if (ranked.length === 1) return { kind: 'resolved', target: ranked[0].target, score: ranked[0].score };

  const [first, second] = ranked;
  if (first.score - second.score <= AMBIGUITY_MARGIN) {
    return {
      kind: 'ambiguous',
      candidates: ranked.filter((m) => first.score - m.score <= AMBIGUITY_MARGIN),
    };
  }

  return { kind: 'resolved', target: first.target, score: first.score };
}

/**
 * Match a list of topic names, keeping the ones that hit and reporting the ones
 * that did not. Unmatched names are surfaced to the teacher, never dropped.
 */
export function resolveMany<T extends MatchTarget>(
  queries: string[],
  targets: T[],
): { matched: T[]; unmatched: string[] } {
  const matched: T[] = [];
  const unmatched: string[] = [];
  const seen = new Set<string>();

  for (const query of queries) {
    const ranked = rankMatches(query, targets).filter((m) => m.score >= MATCH_THRESHOLD);
    if (ranked.length === 0) {
      unmatched.push(query);
      continue;
    }
    // Topics are additive, so a near-tie is not a problem: take the best.
    const winner = ranked[0].target;
    if (!seen.has(winner.id)) {
      seen.add(winner.id);
      matched.push(winner);
    }
  }

  return { matched, unmatched };
}
