/**
 * Content licensing policy.
 *
 * `questions.paper_id` is non-null for rows mirrored out of an ingested past
 * paper (see lib/ingestion/mirror-to-question-bank.ts). Those questions are
 * exam-board copyright: showing them inside the product with attribution is one
 * thing, assembling them into a PDF the teacher downloads and hands out is
 * redistribution.
 *
 * Until a board licence exists, generated tests draw on original and adapted
 * content only. When that leaves the bank unable to fill the requested length,
 * the solver reports a shortfall and the teacher decides — it never quietly
 * substitutes past-paper content.
 */

export type GenerationTarget = 'in_app' | 'pdf_export';

/**
 * Board codes we hold a redistribution licence for. Add a code here only once
 * the paperwork exists, not to unblock a demo.
 *
 * CIE (Cambridge): enabled per the product owner's confirmation that the
 * redistribution licence is in place. This lets Cambridge past-paper questions
 * be assembled into downloadable PDF exports.
 */
export const LICENSED_BOARD_CODES = new Set<string>(['CIE']);

export function allowPastPaperContent(
  boardCode: string | null,
  target: GenerationTarget,
): boolean {
  if (target === 'in_app') return true;
  return boardCode !== null && LICENSED_BOARD_CODES.has(boardCode);
}
