-- Add needs_answer column to paper_questions table
-- This field indicates whether a question part requires a student answer
-- (i.e., has answer lines in the original paper)

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'paper_questions' AND column_name = 'needs_answer'
    ) THEN
        ALTER TABLE paper_questions ADD COLUMN needs_answer BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Update existing questions: parts without part_label or with 0 marks are likely context
UPDATE paper_questions 
SET needs_answer = false 
WHERE marks = 0 OR marks IS NULL;

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_paper_questions_needs_answer 
ON paper_questions(paper_id, needs_answer) 
WHERE needs_answer = true;
