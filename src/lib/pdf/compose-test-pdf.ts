import {
  PDFDocument,
  StandardFonts,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFEmbeddedPage,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';

/**
 * Test PDFs that print past-paper questions exactly as the board laid them
 * out. Each question is drawn from its source regions (see
 * lib/ingestion/structure/regions.ts) as vector content clipped from the
 * original question paper, and renumbered for the test. Content without source
 * regions arrives as pre-rendered PDF chunks and is appended page by page.
 */

/** [x0, top, x1, bottom], PDF points, top-left origin. */
export type Box = [number, number, number, number];

export interface Region {
  page: number;
  bbox: Box;
}

export interface Label {
  page: number;
  x: number;
  top: number;
  bottom: number;
}

export interface SourceQuestion {
  kind: 'source';
  /** The number this question gets in the test. */
  number: number;
  pdfUrl: string;
  /** Every row of the question, in display order. */
  regions: Region[];
  label: Label | null;
}

export interface PdfChunk {
  kind: 'pdf';
  bytes: ArrayBuffer | Uint8Array;
}

export type ComposeItem = SourceQuestion | PdfChunk;

export const A4 = { width: 595.28, height: 841.89 };

export interface Frame {
  width: number;
  height: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Content frame of a question page; the footer sits below `bottom`. */
export const QUESTION_FRAME: Frame = {
  width: A4.width,
  height: A4.height,
  top: 36,
  bottom: A4.height - 52,
  left: 40,
  right: A4.width - 36,
};

/** Space between two questions. */
const QUESTION_GAP = 10;

/**
 * Join regions that continue each other: rows of one question are stored as
 * separate regions that tile the page, and drawing them as one avoids seams
 * and lets a question stay in one piece.
 */
export function mergeContiguous(regions: Region[]): Region[] {
  const out: Region[] = [];
  for (const region of regions) {
    const last = out[out.length - 1];
    if (
      last &&
      last.page === region.page &&
      Math.abs(last.bbox[3] - region.bbox[1]) <= 1.5 &&
      Math.abs(last.bbox[0] - region.bbox[0]) <= 1 &&
      Math.abs(last.bbox[2] - region.bbox[2]) <= 1
    ) {
      last.bbox = [last.bbox[0], last.bbox[1], last.bbox[2], region.bbox[3]];
    } else {
      out.push({ page: region.page, bbox: [...region.bbox] as Box });
    }
  }
  return out;
}

export interface Placement {
  /** Index of the question in the input list. */
  question: number;
  /** Index into that question's merged regions. */
  region: number;
  /** Output page, 0-based among the laid-out pages. */
  page: number;
  /** Target top-left, top-left origin. */
  x: number;
  y: number;
  scale: number;
}

/**
 * Stack regions down the page. A region is never split; one that does not fit
 * starts a new page, and one taller or wider than the frame is scaled down.
 * Regions keep their original x so the paper's indents survive.
 */
export function layoutRegions(
  questions: { regions: Region[] }[],
  frame: Frame = QUESTION_FRAME,
): { placements: Placement[]; pageCount: number } {
  const placements: Placement[] = [];
  const maxWidth = frame.right - frame.left;
  const maxHeight = frame.bottom - frame.top;
  let page = 0;
  let y = frame.top;
  let used = false;

  questions.forEach((question, qi) => {
    if (used) y += QUESTION_GAP;
    question.regions.forEach((region, ri) => {
      const [x0, top, x1, bottom] = region.bbox;
      const width = x1 - x0;
      const height = bottom - top;
      const scale = Math.min(1, maxWidth / width, maxHeight / height);
      const h = height * scale;

      if (used && y + h > frame.bottom) {
        page += 1;
        y = frame.top;
      }
      const x = scale < 1 ? frame.left : Math.max(frame.left - 25, Math.min(x0, frame.right - width));
      placements.push({ question: qi, region: ri, page, x, y, scale });
      y += h;
      used = true;
    });
  });

  return { placements, pageCount: used ? page + 1 : 0 };
}

export interface ComposeOptions {
  /** Cover page(s), copied first and left without a footer. */
  cover?: ArrayBuffer | Uint8Array;
  items: ComposeItem[];
  /** Footer text; "Page N" is added on the left. */
  footer?: { center: string; right: string };
  fetchPdf?: (url: string) => Promise<ArrayBuffer>;
}

const defaultFetch = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load the source paper (${response.status}): ${url}`);
  return response.arrayBuffer();
};

export async function composeTestPdf(options: ComposeOptions): Promise<Uint8Array> {
  const { cover, items, footer, fetchPdf = defaultFetch } = options;
  const out = await PDFDocument.create();
  const bold = await out.embedFont(StandardFonts.HelveticaBold);
  const regular = await out.embedFont(StandardFonts.Helvetica);

  let coverPageCount = 0;
  if (cover) {
    const coverDoc = await PDFDocument.load(cover);
    const pages = await out.copyPages(coverDoc, coverDoc.getPageIndices());
    pages.forEach((p) => out.addPage(p));
    coverPageCount = pages.length;
  }

  // One load per source paper and one embed per source page, however many
  // regions are drawn from it.
  const sources = new Map<string, Promise<PDFDocument>>();
  const embedded = new Map<string, Promise<PDFEmbeddedPage>>();
  const embed = (url: string, pageIndex: number) => {
    const key = `${url}#${pageIndex}`;
    if (!embedded.has(key)) {
      if (!sources.has(url)) sources.set(url, fetchPdf(url).then((b) => PDFDocument.load(b)));
      embedded.set(
        key,
        sources.get(url)!.then((doc) => {
          if (pageIndex >= doc.getPageCount()) throw new Error(`Page ${pageIndex + 1} is missing from ${url}`);
          return out.embedPage(doc.getPage(pageIndex));
        }),
      );
    }
    return embedded.get(key)!;
  };

  // Consecutive source questions share pages; a chunk always starts a page.
  let run: SourceQuestion[] = [];
  const flush = async () => {
    if (run.length === 0) return;
    await drawSourceRun(out, run, embed, bold);
    run = [];
  };

  for (const item of items) {
    if (item.kind === 'source') {
      run.push(item);
      continue;
    }
    await flush();
    const chunk = await PDFDocument.load(item.bytes);
    const pages = await out.copyPages(chunk, chunk.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  await flush();

  if (footer) {
    out.getPages().forEach((page, index) => {
      if (index < coverPageCount) return;
      drawFooter(page, index + 1, footer, regular);
    });
  }

  return out.save();
}

async function drawSourceRun(
  out: PDFDocument,
  questions: SourceQuestion[],
  embed: (url: string, page: number) => Promise<PDFEmbeddedPage>,
  bold: PDFFont,
) {
  const merged = questions.map((q) => ({ ...q, regions: mergeContiguous(q.regions) }));
  const { placements, pageCount } = layoutRegions(merged);
  const pages: PDFPage[] = [];
  for (let i = 0; i < pageCount; i += 1) pages.push(out.addPage([A4.width, A4.height]));

  for (const placement of placements) {
    const question = merged[placement.question];
    const region = question.regions[placement.region];
    const source = await embed(question.pdfUrl, region.page);
    const target = pages[placement.page];
    const [x0, top, x1, bottom] = region.bbox;
    const s = placement.scale;
    const w = (x1 - x0) * s;
    const h = (bottom - top) * s;
    const targetTop = A4.height - placement.y; // PDF y of the region's top edge

    // Source point (sx, sy) maps to (px + s*sx, py + s*(srcHeight - sy)).
    const px = placement.x - s * x0;
    const py = targetTop - s * (source.height - top);

    target.pushOperators(pushGraphicsState(), rectangle(placement.x, targetTop - h, w, h), clip(), endPath());
    target.drawPage(source, { x: px, y: py, xScale: s, yScale: s });
    target.pushOperators(popGraphicsState());

    const label = question.label;
    if (label && label.page === region.page && label.top >= top - 1 && label.top <= bottom) {
      const baseline = targetTop - s * (label.top - top) - s * (label.bottom - label.top) * 0.82;
      target.drawText(String(question.number), {
        x: Math.max(18, placement.x - s * (x0 - label.x)),
        y: baseline,
        size: 11 * s,
        font: bold,
        color: rgb(0, 0, 0),
      });
    }
  }
}

function drawFooter(page: PDFPage, pageNumber: number, footer: { center: string; right: string }, font: PDFFont) {
  const { width } = page.getSize();
  const y = 24;
  const grey = rgb(0.4, 0.4, 0.4);
  page.drawLine({
    start: { x: QUESTION_FRAME.left, y: y + 12 },
    end: { x: width - QUESTION_FRAME.left, y: y + 12 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });
  page.drawText(`Page ${pageNumber}`, { x: QUESTION_FRAME.left, y, size: 8, font, color: grey });
  const centerWidth = font.widthOfTextAtSize(footer.center, 8);
  page.drawText(footer.center, { x: (width - centerWidth) / 2, y, size: 8, font, color: grey });
  const rightWidth = font.widthOfTextAtSize(footer.right, 8);
  page.drawText(footer.right, { x: width - QUESTION_FRAME.left - rightWidth, y, size: 8, font, color: rgb(0.09, 0.64, 0.29) });
}
