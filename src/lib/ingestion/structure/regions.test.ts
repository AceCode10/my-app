import { describe, expect, it } from 'vitest';
import { cambridgeProfile } from '../profiles/cambridge';
import type { ParsedDocument, ParsedLine, ParsedPage } from '../types';
import { segmentQuestions } from './segment-questions';

const LINE_H = 11;

function line(text: string, x0: number, top: number, x1 = x0 + text.length * 5.5): ParsedLine {
  return { text, x0, x1, top, bottom: top + LINE_H };
}

function page(index: number, lines: ParsedLine[], extra: Partial<ParsedPage> = {}): ParsedPage {
  const header = index > 0 ? [line(String(index + 1), 296, 25)] : [];
  const footer = [line('© UCLES 2024 0417/12/F/M/24', 50, 792)];
  return {
    index,
    width: 595.28,
    height: 841.89,
    text: '',
    lines: [...header, ...lines, ...footer],
    tables: [],
    figures: [],
    ...extra,
  };
}

function doc(pages: ParsedPage[]): ParsedDocument {
  return {
    pageCount: pages.length,
    pages,
    markers: { markTags: [], anchors: [] },
    headerText: '',
    extractionMethod: 'python_v2',
    warnings: [],
  };
}

const segment = (d: ParsedDocument) => segmentQuestions(d, cambridgeProfile).questions;
const byRef = (d: ParsedDocument) => new Map(segment(d).map((q) => [q.ref, q]));

describe('source regions', () => {
  it('ends a row just above the next anchor on the same page', () => {
    const q = byRef(
      doc([
        page(0, [
          line('1 Circle two items which are solid-state storage media.', 49.6, 63),
          line('Actuator Blu-ray disc Cloud DVD', 100, 100),
          line('[2]', 530, 160, 544),
          line('2 A computer system consists of both hardware and software.', 49.6, 195),
          line('(a) Explain what the following types of software provide.', 72.3, 221),
          line('[2]', 530, 340, 544),
        ]),
      ]),
    );

    expect(q.get('1')!.sourceRegions).toHaveLength(1);
    const [x0, top, x1, bottom] = q.get('1')!.sourceRegions[0].bbox;
    expect(top).toBeCloseTo(62.5);
    expect(bottom).toBeCloseTo(193); // next anchor top (195) - 2
    expect(x1).toBeGreaterThanOrEqual(544);
    // Gutter: right of the printed "1", left of the body text at 72.3.
    expect(x0).toBeGreaterThan(55);
    expect(x0).toBeLessThan(72.3);
    expect(q.get('1')!.sourceLabel).toMatchObject({ page: 0, x: 49.6, top: 63 });

    // Rows of one question tile: 2 ends where 2(a) starts.
    expect(q.get('2')!.sourceRegions[0].bbox[3]).toBeCloseTo(q.get('2(a)')!.sourceRegions[0].bbox[1]);
    // Parts share the question's gutter and carry no label.
    expect(q.get('2(a)')!.sourceRegions[0].bbox[0]).toBe(q.get('2')!.sourceRegions[0].bbox[0]);
    expect(q.get('2(a)')!.sourceLabel).toBeNull();
  });

  it('keeps footers and the next page header out of the last row on a page', () => {
    const q = byRef(
      doc([
        page(0, [
          line('1 State two uses of a sensor.', 49.6, 63),
          line('[2]', 530, 200, 544),
        ]),
        page(1, [line('2 Describe a test plan.', 49.6, 63), line('[4]', 530, 300, 544)]),
      ]),
    );

    const regions = q.get('1')!.sourceRegions;
    expect(regions).toHaveLength(1);
    expect(regions[0].page).toBe(0);
    expect(regions[0].bbox[3]).toBeLessThan(230); // not the whole page
  });

  it('splits a question that runs onto the next page into one region per page', () => {
    const q = byRef(
      doc([
        page(0, [
          line('1 A school uses a database.', 49.6, 600),
          line('Explain how validation is used.', 72.3, 640),
        ]),
        page(1, [
          line('..........................................', 72.3, 70),
          line('[3]', 530, 120, 544),
          line('2 Next question.', 49.6, 200),
        ]),
      ]),
    );

    const regions = q.get('1')!.sourceRegions;
    expect(regions.map((r) => r.page)).toEqual([0, 1]);
    expect(regions[0].bbox[3]).toBeLessThan(792); // above the footer
    expect(regions[1].bbox[1]).toBeGreaterThan(36); // below the "2" page header
    expect(regions[1].bbox[3]).toBeCloseTo(198); // next anchor - 2
  });

  it('skips a blank page and stops at the permissions notice', () => {
    const q = byRef(
      doc([
        page(0, [line('1 Give two ways of reducing spam emails.', 49.6, 63), line('[2]', 530, 150, 544)]),
        page(1, [line('BLANK PAGE', 250, 400)]),
        page(2, [
          line('Permission to reproduce items where third-party owned material', 50, 700),
          line('protected by copyright is included has been sought.', 50, 712),
        ]),
      ]),
    );

    expect(q.get('1')!.sourceRegions.map((r) => r.page)).toEqual([0]);
  });

  it('keeps a barcode-font header line out of a region at the top of a page', () => {
    const q = byRef(
      doc([
        page(0, [line('1 First question.', 49.6, 63), line('[1]', 530, 100, 544)]),
        page(1, [
          { text: ',     ,', x0: 66, x1: 240, top: 54.1, bottom: 59.1 },
          line('2 Teachers at a school store records.', 49.6, 63.8),
          line('[2]', 530, 120, 544),
        ]),
      ]),
    );
    const top = q.get('2')!.sourceRegions[0].bbox[1];
    expect(top).toBeGreaterThan(59.1);
    expect(top).toBeLessThan(63.8);
  });

  it('pulls a figure below the last text line into the region', () => {
    const q = byRef(
      doc([
        page(
          0,
          [line('1 Study the flowchart in Fig. 1.1.', 49.6, 63), line('[3]', 530, 420, 544)],
          { figures: [{ bbox: [100, 90, 450, 400], kind: 'vector', label: 'Fig. 1.1' }] },
        ),
      ]),
    );
    const [, top, , bottom] = q.get('1')!.sourceRegions[0].bbox;
    expect(top).toBeLessThan(90);
    expect(bottom).toBeGreaterThan(420);
  });
});
