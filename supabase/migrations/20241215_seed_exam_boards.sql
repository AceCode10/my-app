-- ============================================
-- SEED EXAM BOARDS TABLE
-- Run this in Supabase SQL Editor
-- ============================================

-- Add missing columns to existing exam_boards table if they don't exist
ALTER TABLE exam_boards ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#3b82f6';
ALTER TABLE exam_boards ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE exam_boards ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE exam_boards ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE exam_boards ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE exam_boards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Clear existing data and insert the 6 supported exam boards
DELETE FROM exam_boards;

INSERT INTO exam_boards (code, name, full_name, description, color, display_order, is_active) VALUES
  ('CIE', 'Cambridge (CIE)', 'Cambridge Assessment International Education', 'International qualifications including IGCSE, AS & A Level', '#dc2626', 1, true),
  ('IB', 'IB', 'International Baccalaureate', 'IB Middle Years Programme (MYP) and Diploma Programme (DP)', '#2563eb', 2, true),
  ('EDEX', 'Edexcel', 'Pearson Edexcel', 'UK and international GCSE, IGCSE, AS & A Level qualifications', '#9333ea', 3, true),
  ('OCR', 'OCR', 'Oxford Cambridge and RSA', 'UK GCSE, AS & A Level qualifications', '#16a34a', 4, true),
  ('AQA', 'AQA', 'Assessment and Qualifications Alliance', 'UK''s largest GCSE and A Level exam board', '#f97316', 5, true),
  ('AP', 'AP', 'Advanced Placement', 'College Board Advanced Placement courses and exams', '#6366f1', 6, true);

-- Add exam_board_id column to subjects table if not exists
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS exam_board_id UUID REFERENCES exam_boards(id);

-- Add level column to subjects table if not exists  
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS level VARCHAR(20);

-- Add exam_board_id column to topics table if not exists
ALTER TABLE topics ADD COLUMN IF NOT EXISTS exam_board_id UUID REFERENCES exam_boards(id);

-- Add level column to topics table if not exists
ALTER TABLE topics ADD COLUMN IF NOT EXISTS level VARCHAR(20);

-- Add exam_board_id column to questions table if not exists
ALTER TABLE questions ADD COLUMN IF NOT EXISTS exam_board_id UUID REFERENCES exam_boards(id);

-- Add level column to questions table if not exists
ALTER TABLE questions ADD COLUMN IF NOT EXISTS level VARCHAR(20);

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_subjects_exam_board ON subjects(exam_board_id);
CREATE INDEX IF NOT EXISTS idx_subjects_level ON subjects(level);
CREATE INDEX IF NOT EXISTS idx_topics_exam_board ON topics(exam_board_id);
CREATE INDEX IF NOT EXISTS idx_topics_level ON topics(level);
CREATE INDEX IF NOT EXISTS idx_questions_exam_board ON questions(exam_board_id);
CREATE INDEX IF NOT EXISTS idx_questions_level ON questions(level);

-- Enable RLS on exam_boards (safe to run multiple times)
ALTER TABLE exam_boards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Public can view exam boards" ON exam_boards;
DROP POLICY IF EXISTS "Admins can manage exam boards" ON exam_boards;

-- Allow public read access to exam_boards
CREATE POLICY "Public can view exam boards" ON exam_boards
  FOR SELECT USING (is_active = true);

-- Allow admins to manage exam boards
CREATE POLICY "Admins can manage exam boards" ON exam_boards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin')
    )
  );

COMMENT ON TABLE exam_boards IS 'Supported exam boards: Cambridge (CIE), IB, Edexcel, OCR, AQA, AP';
