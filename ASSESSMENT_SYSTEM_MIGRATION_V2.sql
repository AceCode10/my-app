-- ============================================
-- ASSESSMENT & TEST BUILDER SYSTEM MIGRATION V2
-- Complete schema for educational assessments
-- NO DEPENDENCIES - Fully self-contained
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. CREATE EXAM_BOARDS TABLE (if not exists)
-- ============================================

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
-- 2. ASSESSMENT TYPES
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
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
-- 3. ADD COLUMNS TO QUESTIONS TABLE
-- ============================================

-- Add exam_board_id column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'exam_board_id'
    ) THEN
        EXECUTE 'ALTER TABLE questions ADD COLUMN exam_board_id UUID';
        EXECUTE 'ALTER TABLE questions ADD CONSTRAINT fk_questions_exam_board FOREIGN KEY (exam_board_id) REFERENCES exam_boards(id) ON DELETE SET NULL';
    END IF;
END $$;

-- Add difficulty column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'difficulty'
    ) THEN
        EXECUTE 'ALTER TABLE questions ADD COLUMN difficulty TEXT CHECK (difficulty IN (''easy'', ''medium'', ''hard''))';
    END IF;
END $$;

-- Add question_type column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'question_type'
    ) THEN
        EXECUTE 'ALTER TABLE questions ADD COLUMN question_type TEXT CHECK (question_type IN (''mcq'', ''short_answer'', ''essay'', ''calculation'', ''true_false'', ''fill_in_blank''))';
    END IF;
END $$;

-- Add marks column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'marks'
    ) THEN
        EXECUTE 'ALTER TABLE questions ADD COLUMN marks INTEGER DEFAULT 1';
    END IF;
END $$;

-- Add estimated_time_minutes column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'estimated_time_minutes'
    ) THEN
        EXECUTE 'ALTER TABLE questions ADD COLUMN estimated_time_minutes DECIMAL(4,1)';
    END IF;
END $$;

-- Add keywords column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'keywords'
    ) THEN
        EXECUTE 'ALTER TABLE questions ADD COLUMN keywords TEXT[]';
    END IF;
END $$;

-- Add explanation column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'explanation'
    ) THEN
        EXECUTE 'ALTER TABLE questions ADD COLUMN explanation TEXT';
    END IF;
END $$;

-- Add correct_answer column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'correct_answer'
    ) THEN
        EXECUTE 'ALTER TABLE questions ADD COLUMN correct_answer TEXT';
    END IF;
END $$;

-- Add mark_scheme column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'mark_scheme'
    ) THEN
        EXECUTE 'ALTER TABLE questions ADD COLUMN mark_scheme TEXT';
    END IF;
END $$;

-- Add examiner_comments column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'examiner_comments'
    ) THEN
        EXECUTE 'ALTER TABLE questions ADD COLUMN examiner_comments TEXT';
    END IF;
END $$;

-- Create indexes for questions
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_exam_board_id ON questions(exam_board_id);

-- Create GIN index for keywords if column exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'keywords'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'questions' AND indexname = 'idx_questions_keywords'
        ) THEN
            EXECUTE 'CREATE INDEX idx_questions_keywords ON questions USING GIN(keywords)';
        END IF;
    END IF;
END $$;

-- ============================================
-- 4. QUESTION CHOICES (for MCQ)
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
-- 5. ASSESSMENTS
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
  
  -- Configuration
  duration_minutes INTEGER,
  total_marks INTEGER,
  passing_marks INTEGER,
  
  -- Past paper specific
  exam_year INTEGER,
  exam_series TEXT,
  paper_variant TEXT,
  paper_file_url TEXT,
  mark_scheme_url TEXT,
  examiner_report_url TEXT,
  
  -- Custom test specific
  created_by UUID REFERENCES users(id),
  is_template BOOLEAN DEFAULT false,
  randomize_questions BOOLEAN DEFAULT false,
  randomize_answers BOOLEAN DEFAULT false,
  calculator_allowed BOOLEAN DEFAULT true,
  max_attempts INTEGER DEFAULT 1,
  show_results TEXT CHECK (show_results IN ('immediately', 'after_deadline', 'manual')) DEFAULT 'immediately',
  
  -- Status
  is_published BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for assessments
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(assessment_type_id);
CREATE INDEX IF NOT EXISTS idx_assessments_subject ON assessments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assessments_exam_board ON assessments(exam_board_id);
CREATE INDEX IF NOT EXISTS idx_assessments_topic ON assessments(topic_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);
CREATE INDEX IF NOT EXISTS idx_assessments_published ON assessments(is_published, archived_at);

-- ============================================
-- 6. ASSESSMENT QUESTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  
  question_order INTEGER NOT NULL,
  section_name TEXT,
  section_instructions TEXT,
  
  custom_question_text TEXT,
  custom_marks INTEGER,
  custom_mark_scheme TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(assessment_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_question ON assessment_questions(question_id);

-- ============================================
-- 7. ASSESSMENT ATTEMPTS
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INTEGER,
  
  score DECIMAL(5,2),
  percentage DECIMAL(5,2),
  max_score INTEGER,
  
  status TEXT CHECK (status IN ('in_progress', 'submitted', 'graded', 'abandoned')) DEFAULT 'in_progress',
  attempt_number INTEGER DEFAULT 1,
  
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment ON assessment_attempts(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_status ON assessment_attempts(status);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user_assessment ON assessment_attempts(user_id, assessment_id);

-- ============================================
-- 8. ASSESSMENT ANSWERS
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  
  answer_text TEXT,
  selected_choice_id UUID REFERENCES question_choices(id),
  answer_file_url TEXT,
  
  is_correct BOOLEAN,
  marks_awarded DECIMAL(4,1),
  max_marks DECIMAL(4,1),
  
  teacher_feedback TEXT,
  graded_by UUID REFERENCES users(id),
  graded_at TIMESTAMPTZ,
  
  flagged_for_review BOOLEAN DEFAULT false,
  time_spent_seconds INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_answers_attempt ON assessment_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_assessment_answers_question ON assessment_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_assessment_answers_flagged ON assessment_answers(flagged_for_review) WHERE flagged_for_review = true;

-- ============================================
-- 9. FLASHCARD PROGRESS
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

CREATE INDEX IF NOT EXISTS idx_flashcard_progress_user ON flashcard_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_next_review ON flashcard_progress(user_id, next_review_at);

-- ============================================
-- 10. CLASSES
-- ============================================

-- Create classes table if it doesn't exist
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to classes table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'description'
    ) THEN
        EXECUTE 'ALTER TABLE classes ADD COLUMN description TEXT';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'subject_id'
    ) THEN
        EXECUTE 'ALTER TABLE classes ADD COLUMN subject_id UUID REFERENCES subjects(id)';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'exam_board_id'
    ) THEN
        EXECUTE 'ALTER TABLE classes ADD COLUMN exam_board_id UUID REFERENCES exam_boards(id)';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'class_code'
    ) THEN
        EXECUTE 'ALTER TABLE classes ADD COLUMN class_code TEXT';
        -- Add unique constraint separately
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'classes_class_code_key'
        ) THEN
            EXECUTE 'ALTER TABLE classes ADD CONSTRAINT classes_class_code_key UNIQUE (class_code)';
        END IF;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'academic_year'
    ) THEN
        EXECUTE 'ALTER TABLE classes ADD COLUMN academic_year TEXT';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'is_active'
    ) THEN
        EXECUTE 'ALTER TABLE classes ADD COLUMN is_active BOOLEAN DEFAULT true';
    END IF;
END $$;

-- Create indexes (only if columns exist)
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'class_code'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'classes' AND indexname = 'idx_classes_code'
        ) THEN
            EXECUTE 'CREATE INDEX idx_classes_code ON classes(class_code)';
        END IF;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'subject_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'classes' AND indexname = 'idx_classes_subject'
        ) THEN
            EXECUTE 'CREATE INDEX idx_classes_subject ON classes(subject_id)';
        END IF;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'classes' AND column_name = 'exam_board_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'classes' AND indexname = 'idx_classes_exam_board'
        ) THEN
            EXECUTE 'CREATE INDEX idx_classes_exam_board ON classes(exam_board_id)';
        END IF;
    END IF;
END $$;

-- ============================================
-- 11. CLASS STUDENTS
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

CREATE INDEX IF NOT EXISTS idx_class_students_class ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student ON class_students(student_id);

-- ============================================
-- 12. ASSESSMENT ASSIGNMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id),
  class_id UUID REFERENCES classes(id),
  student_id UUID REFERENCES users(id),
  
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  available_from TIMESTAMPTZ DEFAULT NOW(),
  
  show_results TEXT CHECK (show_results IN ('immediately', 'after_deadline', 'manual')) DEFAULT 'immediately',
  results_released_at TIMESTAMPTZ,
  
  notify_students BOOLEAN DEFAULT true,
  notification_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (class_id IS NOT NULL OR student_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_assessment_assignments_assessment ON assessment_assignments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_class ON assessment_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_student ON assessment_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_due_date ON assessment_assignments(due_date);

-- ============================================
-- 13. TOPIC MASTERY
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

CREATE INDEX IF NOT EXISTS idx_topic_mastery_user ON topic_mastery(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_topic ON topic_mastery(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_mastery_percentage ON topic_mastery(mastery_percentage);

-- ============================================
-- 14. HELPER FUNCTIONS
-- ============================================

-- Calculate next flashcard review date
CREATE OR REPLACE FUNCTION calculate_next_review_date(
  p_confidence TEXT,
  p_review_count INTEGER
)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  days_to_add INTEGER;
  multiplier DECIMAL := 1.5;
BEGIN
  CASE p_confidence
    WHEN 'dont_know' THEN days_to_add := 1;
    WHEN 'need_practice' THEN days_to_add := 3;
    WHEN 'got_it' THEN days_to_add := 7;
    WHEN 'mastered' THEN days_to_add := 30;
    ELSE days_to_add := 1;
  END CASE;
  
  days_to_add := CEIL(days_to_add * POWER(multiplier, p_review_count));
  
  RETURN NOW() + (days_to_add || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Update topic mastery after answer
CREATE OR REPLACE FUNCTION update_topic_mastery()
RETURNS TRIGGER AS $$
DECLARE
  v_topic_id UUID;
  v_user_id UUID;
  v_correct_count INTEGER;
  v_total_count INTEGER;
  v_percentage DECIMAL(5,2);
BEGIN
  SELECT a.user_id, ass.topic_id
  INTO v_user_id, v_topic_id
  FROM assessment_attempts a
  JOIN assessments ass ON ass.id = a.assessment_id
  WHERE a.id = NEW.attempt_id;
  
  IF v_topic_id IS NOT NULL THEN
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
    
    IF v_total_count > 0 THEN
      v_percentage := (v_correct_count::DECIMAL / v_total_count) * 100;
    ELSE
      v_percentage := 0;
    END IF;
    
    INSERT INTO topic_mastery (
      user_id, topic_id, questions_attempted, questions_correct, 
      mastery_percentage, last_practiced_at, updated_at
    ) VALUES (
      v_user_id, v_topic_id, v_total_count, v_correct_count,
      v_percentage, NOW(), NOW()
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

-- Trigger for topic mastery
DROP TRIGGER IF EXISTS trigger_update_topic_mastery ON assessment_answers;
CREATE TRIGGER trigger_update_topic_mastery
  AFTER INSERT OR UPDATE OF is_correct ON assessment_answers
  FOR EACH ROW
  WHEN (NEW.is_correct IS NOT NULL)
  EXECUTE FUNCTION update_topic_mastery();

-- ============================================
-- 15. RLS POLICIES
-- ============================================

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
DROP POLICY IF EXISTS "Anyone can view assessment types" ON assessment_types;
CREATE POLICY "Anyone can view assessment types"
  ON assessment_types FOR SELECT
  USING (true);

-- Assessments: Public can view published
DROP POLICY IF EXISTS "Anyone can view published assessments" ON assessments;
CREATE POLICY "Anyone can view published assessments"
  ON assessments FOR SELECT
  USING (is_published = true AND archived_at IS NULL);

DROP POLICY IF EXISTS "Teachers can manage their assessments" ON assessments;
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
DROP POLICY IF EXISTS "Can view assessment questions" ON assessment_questions;
CREATE POLICY "Can view assessment questions"
  ON assessment_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND (assessments.is_published = true OR assessments.created_by = auth.uid())
    )
  );

-- Question choices: Can view
DROP POLICY IF EXISTS "Can view question choices" ON question_choices;
CREATE POLICY "Can view question choices"
  ON question_choices FOR SELECT
  USING (true);

-- Assessment attempts: Users manage their own
DROP POLICY IF EXISTS "Users can view their own attempts" ON assessment_attempts;
CREATE POLICY "Users can view their own attempts"
  ON assessment_attempts FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own attempts" ON assessment_attempts;
CREATE POLICY "Users can create their own attempts"
  ON assessment_attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own attempts" ON assessment_attempts;
CREATE POLICY "Users can update their own attempts"
  ON assessment_attempts FOR UPDATE
  USING (user_id = auth.uid());

-- Assessment answers: Users manage their own
DROP POLICY IF EXISTS "Users can manage their own answers" ON assessment_answers;
CREATE POLICY "Users can manage their own answers"
  ON assessment_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assessment_attempts
      WHERE assessment_attempts.id = assessment_answers.attempt_id
      AND assessment_attempts.user_id = auth.uid()
    )
  );

-- Flashcard progress: Users manage their own
DROP POLICY IF EXISTS "Users manage their flashcard progress" ON flashcard_progress;
CREATE POLICY "Users manage their flashcard progress"
  ON flashcard_progress FOR ALL
  USING (user_id = auth.uid());

-- Classes: Teachers manage their own
DROP POLICY IF EXISTS "Teachers manage their classes" ON classes;
CREATE POLICY "Teachers manage their classes"
  ON classes FOR ALL
  USING (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students view enrolled classes" ON classes;
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
DROP POLICY IF EXISTS "Teachers and students view enrollment" ON class_students;
CREATE POLICY "Teachers and students view enrollment"
  ON class_students FOR SELECT
  USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_students.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Assessment assignments: Teachers assign, students view
DROP POLICY IF EXISTS "Teachers manage assignments" ON assessment_assignments;
CREATE POLICY "Teachers manage assignments"
  ON assessment_assignments FOR ALL
  USING (assigned_by = auth.uid());

DROP POLICY IF EXISTS "Students view their assignments" ON assessment_assignments;
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
DROP POLICY IF EXISTS "Users view their topic mastery" ON topic_mastery;
CREATE POLICY "Users view their topic mastery"
  ON topic_mastery FOR SELECT
  USING (user_id = auth.uid());

-- ============================================
-- 16. UPDATED_AT TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_assessments_updated_at ON assessments;
CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessment_attempts_updated_at ON assessment_attempts;
CREATE TRIGGER update_assessment_attempts_updated_at
  BEFORE UPDATE ON assessment_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessment_answers_updated_at ON assessment_answers;
CREATE TRIGGER update_assessment_answers_updated_at
  BEFORE UPDATE ON assessment_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_question_choices_updated_at ON question_choices;
CREATE TRIGGER update_question_choices_updated_at
  BEFORE UPDATE ON question_choices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_flashcard_progress_updated_at ON flashcard_progress;
CREATE TRIGGER update_flashcard_progress_updated_at
  BEFORE UPDATE ON flashcard_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Assessment system migration V2 completed successfully!' as status;

-- Show verification
SELECT 
  'assessment_types' as table_name,
  COUNT(*) as row_count
FROM assessment_types
UNION ALL
SELECT 
  'assessments',
  COUNT(*)
FROM assessments
UNION ALL
SELECT 
  'assessment_attempts',
  COUNT(*)
FROM assessment_attempts;
