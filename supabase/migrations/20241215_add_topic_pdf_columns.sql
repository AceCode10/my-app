-- Add PDF URL columns to topics table for topical questions functionality
-- Run this migration in Supabase SQL Editor

-- Add pdf_url column for questions PDF
ALTER TABLE topics ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add answers_pdf_url column for answers PDF
ALTER TABLE topics ADD COLUMN IF NOT EXISTS answers_pdf_url TEXT;

-- Add estimated_time column for estimated completion time in minutes
ALTER TABLE topics ADD COLUMN IF NOT EXISTS estimated_time INTEGER DEFAULT 30;

-- Add question_number column to questions table if not exists
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_number TEXT;

COMMENT ON COLUMN topics.pdf_url IS 'URL to the questions PDF file uploaded by admin';
COMMENT ON COLUMN topics.answers_pdf_url IS 'URL to the answers/mark scheme PDF file';
COMMENT ON COLUMN topics.estimated_time IS 'Estimated time to complete all questions in minutes';
COMMENT ON COLUMN questions.question_number IS 'Question number as displayed (e.g., 1a, 2b, 3)';
