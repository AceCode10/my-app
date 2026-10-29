import { describe, expect, it } from 'vitest';

import { gradeNumericAnswer, parseNumericAnswer, withinTolerance } from '../numeric-answer';

/** Convenience: the numeric value, or null when the parser declined. */
function value(raw: string): number | null {
  const parsed = parseNumericAnswer(raw);
  return parsed.kind === 'value' ? parsed.value : null;
}

describe('parseNumericAnswer', () => {
  it('reads plain numbers', () => {
    expect(value('42')).toBe(42);
    expect(value('0.5')).toBe(0.5);
    expect(value('-4')).toBe(-4);
    expect(value('.75')).toBe(0.75);
    expect(value('0')).toBe(0);
  });

  it('reads fractions — the case the old normaliser turned into 12', () => {
    expect(value('1/2')).toBe(0.5);
    expect(value('3/4')).toBe(0.75);
    expect(value('-1/2')).toBe(-0.5);
    expect(value('7 / 8')).toBe(0.875);
  });

  it('reads mixed numbers', () => {
    expect(value('2 1/2')).toBe(2.5);
    expect(value('-2 1/2')).toBe(-2.5);
  });

  it('reads vulgar fraction glyphs', () => {
    expect(value('½')).toBe(0.5);
    expect(value('2½')).toBe(2.5);
    expect(value('¾')).toBe(0.75);
  });

  it('reads standard form in the shapes students actually type', () => {
    expect(value('3.0 x 10^8')).toBe(3e8);
    expect(value('3.0 × 10^8')).toBe(3e8);
    expect(value('3×10⁸')).toBe(3e8);
    expect(value('3e8')).toBe(3e8);
    expect(value('1.6 x 10^-19')).toBeCloseTo(1.6e-19, 25);
    expect(value('1.6×10⁻¹⁹')).toBeCloseTo(1.6e-19, 25);
  });

  it('ignores units and percent signs', () => {
    expect(value('12 cm')).toBe(12);
    expect(value('9.81 m/s^2')).toBe(9.81);
    expect(value('50%')).toBe(50);
    expect(value('45°')).toBe(45);
    expect(value('1,000 kg')).toBe(1000);
  });

  it('handles unicode minus and thousands separators', () => {
    expect(value('−4')).toBe(-4);
    expect(value('1,250')).toBe(1250);
  });

  it('refuses to guess rather than marking wrongly', () => {
    // The old code parsed this as 5 and marked the student incorrect.
    expect(parseNumericAnswer('5-3').kind).toBe('ambiguous');
    expect(parseNumericAnswer('12 or 13').kind).toBe('ambiguous');
    expect(parseNumericAnswer('between 4 and 6').kind).toBe('ambiguous');
    expect(parseNumericAnswer('1/0').kind).toBe('ambiguous');
  });

  it('treats blank and non-numeric input as empty', () => {
    expect(parseNumericAnswer('').kind).toBe('empty');
    expect(parseNumericAnswer('   ').kind).toBe('empty');
    expect(parseNumericAnswer(null).kind).toBe('empty');
    expect(parseNumericAnswer('I do not know').kind).toBe('empty');
  });
});

describe('withinTolerance', () => {
  it('accepts a 1% relative difference', () => {
    expect(withinTolerance(100, 100)).toBe(true);
    expect(withinTolerance(100.5, 100)).toBe(true);
    expect(withinTolerance(102, 100)).toBe(false);
  });

  it('matches equivalent forms of the same value', () => {
    expect(withinTolerance(value('1/2')!, value('0.5')!)).toBe(true);
    expect(withinTolerance(value('3/4')!, value('0.75')!)).toBe(true);
    expect(withinTolerance(value('3.0 x 10^8')!, value('3e8')!)).toBe(true);
  });

  it('still matches a correct answer of zero', () => {
    // A purely relative tolerance makes 0 unreachable except by an exact 0.
    expect(withinTolerance(0, 0)).toBe(true);
    expect(withinTolerance(1e-12, 0)).toBe(true);
    expect(withinTolerance(0.5, 0)).toBe(false);
  });

  it('rejects non-finite input', () => {
    expect(withinTolerance(NaN, 1)).toBe(false);
    expect(withinTolerance(Infinity, 1)).toBe(false);
  });
});

describe('gradeNumericAnswer', () => {
  it('marks the answers the old normaliser got wrong as correct', () => {
    expect(gradeNumericAnswer('1/2', '0.5')).toEqual({ kind: 'correct', expected: 0.5 });
    expect(gradeNumericAnswer('3/4', '0.75').kind).toBe('correct');
    expect(gradeNumericAnswer('3.0 x 10^8', '300000000').kind).toBe('correct');
    expect(gradeNumericAnswer('12 cm', '12').kind).toBe('correct');
  });

  it('allows a 1% tolerance and no more', () => {
    expect(gradeNumericAnswer('100.9', '100').kind).toBe('correct');
    expect(gradeNumericAnswer('102', '100')).toEqual({ kind: 'incorrect', expected: 100 });
  });

  it('sends answers it cannot read to a teacher instead of marking them wrong', () => {
    expect(gradeNumericAnswer('5-3', '2').kind).toBe('review');
    expect(gradeNumericAnswer('12 or 13', '12').kind).toBe('review');
    expect(gradeNumericAnswer('twelve', '12').kind).toBe('review');
  });

  it('sends the question to a teacher when the mark scheme is not one number', () => {
    expect(gradeNumericAnswer('4', 'between 4 and 6').kind).toBe('review');
  });
});
