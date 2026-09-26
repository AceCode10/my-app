import type { BBox, ParsedLine, ParsedPage, SourceRegion } from '../types';

/**
 * Source regions: the rectangles of the original question paper that belong to
 * one question row, so a test can print the question exactly as the board did
 * (tables, word grids, tick boxes, answer lines) instead of rebuilding it from
 * extracted text.
 *
 * The old single `sourceBBox` was the union of every line in the row's block.
 * A block runs from its anchor to the next anchor, which for the last question
 * on a page includes the page footer, the next page's header and lines from
 * the next page — all in one box of mixed-page coordinates. Regions are
 * computed per page and inside the page's content frame instead.
 */

/** Space kept above an anchor line, and left between consecutive rows. */
const ANCHOR_PAD = 6;
/** Padding around content-derived edges. */
const EDGE_PAD = 4;
/** Header and footer furniture only counts inside these bands. */
const HEADER_BAND = 80;
const FOOTER_BAND = 80;
/** A region shorter than this is noise (a stray label), not content. */
const MIN_REGION_HEIGHT = 8;

export interface BlockLine {
  line: ParsedLine;
  page: number;
}

export interface PageFrame {
  /** First y below the running header. */
  contentTop: number;
  /** Last y above the running footer. */
  contentBottom: number;
  /** Right edge of the page's content (mark tags sit here). */
  contentRight: number;
}

/**
 * The page's content frame. Furniture is recognised by `isFurniture`, but only
 * near the top and bottom edges: a lone "1" or "2" in the middle of a page is
 * an answer-slot label, not a page number.
 */
export function pageFrame(page: ParsedPage, isFurniture: (text: string) => boolean): PageFrame {
  let contentTop = 20;
  let contentBottom = page.height - 20;
  let contentRight = 0;

  for (const line of page.lines) {
    if (!isFurniture(line.text)) continue;
    if (line.bottom <= HEADER_BAND) contentTop = Math.max(contentTop, line.bottom + 2);
    else if (line.top >= page.height - FOOTER_BAND) contentBottom = Math.min(contentBottom, line.top - 2);
  }

  for (const line of page.lines) {
    const mid = (line.top + line.bottom) / 2;
    if (mid < contentTop || mid > contentBottom || isFurniture(line.text)) continue;
    contentRight = Math.max(contentRight, line.x1);
  }
  for (const box of contentBoxes(page)) {
    if (box[1] >= contentTop && box[3] <= contentBottom) contentRight = Math.max(contentRight, box[2]);
  }

  contentRight = contentRight > 0 ? Math.min(contentRight + EDGE_PAD, page.width - 8) : page.width - 40;
  return { contentTop, contentBottom, contentRight };
}

function contentBoxes(page: ParsedPage): BBox[] {
  return [
    ...page.figures.map((f) => f.bbox),
    ...page.tables.map((t) => t.bbox),
    ...(page.tableRegions ?? []).map((r) => r.bbox),
  ];
}

/**
 * Left edge of the regions for a question: just right of its printed number,
 * and never right of where its own text starts. Line objects from /v2/extract
 * carry no word boxes, so the number's width is estimated from the line height
 * (digits are ~0.6 em wide in the sans faces boards use).
 */
export function questionGutter(anchor: ParsedLine, numberText: string, bodyStartXs: number[]): number {
  const lineHeight = Math.max(6, anchor.bottom - anchor.top);
  const labelRight = anchor.x0 + numberText.length * lineHeight * 0.6;
  const bodyStart = bodyStartXs.length > 0 ? Math.min(...bodyStartXs) : Infinity;
  return Math.min(labelRight + 4, bodyStart - 1);
}

export interface RegionInput {
  /** The row's block: its anchor line first, then every line up to the next anchor. */
  block: BlockLine[];
  /** The next anchor, when there is one. */
  next: BlockLine | null;
  pages: ParsedPage[];
  isFurniture: (text: string) => boolean;
  trailingMatter?: RegExp[];
  /** Left edge shared by every region of the question (see questionGutter). */
  gutterX: number;
}

export function computeRegions(input: RegionInput): SourceRegion[] {
  const { block, next, pages, isFurniture, trailingMatter = [], gutterX } = input;
  if (block.length === 0) return [];

  const pageByIndex = new Map(pages.map((p) => [p.index, p]));
  const frames = new Map<number, PageFrame>();
  const frameFor = (index: number) => {
    if (!frames.has(index)) frames.set(index, pageFrame(pageByIndex.get(index)!, isFurniture));
    return frames.get(index)!;
  };

  // Content lines per page, in order, stopping at end-of-paper matter.
  const linesByPage = new Map<number, ParsedLine[]>();
  for (const entry of block) {
    if (trailingMatter.some((re) => re.test(entry.line.text.trim()))) break;
    const page = pageByIndex.get(entry.page);
    if (!page) continue;
    const frame = frameFor(entry.page);
    const mid = (entry.line.top + entry.line.bottom) / 2;
    if (mid < frame.contentTop || mid > frame.contentBottom) continue;
    // Margin text inside the frame ("DO NOT WRITE IN THIS MARGIN").
    if (isFurniture(entry.line.text) && !/^\s*\d{1,3}\s*$/.test(entry.line.text)) continue;
    if (!linesByPage.has(entry.page)) linesByPage.set(entry.page, []);
    linesByPage.get(entry.page)!.push(entry.line);
  }

  const anchorEntry = block[0];
  const trailingLine = block.find((e) => trailingMatter.some((re) => re.test(e.line.text.trim())));
  const regions: SourceRegion[] = [];

  for (const [pageIndex, lines] of linesByPage) {
    const page = pageByIndex.get(pageIndex)!;
    const frame = frameFor(pageIndex);
    const isAnchorPage = pageIndex === anchorEntry.page;
    const nextOnPage = next && next.page === pageIndex ? next.line.top : null;
    const trailingOnPage = trailingLine && trailingLine.page === pageIndex ? trailingLine.line.top : null;
    const limit = Math.min(nextOnPage ?? Infinity, trailingOnPage ?? Infinity, frame.contentBottom);

    const firstTop = Math.min(...lines.map((l) => l.top));
    let top = isAnchorPage ? anchorEntry.line.top - ANCHOR_PAD : firstTop - EDGE_PAD;

    // Figures and tables are not text lines; pull them in when they sit in
    // this row's vertical span on this page.
    const boxes = contentBoxes(page).filter((b) => b[3] > top - 2 && b[1] < limit);
    if (!isAnchorPage) {
      for (const b of boxes) if (b[1] >= frame.contentTop) top = Math.min(top, b[1] - EDGE_PAD);
    }
    top = Math.max(top, frame.contentTop);

    let bottom: number;
    if (nextOnPage !== null) {
      bottom = nextOnPage - ANCHOR_PAD;
    } else {
      const contentBottom = Math.max(
        ...lines.map((l) => l.bottom),
        ...boxes.filter((b) => b[3] <= limit + 2).map((b) => b[3]),
      );
      bottom = contentBottom + EDGE_PAD;
    }
    if (trailingOnPage !== null) bottom = Math.min(bottom, trailingOnPage - EDGE_PAD);
    bottom = Math.min(bottom, frame.contentBottom);

    if (bottom - top < MIN_REGION_HEIGHT) continue;
    regions.push({
      page: pageIndex,
      bbox: [round(gutterX), round(top), round(frame.contentRight), round(bottom)],
    });
  }

  return regions.sort((a, b) => a.page - b.page || a.bbox[1] - b.bbox[1]);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
