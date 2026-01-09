-- ============================================
-- ADD PARENT_QUESTION FIELD FOR MULTI-PART QUESTIONS
-- Enables proper hierarchy and display of nested questions
-- ============================================

-- Add parent_question_id field to track question hierarchy
ALTER TABLE paper_questions 
ADD COLUMN IF NOT EXISTS parent_question_id UUID REFERENCES paper_questions(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_paper_questions_parent ON paper_questions(parent_question_id);

-- Add display_order for consistent ordering within a question
ALTER TABLE paper_questions 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_paper_questions_display_order ON paper_questions(paper_id, question_number, display_order);

-- Add comment
COMMENT ON COLUMN paper_questions.parent_question_id IS 'References parent question for multi-part questions (e.g., Q2a(i) has parent Q2a)';
COMMENT ON COLUMN paper_questions.display_order IS 'Order within the same question number for consistent display';

SELECT 'Parent question field added successfully!' as status;
