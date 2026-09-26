import { describe, expect, it } from 'vitest';
import { toSourceQuestion, type SourceContext, type SourceRow } from './source-mode';

const context: SourceContext = {
  paperUrls: new Map([['p1', 'https://x/p1.pdf']]),
  licensedBoards: (id) => id === 'cie',
};

const row = (extra: Partial<SourceRow> = {}): SourceRow => ({
  marks: 2,
  paper_id: 'p1',
  exam_board_id: 'cie',
  source_regions: [{ page: 1, bbox: [60, 57, 548, 188] }],
  ...extra,
});

describe('toSourceQuestion', () => {
  it('prints a licensed question with regions from source', () => {
    const q = toSourceQuestion(3, [row({ source_label: { page: 1, x: 49.6, right: 56, top: 63, bottom: 74 } })], context);
    expect(q).toMatchObject({ kind: 'source', number: 3, pdfUrl: 'https://x/p1.pdf' });
    expect(q!.label).toMatchObject({ x: 49.6 });
  });

  it('falls back when the board is not licensed', () => {
    expect(toSourceQuestion(1, [row({ exam_board_id: 'aqa' })], context)).toBeNull();
  });

  it('falls back when a marked part has no regions', () => {
    expect(toSourceQuestion(1, [row(), row({ source_regions: null })], context)).toBeNull();
  });

  it('skips an empty synthesised parent but not a real context row', () => {
    const parent = row({ marks: 0, source_regions: null, stem: '' });
    expect(toSourceQuestion(1, [parent, row()], context)).not.toBeNull();
    const context_ = row({ marks: 0, source_regions: null, stem: 'A school uses a database to store student records.' });
    expect(toSourceQuestion(1, [context_, row()], context)).toBeNull();
  });

  it('falls back for rows from different papers or an unknown paper', () => {
    expect(toSourceQuestion(1, [row(), row({ paper_id: 'p2' })], context)).toBeNull();
    expect(toSourceQuestion(1, [row({ paper_id: 'p9' })], context)).toBeNull();
    expect(toSourceQuestion(1, [row({ paper_id: null })], context)).toBeNull();
  });
});
