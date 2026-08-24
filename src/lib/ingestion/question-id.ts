/**
 * The canonical question identifier.
 *
 * One string — "4", "2(a)", "11(b)(i)" — is the join key between a question
 * paper and its mark scheme, and the idempotency key for re-ingestion
 * (paper_questions.question_ref, UNIQUE per paper).
 *
 * This format is exactly what Cambridge mark schemes emit in column 0 of their
 * `Question | Answer | Marks` tables, so the join is plain string equality on
 * the Cambridge path.
 */

export interface ParsedQuestionId {
  /** Top-level question number, e.g. 11 */
  number: number;
  /** Part letter without parens, e.g. "b". Null for a top-level question. */
  part: string | null;
  /** Roman sub-part without parens, e.g. "i". Null when absent. */
  subPart: string | null;
  /**
   * The value stored in paper_questions.part_label: "b" or "b(i)".
   * Matches the convention already produced by the existing extract routes.
   */
  partLabel: string | null;
}

const QUESTION_ID_RE = /^(\d{1,2})(?:\(([a-z])\))?(?:\(([ivxlcdm]+)\))?$/;

/** Build a canonical id from its components. `part` may be "b" or "b(i)". */
export function formatQuestionId(
  number: number,
  part?: string | null,
  subPart?: string | null,
): string {
  if (!part) {
    // Some boards number sub-parts directly off the question: "2(iii)".
    const loneSub = subPart ? subPart.replace(/[()]/g, '').toLowerCase() : null;
    return loneSub ? `${number}(${loneSub})` : String(number);
  }

  // Tolerate a caller passing an already-combined part label like "b(i)".
  const combined = part.match(/^([a-z])\(([ivxlcdm]+)\)$/i);
  if (combined) {
    return `${number}(${combined[1].toLowerCase()})(${combined[2].toLowerCase()})`;
  }

  const bare = part.replace(/[()]/g, '').toLowerCase();
  const sub = subPart ? subPart.replace(/[()]/g, '').toLowerCase() : null;
  return sub ? `${number}(${bare})(${sub})` : `${number}(${bare})`;
}

/** Build the part_label column value: null, "b", or "b(i)". */
export function formatPartLabel(part?: string | null, subPart?: string | null): string | null {
  if (!part) {
    const loneSub = subPart ? subPart.replace(/[()]/g, '').toLowerCase() : null;
    return loneSub || null;
  }

  const combined = part.match(/^([a-z])\(([ivxlcdm]+)\)$/i);
  if (combined) return `${combined[1].toLowerCase()}(${combined[2].toLowerCase()})`;

  const bare = part.replace(/[()]/g, '').toLowerCase();
  if (!bare) return null;
  const sub = subPart ? subPart.replace(/[()]/g, '').toLowerCase() : null;
  return sub ? `${bare}(${sub})` : bare;
}

/**
 * Normalise the many shapes seen across boards and OCR-ish text into the
 * canonical form. Returns null when the input is not a question id at all.
 *
 * Handles: "2a", "2 (a)", "2(b)i", "2(b) (i)", "Question 2(a)", "2(A)(II)".
 */
export function normalizeQuestionId(raw: string): string | null {
  if (!raw) return null;

  const cleaned = raw
    .replace(/ /g, ' ')
    .replace(/^\s*(?:question|q)\s*/i, '')
    .replace(/\s+/g, '')
    .toLowerCase();

  const direct = cleaned.match(QUESTION_ID_RE);
  if (direct) {
    return formatQuestionId(Number(direct[1]), direct[2] ?? null, direct[3] ?? null);
  }

  // "2(iii)" — roman sub-part hanging directly off the question number.
  const loneRoman = cleaned.match(/^(\d{1,2})\(([ivxlcdm]+)\)$/);
  if (loneRoman) {
    return formatQuestionId(Number(loneRoman[1]), null, loneRoman[2]);
  }

  // Paren-less variants: 2a, 2bi, 2a(i), 2(b)i
  const loose = cleaned.match(/^(\d{1,2})\(?([a-z])\)?(?:\(?([ivxlcdm]+)\)?)?$/);
  if (loose) {
    // Guard against "2i" being read as part "i"; a lone roman numeral after the
    // number is ambiguous, so treat a single letter that is also a roman digit
    // as a part only when no sub-part follows.
    return formatQuestionId(Number(loose[1]), loose[2], loose[3] ?? null);
  }

  const bare = cleaned.match(/^(\d{1,2})$/);
  if (bare) return String(Number(bare[1]));

  return null;
}

/** Decompose a canonical id into DB column values. Throws on malformed input. */
export function parseQuestionId(id: string): ParsedQuestionId {
  const normalized = normalizeQuestionId(id);
  if (!normalized) {
    throw new Error(`Not a valid question id: ${JSON.stringify(id)}`);
  }

  const match = normalized.match(QUESTION_ID_RE);
  if (!match) {
    throw new Error(`Not a valid question id: ${JSON.stringify(id)}`);
  }

  const number = Number(match[1]);
  const part = match[2] ?? null;
  const subPart = match[3] ?? null;

  return { number, part, subPart, partLabel: formatPartLabel(part, subPart) };
}

/** True when `raw` looks like a question id (used to filter mark-scheme rows). */
export function isQuestionId(raw: string): boolean {
  return normalizeQuestionId(raw) !== null;
}

/** The canonical id of this question's parent, or null at the top level. */
export function parentQuestionId(id: string): string | null {
  const { number, part, subPart } = parseQuestionId(id);
  if (subPart) return part ? formatQuestionId(number, part) : String(number);
  if (part) return String(number);
  return null;
}

const ROMAN_VALUES: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 };

function romanToInt(roman: string): number {
  let total = 0;
  for (let i = 0; i < roman.length; i += 1) {
    const current = ROMAN_VALUES[roman[i]] ?? 0;
    const next = ROMAN_VALUES[roman[i + 1]] ?? 0;
    total += current < next ? -current : current;
  }
  return total;
}

/**
 * Sortable integer for paper_questions.display_order.
 * Guarantees 4 < 4(a) < 4(a)(i) < 4(a)(ii) < 4(b) < 5.
 */
export function displayOrderFor(id: string): number {
  const { number, part, subPart } = parseQuestionId(id);
  const partRank = part ? part.charCodeAt(0) - 96 : 0; // a -> 1
  const subRank = subPart ? romanToInt(subPart) : 0;
  return number * 10000 + partRank * 100 + subRank;
}

/** Ascending comparator over canonical ids. */
export function compareQuestionIds(a: string, b: string): number {
  return displayOrderFor(a) - displayOrderFor(b);
}
