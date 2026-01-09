-- ============================================
-- ASSESSMENT TYPES TABLE
-- Lookup table for different assessment types
-- ============================================

-- Create assessment_types table if not exists
CREATE TABLE IF NOT EXISTS assessment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default assessment types
INSERT INTO assessment_types (code, name, description) VALUES
  ('full_paper', 'Full Paper', 'Complete past paper exam'),
  ('topical', 'Topical Quiz', 'Topic-specific practice questions'),
  ('quiz', 'Quiz', 'Quick assessment or practice quiz'),
  ('flashcard', 'Flashcard', 'Flashcard-based learning'),
  ('custom_test', 'Custom Test', 'Teacher-created custom test')
ON CONFLICT (code) DO NOTHING;

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_assessment_types_code ON assessment_types(code);

-- Enable RLS
ALTER TABLE assessment_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Assessment types are readable by everyone
CREATE POLICY "Assessment types are viewable by everyone" ON assessment_types
  FOR SELECT USING (true);

-- Only admins can insert/update/delete assessment types
CREATE POLICY "Only admins can modify assessment types" ON assessment_types
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'content_moderator')
    )
  );

-- ============================================
-- VERIFY ASSESSMENTS TABLE
-- Ensure all required columns exist
-- ============================================

-- Add assessment_type_id if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' AND column_name = 'assessment_type_id'
  ) THEN
    ALTER TABLE assessments ADD COLUMN assessment_type_id UUID REFERENCES assessment_types(id);
  END IF;
END $$;

-- Add other required columns if missing
DO $$ 
BEGIN
  -- Instructions column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' AND column_name = 'instructions'
  ) THEN
    ALTER TABLE assessments ADD COLUMN instructions TEXT;
  END IF;

  -- Calculator allowed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' AND column_name = 'calculator_allowed'
  ) THEN
    ALTER TABLE assessments ADD COLUMN calculator_allowed BOOLEAN DEFAULT false;
  END IF;

  -- Max attempts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' AND column_name = 'max_attempts'
  ) THEN
    ALTER TABLE assessments ADD COLUMN max_attempts INTEGER DEFAULT 1;
  END IF;

  -- Show results
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' AND column_name = 'show_results'
  ) THEN
    ALTER TABLE assessments ADD COLUMN show_results TEXT DEFAULT 'immediately';
  END IF;

  -- Randomize questions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' AND column_name = 'randomize_questions'
  ) THEN
    ALTER TABLE assessments ADD COLUMN randomize_questions BOOLEAN DEFAULT false;
  END IF;

  -- Randomize answers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' AND column_name = 'randomize_answers'
  ) THEN
    ALTER TABLE assessments ADD COLUMN randomize_answers BOOLEAN DEFAULT false;
  END IF;

  -- Is template
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' AND column_name = 'is_template'
  ) THEN
    ALTER TABLE assessments ADD COLUMN is_template BOOLEAN DEFAULT false;
  END IF;

  -- Archived at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'assessments' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE assessments ADD COLUMN archived_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- VERIFY ASSESSMENT_QUESTIONS TABLE
-- Ensure junction table has all required columns
-- ============================================

-- Create assessment_questions table if not exists
CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_order INTEGER NOT NULL DEFAULT 1,
  section_name TEXT,
  section_instructions TEXT,
  custom_question_text TEXT,
  custom_marks INTEGER,
  custom_mark_scheme TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assessment_id, question_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_question ON assessment_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_order ON assessment_questions(assessment_id, question_order);

-- Enable RLS
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view assessment questions for published assessments" ON assessment_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND (
        assessments.is_published = true
        OR assessments.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Teachers can manage their assessment questions" ON assessment_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND assessments.created_by = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTION: Get Assessment Type ID
-- ============================================

CREATE OR REPLACE FUNCTION get_assessment_type_id(type_code TEXT)
RETURNS UUID AS $$
DECLARE
  type_id UUID;
BEGIN
  SELECT id INTO type_id
  FROM assessment_types
  WHERE code = type_code;
  
  RETURN type_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE assessment_types IS 'Lookup table for different types of assessments (quiz, test, paper, etc.)';
COMMENT ON TABLE assessment_questions IS 'Junction table linking assessments to questions with ordering and customization';
COMMENT ON FUNCTION get_assessment_type_id IS 'Helper function to get assessment type ID by code';
