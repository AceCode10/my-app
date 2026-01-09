-- ============================================
-- ADD LEVEL SELECTION TO USERS
-- ============================================
-- Users can select their education level (IGCSE, A-Level, IB, etc.)
-- This helps customize content to their needs

-- Add levels column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'levels'
  ) THEN
    ALTER TABLE users ADD COLUMN levels TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Create levels reference table
CREATE TABLE IF NOT EXISTS education_levels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  exam_boards TEXT[] DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE education_levels ENABLE ROW LEVEL SECURITY;

-- Everyone can read levels
DROP POLICY IF EXISTS "Anyone can view education levels" ON education_levels;
CREATE POLICY "Anyone can view education levels" ON education_levels
  FOR SELECT TO authenticated
  USING (true);

-- Insert default education levels
INSERT INTO education_levels (id, name, description, exam_boards, display_order) VALUES
  ('igcse', 'IGCSE', 'International General Certificate of Secondary Education (Ages 14-16)', ARRAY['cambridge', 'edexcel'], 1),
  ('gcse', 'GCSE', 'General Certificate of Secondary Education (Ages 14-16)', ARRAY['aqa', 'ocr', 'edexcel'], 2),
  ('as_level', 'AS Level', 'Advanced Subsidiary Level (Ages 16-17)', ARRAY['cambridge', 'edexcel', 'aqa', 'ocr'], 3),
  ('a_level', 'A Level', 'Advanced Level (Ages 16-18)', ARRAY['cambridge', 'edexcel', 'aqa', 'ocr'], 4),
  ('ib_myp', 'IB MYP', 'International Baccalaureate Middle Years Programme (Ages 11-16)', ARRAY['ib'], 5),
  ('ib_dp', 'IB DP', 'International Baccalaureate Diploma Programme (Ages 16-19)', ARRAY['ib'], 6),
  ('ap', 'AP', 'Advanced Placement (High School)', ARRAY['ap'], 7)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  exam_boards = EXCLUDED.exam_boards,
  display_order = EXCLUDED.display_order;

-- Add level column to subjects table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subjects' AND column_name = 'level'
  ) THEN
    ALTER TABLE subjects ADD COLUMN level TEXT;
  END IF;
END $$;

-- Add level column to questions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'level'
  ) THEN
    ALTER TABLE questions ADD COLUMN level TEXT;
  END IF;
END $$;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_levels ON users USING GIN (levels);
CREATE INDEX IF NOT EXISTS idx_subjects_level ON subjects (level);
CREATE INDEX IF NOT EXISTS idx_questions_level ON questions (level);
