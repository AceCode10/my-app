/**
 * Parsing a numeric exam answer.
 *
 * Replaces `parseFloat(raw.replace(/[^\d.-]/g, ''))`, which stripped the very
 * characters that carry the meaning:
 *
 *   "1/2"        -> 12        (marked wrong against a correct answer of 0.5)
 *   "3/4"        -> 34
 *   "3.0 x 10^8" -> 3.0108
 *   "5-3"        -> 5         (silently graded as if the student wrote 5)
 *
 * Every one of those failed in the student's disfavour, silently, with no
 * signal to the teacher that anything had gone wrong.
 *
 * The rule here is: recognise a form, or refuse. Where the input is genuinely
 * ambiguous — bare arithmetic like "5-3", or two unrelated numbers — this
 * returns `ambiguous` so the grader can route it to a human, rather than
 * guessing at a number and quietly marking it wrong.
 */

/** A parsed value, a refusal to guess, or nothing usable at all. */
export type NumericAnswer =
  | { kind: 'value'; value: number }
  | { kind: 'ambiguous'; reason: string }
  | { kind: 'empty' };

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';

const VULGAR_FRACTIONS: Record<string, string> = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5', '⅙': '1/6',
  '⅚': '5/6', '⅐': '1/7', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8',
  '⅞': '7/8', '⅑': '1/9', '⅒': '1/10',
};

/**
 * Fold the many ways a student can type the same symbol into one spelling:
 * unicode minus and the various multiplication signs, superscript exponents,
 * vulgar fractions, thousands separators, currency and stray whitespace.
 */
function canonicalise(raw: string): string {
  // Vulgar fractions are expanded before NFKC normalisation, not after: NFKC
  // rewrites "½" to "1⁄2" on its own, which silently turns the mixed number
  // "2½" into "21/2". Substituting first, with surrounding spaces, keeps it 2 1/2.
  let s = raw;
  for (const [glyph, ascii] of Object.entries(VULGAR_FRACTIONS)) {
    s = s.split(glyph).join(` ${ascii} `);
  }

  s = s.normalize('NFKC').replace(/⁄/g, '/').trim();

  // Superscript exponents: 10⁻⁸ -> 10^-8
  s = s.replace(new RegExp(`[${SUPERSCRIPT}⁻⁺]+`, 'g'), (run) => {
    const digits = [...run]
      .map((ch) => (ch === '⁻' ? '-' : ch === '⁺' ? '+' : String(SUPERSCRIPT.indexOf(ch))))
      .join('');
    return `^${digits}`;
  });

  s = s
    .replace(/[−‒–—]/g, '-')  // unicode minus and dashes
    .replace(/[×⋅·*]/g, 'x')                       // multiplication signs
    .replace(/[÷]/g, '/')
    .replace(/[$£€]|\bK\b|ZMW|USD/gi, ' ')         // currency
    .replace(/(\d),(?=\d{3}\b)/g, '$1')            // thousands separators
    .replace(/\s+/g, ' ')
    .trim();

  return s;
}

/**
 * Strip a trailing unit or percent sign: "12 cm" -> "12", "50%" -> "50".
 *
 * Deliberately conservative. A unit may legitimately carry an exponent
 * ("9.81 m/s^2"), but a trailing run containing a free-standing number is not a
 * unit at all — "12 or 13" and "3.0 x 10^8" both end in digits that matter.
 * So the tail is only removed when, once exponents are discounted, it holds no
 * digits of its own.
 */
function stripTrailingUnit(s: string): string {
  const withoutPercent = s.replace(/%\s*$/, '').trim();

  const match = /\s*[a-zA-ZµΩ°'"][a-zA-Z0-9µΩ°'"^\/\s-]*$/.exec(withoutPercent);
  if (!match) return withoutPercent;

  const tail = match[0];
  const tailWithoutExponents = tail.replace(/\^\s*[+-]?\d+/g, '');
  if (/\d/.test(tailWithoutExponents)) return withoutPercent;

  const head = withoutPercent.slice(0, match.index).trim();
  return head || withoutPercent;
}

const PLAIN = /^[+-]?(\d+\.?\d*|\.\d+)$/;
const FRACTION = /^([+-]?\d+\.?\d*)\s*\/\s*([+-]?\d+\.?\d*)$/;
const MIXED = /^([+-]?\d+)\s+(\d+\.?\d*)\s*\/\s*(\d+\.?\d*)$/;
const STANDARD_FORM = /^([+-]?\d+\.?\d*)\s*x\s*10\s*\^?\s*([+-]?\d+)$/i;
const E_NOTATION = /^([+-]?\d+\.?\d*)[eE]([+-]?\d+)$/;

/**
 * Parse one numeric answer.
 *
 * Recognised: plain numbers, fractions (`3/4`), mixed numbers (`2 1/2`),
 * standard form (`3.0 x 10^8`, `3×10⁸`, `3e8`), values carrying a unit
 * (`12 cm`, `9.81 m/s^2`) and percentages (`50%` -> 50).
 */
export function parseNumericAnswer(raw: string | null | undefined): NumericAnswer {
  if (raw == null) return { kind: 'empty' };

  const canonical = canonicalise(String(raw));
  if (!canonical) return { kind: 'empty' };

  // Try the whole string first, then again with a trailing unit removed.
  // Order matters: "3.0 x 10^8" must be read as standard form before anything
  // is allowed to treat its "x 10^8" as a unit.
  for (const s of [canonical, stripTrailingUnit(canonical)]) {
    const parsed = matchNumericForm(s);
    if (parsed) return parsed;
  }

  // Nothing matched. If it still contains digits it is something we should not
  // guess at — "5-3", "between 4 and 6", "12 or 13" — so hand it to a teacher.
  if (/\d/.test(canonical)) {
    return { kind: 'ambiguous', reason: 'could not read this as a single value' };
  }
  return { kind: 'empty' };
}

/** One recognised numeric form, or null if this string is not one. */
function matchNumericForm(s: string): NumericAnswer | null {
  if (!s) return null;

  const mixed = MIXED.exec(s);
  if (mixed) {
    const whole = Number(mixed[1]);
    const den = Number(mixed[3]);
    if (den === 0) return { kind: 'ambiguous', reason: 'division by zero' };
    const magnitude = Math.abs(whole) + Number(mixed[2]) / den;
    return { kind: 'value', value: whole < 0 ? -magnitude : magnitude };
  }

  const sf = STANDARD_FORM.exec(s);
  if (sf) return { kind: 'value', value: Number(sf[1]) * Math.pow(10, Number(sf[2])) };

  const e = E_NOTATION.exec(s);
  if (e) return { kind: 'value', value: Number(e[1]) * Math.pow(10, Number(e[2])) };

  const frac = FRACTION.exec(s);
  if (frac) {
    const den = Number(frac[2]);
    if (den === 0) return { kind: 'ambiguous', reason: 'division by zero' };
    return { kind: 'value', value: Number(frac[1]) / den };
  }

  if (PLAIN.test(s)) return { kind: 'value', value: Number(s) };

  return null;
}

/**
 * Compare against the mark scheme with a relative tolerance.
 *
 * The absolute floor matters: a relative tolerance alone makes a correct answer
 * of 0 unmatchable by anything except an exact 0, and rounding through a
 * multi-step calculation rarely lands exactly on it.
 */
export function withinTolerance(
  student: number,
  expected: number,
  relative = 0.01,
): boolean {
  if (!Number.isFinite(student) || !Number.isFinite(expected)) return false;
  return Math.abs(student - expected) <= Math.max(Math.abs(expected) * relative, 1e-9);
}

/** The outcome of marking one numeric answer against the mark scheme. */
export type NumericGrade =
  | { kind: 'correct'; expected: number }
  | { kind: 'incorrect'; expected: number }
  | { kind: 'review'; reason: string };

/**
 * Mark a calculation answer. Anything that cannot be read as one value — on
 * either side — goes to a teacher instead of being marked wrong.
 */
export function gradeNumericAnswer(
  studentRaw: string | null | undefined,
  expectedRaw: string | null | undefined,
): NumericGrade {
  const expected = parseNumericAnswer(expectedRaw);
  if (expected.kind !== 'value') {
    return { kind: 'review', reason: 'the mark scheme answer is not a single number' };
  }

  const student = parseNumericAnswer(studentRaw);
  if (student.kind === 'ambiguous') return { kind: 'review', reason: student.reason };
  if (student.kind === 'empty') return { kind: 'review', reason: 'no number in the answer' };

  return withinTolerance(student.value, expected.value)
    ? { kind: 'correct', expected: expected.value }
    : { kind: 'incorrect', expected: expected.value };
}
