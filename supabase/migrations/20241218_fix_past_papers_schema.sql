-- ============================================
-- FIX PAST PAPERS TABLE SCHEMA
-- Ensures all required columns exist
-- ============================================

-- Add missing columns to past_papers table if they don't exist

-- Core identification columns
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS exam_board TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS year INTEGER;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS session TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS paper_number TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS variant TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS component_code TEXT;

-- Paper metadata
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS total_marks INTEGER;

-- File URLs
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS paper_url TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS question_paper_url TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS mark_scheme_url TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS examiner_report_url TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS insert_url TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS grade_thresholds_url TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS specimen_url TEXT;
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS source_files_url TEXT;

-- Status and metadata
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_past_papers_exam_board ON past_papers(exam_board);
CREATE INDEX IF NOT EXISTS idx_past_papers_year ON past_papers(year);
CREATE INDEX IF NOT EXISTS idx_past_papers_subject ON past_papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_past_papers_status ON past_papers(status);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Past papers schema updated!' as status;
