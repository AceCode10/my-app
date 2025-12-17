-- ============================================
-- Topical Questions Schema Updates
-- Adds missing columns for full content management
-- ============================================

-- ============================================
-- TOPICS TABLE UPDATES
-- ============================================

-- Add display_order column (rename from ordering for consistency)
ALTER TABLE topics ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Migrate existing ordering data if it exists
UPDATE topics SET display_order = ordering WHERE display_order = 0 AND ordering IS NOT NULL AND ordering > 0;

-- Add PDF storage columns
ALTER TABLE topics ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS answers_pdf_url TEXT;

-- Add estimated time for practice
ALTER TABLE topics ADD COLUMN IF NOT EXISTS estimated_time INTEGER;

-- Add status column
ALTER TABLE topics ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'));

-- Add exam board reference (UUID foreign key)
ALTER TABLE topics ADD COLUMN IF NOT EXISTS exam_board_id UUID REFERENCES exam_boards(id) ON DELETE SET NULL;

-- Add level column
ALTER TABLE topics ADD COLUMN IF NOT EXISTS level TEXT;

-- Create index for display_order
CREATE INDEX IF NOT EXISTS idx_topics_display_order ON topics(subject_id, display_order);

-- ============================================
-- QUESTIONS TABLE UPDATES
-- ============================================

-- Add stem_markdown as alias/new column (keep stem_md for backward compatibility)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS stem_markdown TEXT;

-- Migrate existing stem_md data to stem_markdown
UPDATE questions SET stem_markdown = stem_md WHERE stem_markdown IS NULL AND stem_md IS NOT NULL;

-- Add status column (maps to visibility)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'));

-- Migrate visibility to status
UPDATE questions SET status = visibility WHERE status IS NULL AND visibility IS NOT NULL;

-- Add exam_board_id as UUID reference
ALTER TABLE questions ADD COLUMN IF NOT EXISTS exam_board_id UUID REFERENCES exam_boards(id) ON DELETE SET NULL;

-- Add level column
ALTER TABLE questions ADD COLUMN IF NOT EXISTS level TEXT;

-- Add explanation column
ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation TEXT;

-- Add question_number column
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_number TEXT;

-- Make examiner_comment nullable (it was NOT NULL which causes insert issues)
ALTER TABLE questions ALTER COLUMN examiner_comment DROP NOT NULL;

-- Update question_type check constraint to include more types
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
ALTER TABLE questions ADD CONSTRAINT questions_question_type_check 
  CHECK (question_type IN ('mcq', 'multiple_choice', 'tf', 'true_false', 'numeric', 'short_answer', 'long_answer', 'fill_blank', 'essay'));

-- Update difficulty check constraint
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_difficulty_check;
ALTER TABLE questions ADD CONSTRAINT questions_difficulty_check 
  CHECK (difficulty IN ('easy', 'medium', 'hard', 'very_hard'));

-- ============================================
-- STORAGE BUCKET FOR PDFs
-- ============================================
-- Note: Run this in Supabase Dashboard > Storage > Create bucket
-- Bucket name: topical-pdfs
-- Public: Yes (for public access to PDFs)

-- ============================================
-- RLS POLICIES FOR TOPICS
-- ============================================

-- Allow public read access to published topics
DROP POLICY IF EXISTS "Public can view published topics" ON topics;
CREATE POLICY "Public can view published topics" ON topics
  FOR SELECT USING (status = 'published' OR status IS NULL);

-- Allow admins full access to topics
DROP POLICY IF EXISTS "Admins can manage topics" ON topics;
CREATE POLICY "Admins can manage topics" ON topics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'content_moderator')
    )
  );

-- ============================================
-- RLS POLICIES FOR QUESTIONS
-- ============================================

-- Drop ALL existing question policies to avoid conflicts
DROP POLICY IF EXISTS "Public can view published questions" ON questions;
DROP POLICY IF EXISTS "Public can view questions" ON questions;
DROP POLICY IF EXISTS "Anyone can view published questions" ON questions;
DROP POLICY IF EXISTS "Admins can create questions" ON questions;
DROP POLICY IF EXISTS "Admins can update questions" ON questions;
DROP POLICY IF EXISTS "Super admins can delete questions" ON questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Admins can manage all questions" ON questions;

-- Allow ANYONE (including anonymous) to view published questions
CREATE POLICY "Public can view questions" ON questions
  FOR SELECT USING (visibility = 'published' OR visibility IS NULL);

-- Allow admins full access to questions (CRUD)
CREATE POLICY "Admins can manage questions" ON questions
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'content_moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'content_moderator')
    )
  );
