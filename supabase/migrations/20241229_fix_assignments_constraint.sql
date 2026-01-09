-- ============================================
-- FIX ASSIGNMENTS CHECK CONSTRAINT
-- The current constraint is preventing inserts with assessment_id
-- ============================================

-- Drop the problematic constraint
ALTER TABLE assignments DROP CONSTRAINT IF EXISTS assignments_check;

-- Add a proper constraint that allows either test_id OR assessment_id (but not both)
ALTER TABLE assignments ADD CONSTRAINT assignments_test_or_assessment_check
  CHECK (
    (test_id IS NOT NULL AND assessment_id IS NULL) OR
    (test_id IS NULL AND assessment_id IS NOT NULL)
  );

-- Also ensure the show_results column exists with proper default
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'show_results'
  ) THEN
    ALTER TABLE assignments ADD COLUMN show_results TEXT DEFAULT 'after_due' 
      CHECK (show_results IN ('immediately', 'after_submit', 'after_due', 'manual'));
  END IF;
END $$;

-- Ensure release_answers_at column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assignments' AND column_name = 'release_answers_at'
  ) THEN
    ALTER TABLE assignments ADD COLUMN release_answers_at TEXT;
  END IF;
END $$;
