-- Add missing columns to questions table for proper question structure
-- These columns mirror the paper_questions table structure

-- Add context_text column for storing parent question context
ALTER TABLE questions ADD COLUMN IF NOT EXISTS context_text TEXT;

-- Add is_context_only column to mark context-only questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_context_only BOOLEAN DEFAULT FALSE;

-- Add needs_answer column to indicate if question requires student answer
ALTER TABLE questions ADD COLUMN IF NOT EXISTS needs_answer BOOLEAN DEFAULT TRUE;

-- Add part_label column for question parts (a, b, c, i, ii, etc.)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS part_label TEXT;

-- Add parent_question_id column for parent/child relationships
ALTER TABLE questions ADD COLUMN IF NOT EXISTS parent_question_id UUID REFERENCES questions(id) ON DELETE SET NULL;

-- Add display_order column for ordering questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Add image_url column if not exists
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for parent_question_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_questions_parent_question_id ON questions(parent_question_id);

-- Create index for display_order
CREATE INDEX IF NOT EXISTS idx_questions_display_order ON questions(display_order);
