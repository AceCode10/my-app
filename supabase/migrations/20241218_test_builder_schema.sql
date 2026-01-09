-- ============================================
-- TEST BUILDER SCHEMA
-- Tables for teacher test creation, assignments, and attempts
-- ============================================

-- ============================================
-- CLASSES TABLE (if not exists)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'classes') THEN
    CREATE TABLE classes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      subject_id UUID,
      teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT,
      join_code TEXT UNIQUE,
      capacity INTEGER DEFAULT 999,
      auto_approve BOOLEAN DEFAULT true,
      thumbnail_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END $$;

-- Add foreign key to subjects if subjects table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'classes_subject_id_fkey' AND table_name = 'classes'
    ) THEN
      BEGIN
        ALTER TABLE classes ADD CONSTRAINT classes_subject_id_fkey 
          FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;
      EXCEPTION WHEN others THEN
        -- Ignore if constraint already exists or subjects table doesn't exist
        NULL;
      END;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_join_code ON classes(join_code);

-- Generate unique join codes function
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate join code trigger
CREATE OR REPLACE FUNCTION set_class_join_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
    NEW.join_code := generate_join_code();
    WHILE EXISTS (SELECT 1 FROM classes WHERE join_code = NEW.join_code) LOOP
      NEW.join_code := generate_join_code();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_class_join_code_trigger ON classes;
CREATE TRIGGER set_class_join_code_trigger
BEFORE INSERT ON classes
FOR EACH ROW EXECUTE FUNCTION set_class_join_code();

-- ============================================
-- ENROLLMENTS TABLE (if not exists)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments') THEN
    CREATE TABLE enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
      enrolled_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(class_id, user_id)
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- ============================================
-- TESTS TABLE (Teacher-created tests)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tests') THEN
    CREATE TABLE tests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      subject_id UUID,
      exam_board_id UUID,
      sections JSONB NOT NULL DEFAULT '[]',
      total_marks NUMERIC DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      duration_minutes INTEGER,
      allow_calculator BOOLEAN DEFAULT true,
      randomize_questions BOOLEAN DEFAULT false,
      randomize_choices BOOLEAN DEFAULT false,
      visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'assigned', 'public')),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END $$;

-- Add columns to tests table if they don't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tests' AND column_name = 'subject_id') THEN
    ALTER TABLE tests ADD COLUMN subject_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tests' AND column_name = 'exam_board_id') THEN
    ALTER TABLE tests ADD COLUMN exam_board_id UUID;
  END IF;
END $$;

-- Add foreign keys if referenced tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tests_subject_id_fkey' AND table_name = 'tests') THEN
      BEGIN
        ALTER TABLE tests ADD CONSTRAINT tests_subject_id_fkey 
          FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;
      EXCEPTION WHEN others THEN NULL;
      END;
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exam_boards') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tests_exam_board_id_fkey' AND table_name = 'tests') THEN
      BEGIN
        ALTER TABLE tests ADD CONSTRAINT tests_exam_board_id_fkey 
          FOREIGN KEY (exam_board_id) REFERENCES exam_boards(id) ON DELETE SET NULL;
      EXCEPTION WHEN others THEN NULL;
      END;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tests_creator ON tests(created_by);
CREATE INDEX IF NOT EXISTS idx_tests_subject ON tests(subject_id);
CREATE INDEX IF NOT EXISTS idx_tests_visibility ON tests(visibility);

-- ============================================
-- ASSIGNMENTS TABLE (Teacher assigns tests to classes/students)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assignments') THEN
    CREATE TABLE assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
      paper_id UUID,
      assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
      target_user_ids UUID[],
      title TEXT NOT NULL,
      instructions TEXT,
      start_at TIMESTAMPTZ,
      due_at TIMESTAMPTZ,
      time_limit_minutes INTEGER,
      allow_retakes BOOLEAN DEFAULT false,
      max_attempts INTEGER DEFAULT 1,
      show_results TEXT DEFAULT 'after_due' CHECK (show_results IN ('immediately', 'after_submit', 'after_due', 'manual')),
      results_released BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END $$;

-- Add foreign key to past_papers if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'past_papers') THEN
    BEGIN
      ALTER TABLE assignments ADD CONSTRAINT assignments_paper_id_fkey 
        FOREIGN KEY (paper_id) REFERENCES past_papers(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assignments_test ON assignments(test_id);
CREATE INDEX IF NOT EXISTS idx_assignments_paper ON assignments(paper_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(target_class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_by ON assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON assignments(due_at);

-- ============================================
-- TEST ATTEMPTS TABLE (Student attempts on tests/assignments)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_attempts') THEN
    CREATE TABLE test_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
      test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      started_at TIMESTAMPTZ DEFAULT now(),
      submitted_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      time_spent_seconds INTEGER DEFAULT 0,
      answers JSONB DEFAULT '{}',
      score NUMERIC,
      max_score NUMERIC,
      percentage NUMERIC,
      auto_graded BOOLEAN DEFAULT false,
      teacher_graded BOOLEAN DEFAULT false,
      grading_details JSONB,
      requires_manual_grading BOOLEAN DEFAULT false,
      status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'grading', 'graded', 'expired')),
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_test_attempts_user ON test_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_assignment ON test_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_test ON test_attempts(test_id);
CREATE INDEX IF NOT EXISTS idx_test_attempts_status ON test_attempts(status);

-- ============================================
-- TEST ATTEMPT ANSWERS TABLE (Per-question answers)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'test_attempt_answers') THEN
    CREATE TABLE test_attempt_answers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      attempt_id UUID NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
      question_id UUID,
      answer_text TEXT,
      selected_choice TEXT,
      answer_data JSONB,
      is_correct BOOLEAN,
      marks_awarded NUMERIC,
      max_marks NUMERIC,
      auto_feedback TEXT,
      teacher_feedback TEXT,
      time_spent_seconds INTEGER DEFAULT 0,
      flagged BOOLEAN DEFAULT false,
      answered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(attempt_id, question_id)
    );
  END IF;
END $$;

-- Add foreign key to questions if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questions') THEN
    BEGIN
      ALTER TABLE test_attempt_answers ADD CONSTRAINT test_attempt_answers_question_id_fkey 
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_test_attempt_answers_attempt ON test_attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_test_attempt_answers_question ON test_attempt_answers(question_id);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_attempt_answers ENABLE ROW LEVEL SECURITY;

-- CLASSES POLICIES
DROP POLICY IF EXISTS "Teachers can manage own classes" ON classes;
CREATE POLICY "Teachers can manage own classes" ON classes
  FOR ALL TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

DROP POLICY IF EXISTS "Students can view enrolled classes" ON classes;
CREATE POLICY "Students can view enrolled classes" ON classes
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT class_id FROM enrollments WHERE user_id = auth.uid() AND status = 'active')
    OR teacher_id = auth.uid()
  );

DROP POLICY IF EXISTS "Anyone can view class by join code" ON classes;
CREATE POLICY "Anyone can view class by join code" ON classes
  FOR SELECT TO authenticated
  USING (true);

-- ENROLLMENTS POLICIES
DROP POLICY IF EXISTS "Users can view own enrollments" ON enrollments;
CREATE POLICY "Users can view own enrollments" ON enrollments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()));

DROP POLICY IF EXISTS "Users can enroll themselves" ON enrollments;
CREATE POLICY "Users can enroll themselves" ON enrollments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can manage class enrollments" ON enrollments;
CREATE POLICY "Teachers can manage class enrollments" ON enrollments
  FOR ALL TO authenticated
  USING (class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()));

-- TESTS POLICIES
DROP POLICY IF EXISTS "Teachers can manage own tests" ON tests;
CREATE POLICY "Teachers can manage own tests" ON tests
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can view assigned tests" ON tests;
CREATE POLICY "Users can view assigned tests" ON tests
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR visibility = 'public'
    OR id IN (
      SELECT test_id FROM assignments 
      WHERE target_class_id IN (SELECT class_id FROM enrollments WHERE user_id = auth.uid() AND status = 'active')
      OR auth.uid() = ANY(target_user_ids)
    )
  );

-- ASSIGNMENTS POLICIES
DROP POLICY IF EXISTS "Teachers can manage own assignments" ON assignments;
CREATE POLICY "Teachers can manage own assignments" ON assignments
  FOR ALL TO authenticated
  USING (assigned_by = auth.uid())
  WITH CHECK (assigned_by = auth.uid());

DROP POLICY IF EXISTS "Students can view their assignments" ON assignments;
CREATE POLICY "Students can view their assignments" ON assignments
  FOR SELECT TO authenticated
  USING (
    assigned_by = auth.uid()
    OR target_class_id IN (SELECT class_id FROM enrollments WHERE user_id = auth.uid() AND status = 'active')
    OR auth.uid() = ANY(target_user_ids)
  );

-- TEST ATTEMPTS POLICIES
DROP POLICY IF EXISTS "Users can manage own attempts" ON test_attempts;
CREATE POLICY "Users can manage own attempts" ON test_attempts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers can view class attempts" ON test_attempts;
CREATE POLICY "Teachers can view class attempts" ON test_attempts
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR assignment_id IN (SELECT id FROM assignments WHERE assigned_by = auth.uid())
  );

DROP POLICY IF EXISTS "Teachers can grade attempts" ON test_attempts;
CREATE POLICY "Teachers can grade attempts" ON test_attempts
  FOR UPDATE TO authenticated
  USING (assignment_id IN (SELECT id FROM assignments WHERE assigned_by = auth.uid()));

-- TEST ATTEMPT ANSWERS POLICIES
DROP POLICY IF EXISTS "Users can manage own answers" ON test_attempt_answers;
CREATE POLICY "Users can manage own answers" ON test_attempt_answers
  FOR ALL TO authenticated
  USING (attempt_id IN (SELECT id FROM test_attempts WHERE user_id = auth.uid()))
  WITH CHECK (attempt_id IN (SELECT id FROM test_attempts WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can view and grade answers" ON test_attempt_answers;
CREATE POLICY "Teachers can view and grade answers" ON test_attempt_answers
  FOR ALL TO authenticated
  USING (
    attempt_id IN (
      SELECT ta.id FROM test_attempts ta
      JOIN assignments a ON ta.assignment_id = a.id
      WHERE a.assigned_by = auth.uid()
    )
  );

-- ============================================
-- UPDATE TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tests_updated_at ON tests;
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_test_attempts_updated_at ON test_attempts;
CREATE TRIGGER update_test_attempts_updated_at BEFORE UPDATE ON test_attempts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTION: Calculate test totals
-- ============================================
CREATE OR REPLACE FUNCTION calculate_test_totals()
RETURNS TRIGGER AS $$
DECLARE
  total_m NUMERIC := 0;
  total_q INTEGER := 0;
  section JSONB;
  question JSONB;
BEGIN
  IF NEW.sections IS NOT NULL THEN
    FOR section IN SELECT * FROM jsonb_array_elements(NEW.sections)
    LOOP
      IF section->'questions' IS NOT NULL THEN
        FOR question IN SELECT * FROM jsonb_array_elements(section->'questions')
        LOOP
          total_m := total_m + COALESCE((question->>'marks')::NUMERIC, 1);
          total_q := total_q + 1;
        END LOOP;
      END IF;
    END LOOP;
  END IF;
  
  NEW.total_marks := total_m;
  NEW.total_questions := total_q;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_test_totals_trigger ON tests;
CREATE TRIGGER calculate_test_totals_trigger
BEFORE INSERT OR UPDATE OF sections ON tests
FOR EACH ROW EXECUTE FUNCTION calculate_test_totals();

SELECT 'Test Builder schema created successfully!' as status;
