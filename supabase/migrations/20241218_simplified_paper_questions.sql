-- ============================================
-- SIMPLIFIED PAPER QUESTIONS SCHEMA
-- Uses the same pattern as topical questions
-- Just adds paper_id to the existing questions table
-- ============================================

-- Add paper_id column to questions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'paper_id'
    ) THEN
        ALTER TABLE questions ADD COLUMN paper_id UUID REFERENCES past_papers(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_questions_paper_id ON questions(paper_id);
    END IF;
END $$;

-- Add section_name column for paper questions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'section_name'
    ) THEN
        ALTER TABLE questions ADD COLUMN section_name TEXT;
    END IF;
END $$;

-- Add part_label column for paper questions (e.g., "a", "b", "i", "ii")
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'part_label'
    ) THEN
        ALTER TABLE questions ADD COLUMN part_label TEXT;
    END IF;
END $$;

-- Add mark_scheme column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'mark_scheme'
    ) THEN
        ALTER TABLE questions ADD COLUMN mark_scheme TEXT;
    END IF;
END $$;

-- Add image_url column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'image_url'
    ) THEN
        ALTER TABLE questions ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Create a view for paper questions (for convenience)
CREATE OR REPLACE VIEW paper_questions_view AS
SELECT 
    q.*,
    pp.title as paper_title,
    pp.year as paper_year,
    pp.session as paper_session,
    pp.paper_number,
    pp.subject_id as paper_subject_id
FROM questions q
JOIN past_papers pp ON q.paper_id = pp.id
WHERE q.paper_id IS NOT NULL;

SELECT '✅ Simplified paper questions schema applied!' as status;
