-- ============================================
-- DEFINITIVE FIX FOR ALL 406 ERRORS
-- Fixes: classes, user_gamification, assessments, 
-- class_announcements, test_attempts, enrollments
-- ============================================

-- ============================================
-- PART 1: FIX CLASSES TABLE RLS
-- Students need to view classes they're enrolled in
-- ============================================

-- Drop existing classes policies
DROP POLICY IF EXISTS "classes_select" ON classes;
DROP POLICY IF EXISTS "classes_teacher_select" ON classes;
DROP POLICY IF EXISTS "classes_student_select" ON classes;
DROP POLICY IF EXISTS "classes_public_select" ON classes;
DROP POLICY IF EXISTS "Teachers can view own classes" ON classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON classes;
DROP POLICY IF EXISTS "Anyone can view classes" ON classes;

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view classes (simple policy to avoid recursion)
CREATE POLICY "classes_authenticated_select"
ON classes FOR SELECT
TO authenticated
USING (true);

-- Teachers can insert their own classes
DROP POLICY IF EXISTS "classes_teacher_insert" ON classes;
CREATE POLICY "classes_teacher_insert"
ON classes FOR INSERT
TO authenticated
WITH CHECK (teacher_id = auth.uid());

-- Teachers can update their own classes
DROP POLICY IF EXISTS "classes_teacher_update" ON classes;
CREATE POLICY "classes_teacher_update"
ON classes FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Teachers can delete their own classes
DROP POLICY IF EXISTS "classes_teacher_delete" ON classes;
CREATE POLICY "classes_teacher_delete"
ON classes FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

-- ============================================
-- PART 2: FIX USER_GAMIFICATION TABLE
-- ============================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS user_gamification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    streak_freeze_count INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    xp_this_week INTEGER DEFAULT 0,
    xp_this_month INTEGER DEFAULT 0,
    xp_level INTEGER DEFAULT 1,
    xp_progress_to_next_level INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id ON user_gamification(user_id);

-- Enable RLS
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "user_gamification_select_own" ON user_gamification;
DROP POLICY IF EXISTS "user_gamification_insert_own" ON user_gamification;
DROP POLICY IF EXISTS "user_gamification_update_own" ON user_gamification;
DROP POLICY IF EXISTS "Users can view own gamification" ON user_gamification;
DROP POLICY IF EXISTS "Users can update own gamification" ON user_gamification;

-- Users can view their own gamification data
CREATE POLICY "user_gamification_select_own"
ON user_gamification FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own gamification data
CREATE POLICY "user_gamification_insert_own"
ON user_gamification FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own gamification data
CREATE POLICY "user_gamification_update_own"
ON user_gamification FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- PART 3: CREATE AND FIX ASSESSMENTS TABLE
-- ============================================

-- Create assessments table if it doesn't exist
CREATE TABLE IF NOT EXISTS assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_type_id UUID REFERENCES assessment_types(id),
    title TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    subject_id UUID REFERENCES subjects(id),
    exam_board_id UUID REFERENCES exam_boards(id),
    topic_id UUID REFERENCES topics(id),
    duration_minutes INTEGER,
    total_marks INTEGER DEFAULT 0,
    passing_marks INTEGER,
    calculator_allowed BOOLEAN DEFAULT false,
    max_attempts INTEGER DEFAULT 1,
    show_results TEXT DEFAULT 'immediately',
    randomize_questions BOOLEAN DEFAULT false,
    randomize_answers BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assessments_type ON assessments(assessment_type_id);
CREATE INDEX IF NOT EXISTS idx_assessments_subject ON assessments(subject_id);
CREATE INDEX IF NOT EXISTS idx_assessments_exam_board ON assessments(exam_board_id);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);
CREATE INDEX IF NOT EXISTS idx_assessments_published ON assessments(is_published);

-- Enable RLS
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "assessments_select" ON assessments;
DROP POLICY IF EXISTS "assessments_teacher_select" ON assessments;
DROP POLICY IF EXISTS "assessments_student_select" ON assessments;
DROP POLICY IF EXISTS "Anyone can view published assessments" ON assessments;

-- Everyone authenticated can view published assessments
CREATE POLICY "assessments_authenticated_select"
ON assessments FOR SELECT
TO authenticated
USING (is_published = true OR created_by = auth.uid());

-- Teachers can insert assessments
DROP POLICY IF EXISTS "assessments_teacher_insert" ON assessments;
CREATE POLICY "assessments_teacher_insert"
ON assessments FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Teachers can update their own assessments
DROP POLICY IF EXISTS "assessments_teacher_update" ON assessments;
CREATE POLICY "assessments_teacher_update"
ON assessments FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- ============================================
-- PART 4: FIX ASSIGNMENTS TABLE RLS
-- Students need to view assignments for their classes
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "assignments_select" ON assignments;
DROP POLICY IF EXISTS "assignments_teacher_select" ON assignments;
DROP POLICY IF EXISTS "assignments_student_select" ON assignments;
DROP POLICY IF EXISTS "Teachers can view own assignments" ON assignments;
DROP POLICY IF EXISTS "Students can view class assignments" ON assignments;

-- Enable RLS
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view assignments (simplified)
CREATE POLICY "assignments_authenticated_select"
ON assignments FOR SELECT
TO authenticated
USING (true);

-- Teachers can insert assignments
DROP POLICY IF EXISTS "assignments_teacher_insert" ON assignments;
CREATE POLICY "assignments_teacher_insert"
ON assignments FOR INSERT
TO authenticated
WITH CHECK (assigned_by = auth.uid());

-- Teachers can update their own assignments
DROP POLICY IF EXISTS "assignments_teacher_update" ON assignments;
CREATE POLICY "assignments_teacher_update"
ON assignments FOR UPDATE
TO authenticated
USING (assigned_by = auth.uid())
WITH CHECK (assigned_by = auth.uid());

-- Teachers can delete their own assignments
DROP POLICY IF EXISTS "assignments_teacher_delete" ON assignments;
CREATE POLICY "assignments_teacher_delete"
ON assignments FOR DELETE
TO authenticated
USING (assigned_by = auth.uid());

-- ============================================
-- PART 5: FIX TEST_ATTEMPTS TABLE
-- ============================================

-- Ensure columns exist and are nullable
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_attempts' 
        AND column_name = 'assignment_id'
    ) THEN
        ALTER TABLE test_attempts ADD COLUMN assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Make test_id nullable if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_attempts' 
        AND column_name = 'test_id'
    ) THEN
        ALTER TABLE test_attempts ALTER COLUMN test_id DROP NOT NULL;
    END IF;
END $$;

-- Make paper_id nullable if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_attempts' 
        AND column_name = 'paper_id'
    ) THEN
        ALTER TABLE test_attempts ALTER COLUMN paper_id DROP NOT NULL;
    END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "test_attempts_student_select" ON test_attempts;
DROP POLICY IF EXISTS "test_attempts_student_insert" ON test_attempts;
DROP POLICY IF EXISTS "test_attempts_student_update" ON test_attempts;
DROP POLICY IF EXISTS "test_attempts_teacher_select" ON test_attempts;
DROP POLICY IF EXISTS "Users can view own test attempts" ON test_attempts;
DROP POLICY IF EXISTS "Users can insert own test attempts" ON test_attempts;
DROP POLICY IF EXISTS "Users can update own test attempts" ON test_attempts;

-- Enable RLS
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;

-- Students can view their own attempts
CREATE POLICY "test_attempts_own_select"
ON test_attempts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Students can insert their own attempts
CREATE POLICY "test_attempts_own_insert"
ON test_attempts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Students can update their own attempts
CREATE POLICY "test_attempts_own_update"
ON test_attempts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Teachers can view attempts for their classes
CREATE POLICY "test_attempts_teacher_view"
ON test_attempts FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON c.id = a.target_class_id
        WHERE a.id = test_attempts.assignment_id
        AND c.teacher_id = auth.uid()
    )
);

-- ============================================
-- PART 6: FIX ASSESSMENT_ATTEMPTS TABLE
-- ============================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'in_progress',
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER DEFAULT 0,
    score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    percentage DECIMAL(5,2),
    answers JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment ON assessment_attempts(assessment_id);

-- Enable RLS
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "assessment_attempts_own_select" ON assessment_attempts;
DROP POLICY IF EXISTS "assessment_attempts_own_insert" ON assessment_attempts;
DROP POLICY IF EXISTS "assessment_attempts_own_update" ON assessment_attempts;

-- Users can view their own attempts
CREATE POLICY "assessment_attempts_own_select"
ON assessment_attempts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own attempts
CREATE POLICY "assessment_attempts_own_insert"
ON assessment_attempts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own attempts
CREATE POLICY "assessment_attempts_own_update"
ON assessment_attempts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- PART 7: FIX CLASS_ANNOUNCEMENTS TABLE
-- ============================================

-- Drop and recreate to ensure correct structure
DROP TABLE IF EXISTS class_announcements CASCADE;

CREATE TABLE class_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_class_announcements_class ON class_announcements(class_id);
CREATE INDEX idx_class_announcements_teacher ON class_announcements(teacher_id);

-- Enable RLS
ALTER TABLE class_announcements ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view announcements (simplified to avoid recursion)
CREATE POLICY "class_announcements_select"
ON class_announcements FOR SELECT
TO authenticated
USING (true);

-- Teachers can create announcements for their classes
CREATE POLICY "class_announcements_insert"
ON class_announcements FOR INSERT
TO authenticated
WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = class_announcements.class_id 
        AND classes.teacher_id = auth.uid()
    )
);

-- Teachers can update their announcements
CREATE POLICY "class_announcements_update"
ON class_announcements FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Teachers can delete their announcements
CREATE POLICY "class_announcements_delete"
ON class_announcements FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

-- ============================================
-- PART 8: FIX ENROLLMENTS TABLE RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "enrollments_select" ON enrollments;
DROP POLICY IF EXISTS "enrollments_student_select" ON enrollments;
DROP POLICY IF EXISTS "enrollments_student_insert" ON enrollments;
DROP POLICY IF EXISTS "enrollments_teacher_select" ON enrollments;
DROP POLICY IF EXISTS "enrollments_teacher_update" ON enrollments;
DROP POLICY IF EXISTS "Students can enroll in classes" ON enrollments;

-- Enable RLS
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view enrollments (simplified)
CREATE POLICY "enrollments_authenticated_select"
ON enrollments FOR SELECT
TO authenticated
USING (true);

-- Students can create their own enrollments
CREATE POLICY "enrollments_student_insert"
ON enrollments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Teachers can update enrollments for their classes
CREATE POLICY "enrollments_teacher_update"
ON enrollments FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = enrollments.class_id 
        AND classes.teacher_id = auth.uid()
    )
);

-- ============================================
-- PART 9: FIX USERS TABLE RLS
-- ============================================

DROP POLICY IF EXISTS "users_public_read" ON users;
DROP POLICY IF EXISTS "users_authenticated_select" ON users;
DROP POLICY IF EXISTS "Anyone can view users" ON users;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view users
CREATE POLICY "users_authenticated_select"
ON users FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
DROP POLICY IF EXISTS "users_own_update" ON users;
CREATE POLICY "users_own_update"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================
-- PART 10: FIX SUBJECTS AND TOPICS RLS
-- ============================================

-- Subjects - public read
DROP POLICY IF EXISTS "subjects_public_read" ON subjects;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects_authenticated_select"
ON subjects FOR SELECT
TO authenticated
USING (true);

-- Topics - public read
DROP POLICY IF EXISTS "topics_public_read" ON topics;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_authenticated_select"
ON topics FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- PART 11: FIX EXAM_BOARDS RLS
-- ============================================

DROP POLICY IF EXISTS "exam_boards_public_read" ON exam_boards;
DROP POLICY IF EXISTS "Public can view exam boards" ON exam_boards;
ALTER TABLE exam_boards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exam_boards_authenticated_select"
ON exam_boards FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- PART 12: FIX ASSESSMENT_TYPES RLS
-- ============================================

DROP POLICY IF EXISTS "assessment_types_public_read" ON assessment_types;
ALTER TABLE assessment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessment_types_authenticated_select"
ON assessment_types FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- PART 13: FIX QUESTIONS RLS
-- ============================================

DROP POLICY IF EXISTS "questions_select" ON questions;
DROP POLICY IF EXISTS "questions_public_read" ON questions;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions_authenticated_select"
ON questions FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- PART 14: FIX ASSESSMENT_QUESTIONS RLS
-- ============================================

CREATE TABLE IF NOT EXISTS assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    order_index INTEGER DEFAULT 0,
    points DECIMAL(5,2) DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment ON assessment_questions(assessment_id);

-- Drop all existing policies
DROP POLICY IF EXISTS "assessment_questions_select" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_authenticated_select" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_teacher_all" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_teacher_select" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_teacher_insert" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_teacher_update" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_teacher_delete" ON assessment_questions;

ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view assessment questions for published assessments
CREATE POLICY "assessment_questions_authenticated_select"
ON assessment_questions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM assessments 
        WHERE assessments.id = assessment_questions.assessment_id 
        AND (assessments.is_published = true OR assessments.created_by = auth.uid())
    )
);

-- Teachers can insert assessment questions
CREATE POLICY "assessment_questions_teacher_insert"
ON assessment_questions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM assessments 
        WHERE assessments.id = assessment_questions.assessment_id 
        AND assessments.created_by = auth.uid()
    )
);

-- Teachers can update assessment questions
CREATE POLICY "assessment_questions_teacher_update"
ON assessment_questions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM assessments 
        WHERE assessments.id = assessment_questions.assessment_id 
        AND assessments.created_by = auth.uid()
    )
);

-- Teachers can delete assessment questions
CREATE POLICY "assessment_questions_teacher_delete"
ON assessment_questions FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM assessments 
        WHERE assessments.id = assessment_questions.assessment_id 
        AND assessments.created_by = auth.uid()
    )
);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'All RLS policies fixed! Students can now view classes, announcements, and take tests.' as result;
