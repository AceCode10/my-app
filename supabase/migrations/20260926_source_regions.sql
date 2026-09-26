-- Source regions: where each ingested question sits in its original question
-- paper, so tests can print it exactly as the board laid it out.
--
-- source_regions: [{ "page": <0-based>, "bbox": [x0, top, x1, bottom] }] in PDF
--   points, top-left origin. One entry per page the row spans. Regions of
--   consecutive rows tile the page; x0 is just right of the question number.
-- source_label:   { "page", "x", "top", "bottom" } of the printed question
--   number, on rows that print one.
--
-- questions rows reach the PDF through paper_id -> past_papers.question_paper_url.

ALTER TABLE paper_questions ADD COLUMN IF NOT EXISTS source_regions JSONB;
ALTER TABLE paper_questions ADD COLUMN IF NOT EXISTS source_label   JSONB;

ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_regions JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_label   JSONB;

COMMENT ON COLUMN paper_questions.source_regions IS
  'Per-page rectangles of the source question paper for this row: [{page, bbox:[x0,top,x1,bottom]}], PDF points, top-left origin, 0-based page.';
COMMENT ON COLUMN paper_questions.source_label IS
  'Position of the printed question number {page, x, top, bottom}; null on part rows.';
COMMENT ON COLUMN questions.source_regions IS
  'Mirror of paper_questions.source_regions for bank rows ingested from a past paper.';
COMMENT ON COLUMN questions.source_label IS
  'Mirror of paper_questions.source_label.';

SELECT 'Source regions columns added successfully!' as status;
