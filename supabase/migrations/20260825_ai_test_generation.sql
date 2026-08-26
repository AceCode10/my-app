-- AI Test Builder — Phase 1
-- Provenance columns on assessments, empirical timing calibration, solver indexes.
-- See docs/ai-test-builder-spec.md

-- ---------------------------------------------------------------------------
-- 1. Generation provenance
-- ---------------------------------------------------------------------------

ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_prompt TEXT,
  ADD COLUMN IF NOT EXISTS generation_metadata JSONB;

COMMENT ON COLUMN assessments.generation_metadata IS
  'Resolved TestSpec + solver diagnostics + seed. Enables deterministic regeneration.';

CREATE INDEX IF NOT EXISTS assessments_ai_generated_idx
  ON assessments (created_by, created_at DESC)
  WHERE ai_generated = true;

-- ---------------------------------------------------------------------------
-- 2. Timing calibration
--
-- Marks per minute varies by component (Bio 0610 P4 is ~1.07, ICT 0417 P2 is
-- ~0.59). Derive it from the papers already ingested rather than hardcoding a
-- constant. Subjects with fewer than 3 sampled papers fall back to 1.0 in code.
-- ---------------------------------------------------------------------------

CREATE MATERIALIZED VIEW IF NOT EXISTS subject_timing_calibration AS
SELECT
  subject_id,
  COALESCE(component_code, '') AS component_code,
  COALESCE(level, '')          AS level,
  SUM(total_marks)::numeric / NULLIF(SUM(duration_minutes), 0) AS marks_per_minute,
  COUNT(*) AS sample_papers
FROM past_papers
WHERE total_marks > 0
  AND duration_minutes > 0
  AND status = 'published'
  AND subject_id IS NOT NULL
GROUP BY subject_id, COALESCE(component_code, ''), COALESCE(level, '')
HAVING COUNT(*) >= 3;

-- Unique index is required for REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS subject_timing_calibration_key
  ON subject_timing_calibration (subject_id, component_code, level);

COMMENT ON MATERIALIZED VIEW subject_timing_calibration IS
  'Empirical marks-per-minute per subject/component. Refresh after paper ingestion.';

-- ---------------------------------------------------------------------------
-- 3. Solver hot path
--
-- The pool fetch reads root questions only, then their descendants by parent id.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS questions_solver_pool_idx
  ON questions (subject_id, status, exam_board_id, level)
  WHERE parent_question_id IS NULL;

CREATE INDEX IF NOT EXISTS questions_parent_idx
  ON questions (parent_question_id)
  WHERE parent_question_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Read access to the calibration view
-- ---------------------------------------------------------------------------

GRANT SELECT ON subject_timing_calibration TO authenticated;
