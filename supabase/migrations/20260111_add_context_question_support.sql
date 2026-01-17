-- ============================================
-- ADD CONTEXT QUESTION SUPPORT
-- Enables context/stem questions that provide shared context for sub-parts
-- e.g., "Describe the following types of malware:" followed by (a) adware, (b) ransomware
-- ============================================

-- Add context_text field for shared context that appears before sub-questions
ALTER TABLE paper_questions 
ADD COLUMN IF NOT EXISTS context_text TEXT;

-- Add is_context_only flag for questions that only provide context (no marks)
ALTER TABLE paper_questions 
ADD COLUMN IF NOT EXISTS is_context_only BOOLEAN DEFAULT FALSE;

-- Add comments
COMMENT ON COLUMN paper_questions.context_text IS 'Shared context text that appears before this question (e.g., "Describe the following types of malware:")';
COMMENT ON COLUMN paper_questions.is_context_only IS 'If true, this question only provides context for sub-parts and has no marks';

-- Create index for context-only questions
CREATE INDEX IF NOT EXISTS idx_paper_questions_context ON paper_questions(paper_id, is_context_only) WHERE is_context_only = TRUE;

SELECT 'Context question support added successfully!' as status;
