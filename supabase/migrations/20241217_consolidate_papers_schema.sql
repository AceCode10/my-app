-- ============================================
-- CONSOLIDATE PAPERS SCHEMA
-- Unifies papers and past_papers tables
-- Adds exam_board_id and session columns
-- ============================================

-- Step 1: Add missing columns to past_papers table (the admin table)
-- This is the canonical table we'll use going forward

-- Add session column (May/June, Oct/Nov, etc.)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'past_papers' AND column_name = 'session'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN session TEXT;
    END IF;
END $$;

-- Add exam_board_id foreign key
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'past_papers' AND column_name = 'exam_board_id'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN exam_board_id UUID REFERENCES exam_boards(id);
    END IF;
END $$;

-- Add level column (igcse, alevel, etc.)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'past_papers' AND column_name = 'level'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN level TEXT;
    END IF;
END $$;

-- Add is_specimen flag
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'past_papers' AND column_name = 'is_specimen'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN is_specimen BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add question_paper_url as alias for paper_url (for compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'past_papers' AND column_name = 'question_paper_url'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN question_paper_url TEXT;
    END IF;
END $$;

-- Step 2: Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_past_papers_subject_id ON past_papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_past_papers_year ON past_papers(year);
CREATE INDEX IF NOT EXISTS idx_past_papers_session ON past_papers(session);
CREATE INDEX IF NOT EXISTS idx_past_papers_exam_board_id ON past_papers(exam_board_id);
CREATE INDEX IF NOT EXISTS idx_past_papers_level ON past_papers(level);
CREATE INDEX IF NOT EXISTS idx_past_papers_status ON past_papers(status);

-- Step 3: Create a view that provides compatibility with the old 'papers' table structure
-- This allows existing code to work while we migrate
CREATE OR REPLACE VIEW papers_view AS
SELECT 
    id,
    subject_id,
    title,
    year,
    session,
    paper_number,
    variant,
    COALESCE(question_paper_url, paper_url) as question_paper_url,
    mark_scheme_url,
    examiner_report_url,
    duration_minutes,
    total_marks,
    CASE WHEN status = 'published' THEN true ELSE false END as is_published,
    is_specimen,
    exam_board_id,
    level,
    created_at,
    updated_at
FROM past_papers;

-- Step 4: Enable RLS on past_papers if not already enabled
ALTER TABLE past_papers ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for past_papers
-- Public can view published papers
DROP POLICY IF EXISTS "Public can view published papers" ON past_papers;
CREATE POLICY "Public can view published papers"
    ON past_papers FOR SELECT
    USING (status = 'published');

-- Admins can manage all papers
DROP POLICY IF EXISTS "Admins can manage all papers" ON past_papers;
CREATE POLICY "Admins can manage all papers"
    ON past_papers FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role IN ('super_admin', 'content_moderator') OR users.is_admin = true)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.role IN ('super_admin', 'content_moderator') OR users.is_admin = true)
        )
    );

-- Step 6: Sync paper_url to question_paper_url for existing records
UPDATE past_papers 
SET question_paper_url = paper_url 
WHERE question_paper_url IS NULL AND paper_url IS NOT NULL;

-- Step 7: Add updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_past_papers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS past_papers_updated_at ON past_papers;
CREATE TRIGGER past_papers_updated_at
    BEFORE UPDATE ON past_papers
    FOR EACH ROW
    EXECUTE FUNCTION update_past_papers_updated_at();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Papers schema consolidation complete!' as status;
