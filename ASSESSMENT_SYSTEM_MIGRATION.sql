-- ============================================
-- ASSESSMENT & TEST BUILDER SYSTEM MIGRATION
-- Complete schema for educational assessments
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 0. ENSURE EXAM BOARDS TABLE EXISTS
-- ============================================

-- Create exam_boards table if it doesn't exist (needed for foreign keys)
CREATE TABLE IF NOT EXISTS exam_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 1. ASSESSMENT TYPES
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- 'full_paper', 'topical', 'quiz', 'flashcard', 'custom_test'
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed assessment types
INSERT INTO assessment_types (code, name, description) VALUES
('full_paper', 'Full Paper Exam', 'Complete past examination papers with official mark schemes'),
('topical', 'Topical Questions', 'Questions organized by specific topics for targeted practice'),
('quiz', 'Quick Quiz', 'Short, focused assessments for knowledge checks'),
('flashcard', 'Flashcards', 'Spaced repetition learning cards'),
('custom_test', 'Custom Test', 'Teacher-created tests from question bank')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 2. ENHANCED QUESTIONS TABLE
-- ============================================

-- Add new columns to existing questions table
-- Add exam_board_id if it doesn't exist
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS exam_board_id UUID REFERENCES exam_boards(id);

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard'));

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS question_type TEXT CHECK (question_type IN ('mcq', 'short_answer', 'essay', 'calculation', 'true_false', 'fill_in_blank'));

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS marks INTEGER DEFAULT 1;

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS estimated_time_minutes DECIMAL(4,1);

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS keywords TEXT[];

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS explanation TEXT;

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS correct_answer TEXT;

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS mark_scheme TEXT;

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS examiner_comments TEXT;

-- Indexes for questions
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_keywords ON questions USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_questions_exam_board ON questions(exam_board_id);

-- ============================================
-- 3. QUESTION CHOICES (for MCQ)
-- ============================================

CREATE TABLE IF NOT EXISTS question_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  choice_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  choice_order INTEGER NOT NULL,
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_question_choices_question ON question_choices(question_id);

-- ============================================
-- 4. ASSESSMENTS (Main assessment table)
-- ============================================

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_type_id UUID NOT NULL REFERENCES assessment_types(id),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  
  -- Relationships
  subject_id UUID REFERENCES subjects(id),
  exam_board_id UUID REFERENCES exam_boards(id),
  topic_id UUID REFERENCES topics(id),
  
  -- Assessment configuration
  duration_minutes INTEGER,
  total_marks INTEGER,
  passing_marks INTEGER,
  
  -- For past papers
  exam_year INTEGER,
  exam_series TEXT, -- 'May/June', 'Oct/Nov', 'Feb/March'
  paper_variant TEXT, -- 'Paper 1', 'Paper 2', 'Paper 3'
  paper_file_url TEXT,
  mark_scheme_url TEXT,
  examiner_report_url TEXT,
  
  -- For custom tests
  created_by UUID REFERENCES users(id),
  is_template BOOLEAN DEFAULT false,
  randomize_questions BOOLEAN DEFAULT false,
  randomize_answers BOOLEAN DEFAULT false,
  calculator_allowed BOOLEAN DEFAULT true,
  max_attempts INTEGER DEFAULT 1,
  show_results TEXT CHECK (show_results IN ('immediately', 'after_deadline', 'manual')) DEFAULT 'immediately',
  
  -- Visibility and status
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for assessments
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(assessment_type_id);
CREATE INDEX IF NOT EXISTS idx_assessments_subject_board ON assessments(subject_id, exam_board_id);
CREATE INDEX IF NOT EXISTS idx_assessments_topic ON assessments(topic_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);
CREATE INDEX IF NOT EXISTS idx_assessments_published ON assessments(is_published, archived_at);

-- ============================================
-- 5. ASSESSMENT QUESTIONS (Junction table)
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  
  -- Position and organization
  question_order INTEGER NOT NULL,
  section_name TEXT,
  section_instructions TEXT,
  
  -- Custom overrides for teacher-modified questions
  custom_question_text TEXT,
  custom_marks INTEGER,
  custom_mark_scheme TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(assessment_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_question ON assessment_questions(question_id);

-- ============================================
-- 6. ASSESSMENT ATTEMPTS (Student attempts)
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  
  -- Scoring
  score DECIMAL(5,2),
  percentage DECIMAL(5,2),
  max_score INTEGER,
  
  -- Status
  status TEXT CHECK (status IN ('in_progress', 'submitted', 'graded', 'abandoned')) DEFAULT 'in_progress',
  attempt_number INTEGER DEFAULT 1,
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for attempts
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment ON assessment_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_status ON assessment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user_assessment ON assessment_attempts(user_id, assessment_id);

-- ============================================
-- 7. ASSESSMENT ANSWERS (Student answers)
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  
  -- Answer data
  answer_text TEXT,
  selected_choice_id UUID REFERENCES question_choices(id),
  answer_file_url TEXT,
  
  -- Scoring
  is_correct BOOLEAN,
  marks_awarded DECIMAL(4,1),
  max_marks DECIMAL(4,1),
  
  -- Teacher feedback
  teacher_feedback TEXT,
  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMPTZ,
  
  -- Metadata
  flagged_for_review BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(attempt_id, question_id)
);

-- Indexes for answers
CREATE INDEX IF NOT EXISTS idx_assessment_answers_attempt ON assessment_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_assessment_answers_question ON assessment_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_assessment_answers_flagged ON assessment_answers(flagged_for_review) WHERE flagged_for_review = true;

-- ============================================
-- 8. FLASHCARD PROGRESS (Spaced repetition)
-- ============================================

CREATE TABLE IF NOT EXISTS flashcard_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  question_id UUID NOT NULL REFERENCES questions(id),
  
  confidence_level TEXT CHECK (confidence_level IN ('dont_know', 'need_practice', 'got_it', 'mastered')) DEFAULT 'dont_know',
  review_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, question_id)
);

-- Indexes for flashcard progress
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_user ON flashcard_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_next_review ON flashcard_progress(user_id, next_review_at);

-- ============================================
-- 9. CLASSES (Teacher classes)
-- ============================================

-- Check if classes table exists and handle accordingly
DO $$ 
BEGIN
    -- If table doesn't exist, create it
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'classes') THEN
        CREATE TABLE classes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          description TEXT,
          subject_id UUID REFERENCES subjects(id),
          exam_board_id UUID REFERENCES exam_boards(id),
          teacher_id UUID NOT NULL REFERENCES users(id),
          class_code TEXT UNIQUE NOT NULL,
          academic_year TEXT,
          is_active BOOLEAN DEFAULT true,
          
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- If table exists, add missing columns
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'classes' AND column_name = 'class_code'
        ) THEN
            ALTER TABLE classes ADD COLUMN class_code TEXT;
            -- Add unique constraint separately
            ALTER TABLE classes ADD CONSTRAINT classes_class_code_key UNIQUE (class_code);
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'classes' AND column_name = 'description'
        ) THEN
            ALTER TABLE classes ADD COLUMN description TEXT;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'classes' AND column_name = 'is_active'
        ) THEN
            ALTER TABLE classes ADD COLUMN is_active BOOLEAN DEFAULT true;
        END IF;
    END IF;
END $$;

-- Indexes for classes
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(class_code);
CREATE INDEX IF NOT EXISTS idx_classes_subject_board ON classes(subject_id, exam_board_id);

-- ============================================
-- 10. CLASS STUDENTS (Class enrollment)
-- ============================================

CREATE TABLE IF NOT EXISTS class_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(class_id, student_id)
);

-- Indexes for class students
CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);

-- ============================================
-- 11. ASSESSMENT ASSIGNMENTS (Assign to classes)
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id),
  class_id UUID REFERENCES classes(id),
  student_id UUID REFERENCES users(id), -- for individual assignments
  
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  available_from TIMESTAMPTZ DEFAULT NOW(),
  
  -- Display settings
  show_results TEXT CHECK (show_results IN ('immediately', 'after_deadline', 'manual')) DEFAULT 'immediately',
  results_released_at TIMESTAMPTZ,
  
  -- Notifications
  notify_students BOOLEAN DEFAULT true,
  notification_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (class_id IS NOT NULL OR student_id IS NOT NULL)
);

-- Indexes for assignments
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_assessment ON assessment_assignments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_class ON assessment_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_student ON assessment_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_due_date ON assessment_assignments(due_date);

-- ============================================
-- 12. TOPIC MASTERY (Progress tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS topic_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  topic_id UUID NOT NULL REFERENCES topics(id),
  
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  mastery_percentage DECIMAL(5,2) DEFAULT 0,
  weak_areas JSONB,
  
  last_practiced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, topic_id)
);

-- Indexes for topic mastery
CREATE INDEX IF NOT EXISTS idx_topic_mastery_user ON topic_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_topic ON topic_mastery(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_percentage ON topic_mastery(mastery_percentage);

-- ============================================
-- 13. HELPER FUNCTIONS
-- ============================================

-- Function to calculate next flashcard review date (spaced repetition)
CREATE OR REPLACE FUNCTION calculate_next_review_date(
  p_confidence TEXT,
  p_review_count INTEGER
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  days_to_add INTEGER;
  multiplier DECIMAL := 1.5;
BEGIN
  -- Base intervals based on confidence
  CASE p_confidence
    WHEN 'dont_know' THEN days_to_add := 1;
    WHEN 'need_practice' THEN days_to_add := 3;
    WHEN 'got_it' THEN days_to_add := 7;
    WHEN 'mastered' THEN days_to_add := 30;
    ELSE days_to_add := 1;
  END CASE;
  
  -- Apply spaced repetition multiplier
  days_to_add := CEIL(days_to_add * POWER(multiplier, p_review_count));
  
  RETURN NOW() + (days_to_add || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to update topic mastery after attempt
CREATE OR REPLACE FUNCTION update_topic_mastery()
RETURNS TRIGGER AS $$
DECLARE
  v_topic_id UUID;
  v_user_id UUID;
  v_correct_count INTEGER;
  v_total_count INTEGER;
  v_percentage DECIMAL(5,2);
BEGIN
  -- Get attempt details
  SELECT a.user_id, ass.topic_id
  INTO v_user_id, v_topic_id
  FROM assessment_attempts a
  JOIN assessments ass ON ass.id = a.assessment_id
  WHERE a.id = NEW.attempt_id;
  
  -- Only update if assessment has a topic
  IF v_topic_id IS NOT NULL THEN
    -- Calculate stats for this topic
    SELECT 
      COUNT(*),
      COUNT(*) FILTER (WHERE aa.is_correct = true)
    INTO v_total_count, v_correct_count
    FROM assessment_answers aa
    JOIN assessment_attempts at ON at.id = aa.attempt_id
    JOIN assessments ass ON ass.id = at.assessment_id
    WHERE at.user_id = v_user_id
    AND ass.topic_id = v_topic_id
    AND aa.is_correct IS NOT NULL;
    
    -- Calculate percentage
    IF v_total_count > 0 THEN
      v_percentage := (v_correct_count::DECIMAL / v_total_count) * 100;
    ELSE
      v_percentage := 0;
    END IF;
    
    -- Upsert topic mastery
    INSERT INTO topic_mastery (
      user_id,
      topic_id,
      questions_attempted,
      questions_correct,
      mastery_percentage,
      last_practiced_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_topic_id,
      v_total_count,
      v_correct_count,
      v_percentage,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, topic_id) DO UPDATE SET
      questions_attempted = EXCLUDED.questions_attempted,
      questions_correct = EXCLUDED.questions_correct,
      mastery_percentage = EXCLUDED.mastery_percentage,
      last_practiced_at = EXCLUDED.last_practiced_at,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update topic mastery after answer is graded
CREATE TRIGGER trigger_update_topic_mastery
  AFTER INSERT OR UPDATE OF is_correct ON assessment_answers
  FOR EACH ROW
  WHEN (NEW.is_correct IS NOT NULL)
  EXECUTE FUNCTION update_topic_mastery();

-- Function to auto-submit expired attempts
CREATE OR REPLACE FUNCTION auto_submit_expired_attempts()
RETURNS void AS $$
BEGIN
  UPDATE assessment_attempts
  SET status = 'submitted',
      submitted_at = NOW()
  WHERE status = 'in_progress'
  AND started_at + (
    SELECT duration_minutes * INTERVAL '1 minute'
    FROM assessments
    WHERE assessments.id = assessment_attempts.assessment_id
  ) < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 14. RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE assessment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_mastery ENABLE ROW LEVEL SECURITY;

-- Assessment types: Everyone can view
CREATE POLICY "Anyone can view assessment types"
  ON assessment_types FOR SELECT
  USING (true);

-- Assessments: Public can view published, teachers can manage their own
CREATE POLICY "Anyone can view published assessments"
  ON assessments FOR SELECT
  USING (is_published = true AND archived_at IS NULL);

CREATE POLICY "Teachers can manage their assessments"
  ON assessments FOR ALL
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'content_moderator')
    )
  );

-- Assessment questions: Can view if can view assessment
CREATE POLICY "Can view assessment questions if can view assessment"
  ON assessment_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND (assessments.is_published = true OR assessments.created_by = auth.uid())
    )
  );

-- Question choices: Can view if can view question
CREATE POLICY "Can view question choices"
  ON question_choices FOR SELECT
  USING (true);

-- Assessment attempts: Users can view/manage their own
CREATE POLICY "Users can view their own attempts"
  ON assessment_attempts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own attempts"
  ON assessment_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own attempts"
  ON assessment_attempts FOR UPDATE
  USING (user_id = auth.uid());

-- Teachers can view attempts for their assigned assessments
CREATE POLICY "Teachers can view class attempts"
  ON assessment_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessment_assignments aa
      JOIN classes c ON c.id = aa.class_id
      WHERE aa.assessment_id = assessment_attempts.assessment_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Assessment answers: Users can manage their own
CREATE POLICY "Users can manage their own answers"
  ON assessment_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assessment_attempts
      WHERE assessment_attempts.id = assessment_answers.attempt_id
      AND assessment_attempts.user_id = auth.uid()
    )
  );

-- Teachers can view/grade answers for their classes
CREATE POLICY "Teachers can grade class answers"
  ON assessment_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessment_attempts at
      JOIN assessment_assignments aa ON aa.assessment_id = at.assessment_id
      JOIN classes c ON c.id = aa.class_id
      WHERE at.id = assessment_answers.attempt_id
      AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can update grades"
  ON assessment_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assessment_attempts at
      JOIN assessment_assignments aa ON aa.assessment_id = at.assessment_id
      JOIN classes c ON c.id = aa.class_id
      WHERE at.id = assessment_answers.attempt_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Flashcard progress: Users manage their own
CREATE POLICY "Users manage their flashcard progress"
  ON flashcard_progress FOR ALL
  USING (user_id = auth.uid());

-- Classes: Teachers manage their own, students view enrolled
CREATE POLICY "Teachers manage their classes"
  ON classes FOR ALL
  USING (teacher_id = auth.uid());

CREATE POLICY "Students view enrolled classes"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_students
      WHERE class_students.class_id = classes.id
      AND class_students.student_id = auth.uid()
      AND class_students.is_active = true
    )
  );

-- Class students: Teachers and students can view
CREATE POLICY "Teachers and students view class enrollment"
  ON class_students FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_students.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers manage class enrollment"
  ON class_students FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_students.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Assessment assignments: Teachers assign, students view assigned
CREATE POLICY "Teachers manage assignments"
  ON assessment_assignments FOR ALL
  USING (assigned_by = auth.uid());

CREATE POLICY "Students view their assignments"
  ON assessment_assignments FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM class_students
      WHERE class_students.class_id = assessment_assignments.class_id
      AND class_students.student_id = auth.uid()
      AND class_students.is_active = true
    )
  );

-- Topic mastery: Users view their own
CREATE POLICY "Users view their topic mastery"
  ON topic_mastery FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- 15. UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_attempts_updated_at
  BEFORE UPDATE ON assessment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_answers_updated_at
  BEFORE UPDATE ON assessment_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_choices_updated_at
  BEFORE UPDATE ON question_choices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcard_progress_updated_at
  BEFORE UPDATE ON flashcard_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Assessment system migration completed successfully!' as status;
