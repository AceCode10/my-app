import { describe, expect, it } from 'vitest';
import { extractOptions } from './classify';

describe('extractOptions', () => {
  it('does not take a stem opening with "A" as option A', () => {
    const text = [
      'A book has an ISBN which is 330247204X',
      'Tick (✓) the most appropriate data type for the ISBN.',
      'A Numeric: integer',
      'B Text',
      'C Boolean',
      'D Date',
    ].join('\n');
    expect(extractOptions(text)?.map(o => `${o.label} ${o.text}`)).toEqual([
      'A Numeric: integer',
      'B Text',
      'C Boolean',
      'D Date',
    ]);
  });

  it('reads plain labelled options', () => {
    const text = 'Which is an input device?\nA) Printer\nB) Keyboard\nC) Monitor';
    expect(extractOptions(text)?.map(o => o.text)).toEqual(['Printer', 'Keyboard', 'Monitor']);
  });

  it('returns null when there is no A-B run', () => {
    expect(extractOptions('A tablet computer has input and output devices.')).toBeNull();
  });
});
