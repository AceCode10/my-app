import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { QUESTION_FRAME, composeTestPdf, layoutRegions, mergeContiguous, type Region } from './compose-test-pdf';

const region = (page: number, top: number, bottom: number, x0 = 60, x1 = 548): Region => ({
  page,
  bbox: [x0, top, x1, bottom],
});

describe('mergeContiguous', () => {
  it('joins rows that tile the same page and keeps page breaks', () => {
    const merged = mergeContiguous([region(1, 57, 188), region(1, 188, 215), region(1, 215, 364), region(2, 57, 100)]);
    expect(merged.map((r) => [r.page, r.bbox[1], r.bbox[3]])).toEqual([
      [1, 57, 364],
      [2, 57, 100],
    ]);
  });

  it('does not join regions separated by a gap', () => {
    expect(mergeContiguous([region(1, 57, 100), region(1, 150, 200)])).toHaveLength(2);
  });
});

describe('layoutRegions', () => {
  it('stacks questions and starts a new page when a region does not fit', () => {
    const { placements, pageCount } = layoutRegions([
      { regions: [region(0, 50, 450)] },
      { regions: [region(0, 50, 450)] },
    ]);
    expect(pageCount).toBe(2);
    expect(placements.map((p) => [p.page, p.y])).toEqual([
      [0, QUESTION_FRAME.top],
      [1, QUESTION_FRAME.top],
    ]);
    expect(placements[0].x).toBe(60);
  });

  it('scales down a region taller than the frame', () => {
    const { placements } = layoutRegions([{ regions: [region(0, 20, 1000)] }]);
    expect(placements[0].scale).toBeLessThan(1);
    expect(placements[0].scale * 980).toBeLessThanOrEqual(QUESTION_FRAME.bottom - QUESTION_FRAME.top);
  });
});

describe('composeTestPdf', () => {
  async function sourcePaper(): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < 2; i += 1) {
      const page = doc.addPage([595.28, 841.89]);
      page.drawText(`1 Question on page ${i + 1}`, { x: 50, y: 760, size: 11, font });
    }
    return doc.save();
  }

  it('puts the cover first, draws source questions, appends chunks and adds footers', async () => {
    const paper = await sourcePaper();
    const cover = await PDFDocument.create();
    cover.addPage();
    const chunk = await PDFDocument.create();
    chunk.addPage();

    let loads = 0;
    const bytes = await composeTestPdf({
      cover: await cover.save(),
      items: [
        { kind: 'source', number: 1, pdfUrl: 'paper', regions: [region(0, 70, 300)], label: { page: 0, x: 50, top: 71, bottom: 82 } },
        { kind: 'source', number: 2, pdfUrl: 'paper', regions: [region(1, 70, 300)], label: null },
        { kind: 'pdf', bytes: await chunk.save() },
      ],
      footer: { center: '© IGA Prep', right: 'igaprep.com' },
      fetchPdf: async () => {
        loads += 1;
        return paper.buffer.slice(paper.byteOffset, paper.byteOffset + paper.byteLength) as ArrayBuffer;
      },
    });

    const result = await PDFDocument.load(bytes);
    // cover + one page holding both questions + the chunk page
    expect(result.getPageCount()).toBe(3);
    expect(loads).toBe(1);
  });
});
