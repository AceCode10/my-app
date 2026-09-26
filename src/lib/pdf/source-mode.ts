import type { Label, Region, SourceQuestion } from './compose-test-pdf';

/**
 * Decide which test questions print from the original paper (clipped source
 * regions) and which fall back to the text renderer.
 *
 * A question group prints from source only when every row that carries marks
 * has regions, every row comes from one paper whose PDF we know, and that
 * paper's board is licensed for PDF export. Anything less would silently drop
 * a part, so it falls back to text.
 */

export interface SourceRow {
  marks: number;
  stem?: string | null;
  paper_id?: string | null;
  exam_board_id?: string | null;
  source_regions?: Region[] | null;
  source_label?: Label | null;
}

export interface SourceContext {
  /** paper_id -> question paper PDF URL */
  paperUrls: Map<string, string>;
  /** exam_board_id -> whether PDF export of its past papers is licensed */
  licensedBoards: (examBoardId: string | null | undefined) => boolean;
}

/** A zero-mark row without regions may be skipped only if it has no real text of its own. */
const MAX_UNPRINTED_CONTEXT_CHARS = 20;

export function toSourceQuestion(
  number: number,
  rows: SourceRow[],
  context: SourceContext,
): SourceQuestion | null {
  if (rows.length === 0) return null;

  const paperIds = new Set(rows.map((r) => r.paper_id ?? null));
  if (paperIds.size !== 1) return null;
  const paperId = rows[0].paper_id;
  if (!paperId) return null;
  const pdfUrl = context.paperUrls.get(paperId);
  if (!pdfUrl) return null;
  if (!rows.every((r) => context.licensedBoards(r.exam_board_id))) return null;

  const regions: Region[] = [];
  for (const row of rows) {
    const rowRegions = Array.isArray(row.source_regions) ? row.source_regions : [];
    if (rowRegions.length === 0) {
      if (row.marks > 0) return null;
      if ((row.stem ?? '').trim().length > MAX_UNPRINTED_CONTEXT_CHARS) return null;
      continue;
    }
    regions.push(...rowRegions);
  }
  if (regions.length === 0) return null;

  const label = rows.find((r) => r.source_label)?.source_label ?? null;
  return { kind: 'source', number, pdfUrl, regions, label };
}
