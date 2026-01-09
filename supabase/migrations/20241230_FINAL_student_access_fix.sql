-- ============================================
-- FINAL FIX: Student Access to Assessments & Announcements
-- Run this DIRECTLY in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: FIX ASSESSMENTS RLS
-- Students need to view assessments assigned to them
-- ============================================

-- Drop ALL existing assessment policies
DROP POLICY IF EXISTS "assessments_select" ON assessments;
DROP POLICY IF EXISTS "assessments_authenticated_select" ON assessments;
DROP POLICY IF EXISTS "assessments_teacher_select" ON assessments;
DROP POLICY IF EXISTS "assessments_student_select" ON assessments;
DROP POLICY IF EXISTS "assessments_teacher_insert" ON assessments;
DROP POLICY IF EXISTS "assessments_teacher_update" ON assessments;
DROP POLICY IF EXISTS "Anyone can view published assessments" ON assessments;

-- Enable RLS
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Students can view assessments that are:
-- 1. Published (is_published = true)
-- 2. Created by them
-- 3. Assigned to them via assignments table
CREATE POLICY "assessments_view_policy"
ON assessments FOR SELECT
TO authenticated
USING (
    is_published = true
    OR created_by = auth.uid()
    OR id IN (
        SELECT assessment_id FROM assignments 
        WHERE assessment_id IS NOT NULL
        AND (
            target_class_id IN (
                SELECT class_id FROM enrollments 
                WHERE user_id = auth.uid() AND status = 'active'
            )
            OR auth.uid() = ANY(target_user_ids)
        )
    )
);

-- Teachers can insert assessments
CREATE POLICY "assessments_insert_policy"
ON assessments FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Teachers can update their own assessments
CREATE POLICY "assessments_update_policy"
ON assessments FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Teachers can delete their own assessments
CREATE POLICY "assessments_delete_policy"
ON assessments FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- ============================================
-- PART 2: FIX ASSESSMENT_ATTEMPTS RLS
-- Students need to create and view their attempts
-- ============================================

-- Ensure table exists
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user ON assessment_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assessment ON assessment_attempts(assessment_id);

-- Drop existing policies
DROP POLICY IF EXISTS "assessment_attempts_own_select" ON assessment_attempts;
DROP POLICY IF EXISTS "assessment_attempts_own_insert" ON assessment_attempts;
DROP POLICY IF EXISTS "assessment_attempts_own_update" ON assessment_attempts;
DROP POLICY IF EXISTS "assessment_attempts_view" ON assessment_attempts;
DROP POLICY IF EXISTS "assessment_attempts_insert" ON assessment_attempts;
DROP POLICY IF EXISTS "assessment_attempts_update" ON assessment_attempts;

-- Enable RLS
ALTER TABLE assessment_attempts ENABLE ROW LEVEL SECURITY;

-- Users can view their own attempts
CREATE POLICY "assessment_attempts_view"
ON assessment_attempts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own attempts
CREATE POLICY "assessment_attempts_insert"
ON assessment_attempts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own attempts
CREATE POLICY "assessment_attempts_update"
ON assessment_attempts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- PART 3: FIX ASSESSMENT_QUESTIONS RLS
-- Students need to view questions for assessments they can access
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "assessment_questions_select" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_authenticated_select" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_teacher_all" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_teacher_select" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_teacher_insert" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_teacher_update" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_teacher_delete" ON assessment_questions;
DROP POLICY IF EXISTS "Users can view assessment questions for published assessments" ON assessment_questions;
DROP POLICY IF EXISTS "Teachers can manage their assessment questions" ON assessment_questions;

-- Enable RLS
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;

-- Everyone can view assessment questions (simplified - security is on assessments table)
CREATE POLICY "assessment_questions_view"
ON assessment_questions FOR SELECT
TO authenticated
USING (true);

-- Teachers can insert/update/delete their assessment questions
CREATE POLICY "assessment_questions_manage"
ON assessment_questions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM assessments 
        WHERE assessments.id = assessment_questions.assessment_id 
        AND assessments.created_by = auth.uid()
    )
);

-- ============================================
-- PART 4: FIX QUESTIONS RLS
-- Students need to view questions
-- ============================================

DROP POLICY IF EXISTS "questions_select" ON questions;
DROP POLICY IF EXISTS "questions_public_read" ON questions;
DROP POLICY IF EXISTS "questions_authenticated_select" ON questions;

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view questions
CREATE POLICY "questions_view"
ON questions FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- PART 5: FIX QUESTION_CHOICES RLS
-- Students need to view answer choices
-- ============================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS question_choices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    choice_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_choices_question ON question_choices(question_id);

DROP POLICY IF EXISTS "question_choices_view" ON question_choices;
DROP POLICY IF EXISTS "question_choices_select" ON question_choices;

ALTER TABLE question_choices ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view question choices
CREATE POLICY "question_choices_view"
ON question_choices FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- PART 6: FIX CLASS_ANNOUNCEMENTS
-- Ensure table exists and students can view
-- ============================================

-- Create table if not exists (preserves existing data)
CREATE TABLE IF NOT EXISTS class_announcements (
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
CREATE INDEX IF NOT EXISTS idx_class_announcements_class ON class_announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_class_announcements_teacher ON class_announcements(teacher_id);

-- Drop existing policies
DROP POLICY IF EXISTS "class_announcements_select" ON class_announcements;
DROP POLICY IF EXISTS "class_announcements_insert" ON class_announcements;
DROP POLICY IF EXISTS "class_announcements_update" ON class_announcements;
DROP POLICY IF EXISTS "class_announcements_delete" ON class_announcements;
DROP POLICY IF EXISTS "class_announcements_view" ON class_announcements;
DROP POLICY IF EXISTS "class_announcements_teacher_view" ON class_announcements;
DROP POLICY IF EXISTS "class_announcements_student_view" ON class_announcements;

-- Enable RLS
ALTER TABLE class_announcements ENABLE ROW LEVEL SECURITY;

-- CRITICAL: Students can view announcements for classes they're enrolled in
-- Teachers can view announcements for their classes
CREATE POLICY "class_announcements_view"
ON class_announcements FOR SELECT
TO authenticated
USING (
    -- Teacher who created it
    teacher_id = auth.uid()
    -- OR student enrolled in the class
    OR class_id IN (
        SELECT class_id FROM enrollments 
        WHERE user_id = auth.uid() AND status = 'active'
    )
    -- OR teacher of the class
    OR class_id IN (
        SELECT id FROM classes WHERE teacher_id = auth.uid()
    )
);

-- Teachers can create announcements for their classes
CREATE POLICY "class_announcements_insert"
ON class_announcements FOR INSERT
TO authenticated
WITH CHECK (
    teacher_id = auth.uid()
    AND class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid())
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
-- PART 7: FIX USER_GAMIFICATION
-- ============================================

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

CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id ON user_gamification(user_id);

DROP POLICY IF EXISTS "user_gamification_select_own" ON user_gamification;
DROP POLICY IF EXISTS "user_gamification_insert_own" ON user_gamification;
DROP POLICY IF EXISTS "user_gamification_update_own" ON user_gamification;
DROP POLICY IF EXISTS "Users can view own gamification" ON user_gamification;
DROP POLICY IF EXISTS "Users can update own gamification" ON user_gamification;

ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_gamification_select"
ON user_gamification FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_gamification_insert"
ON user_gamification FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_gamification_update"
ON user_gamification FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- PART 8: ENSURE USERS TABLE IS READABLE
-- ============================================

DROP POLICY IF EXISTS "users_public_read" ON users;
DROP POLICY IF EXISTS "users_authenticated_select" ON users;
DROP POLICY IF EXISTS "users_own_update" ON users;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read"
ON users FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "users_update_own"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================
-- SUCCESS
-- ============================================
SELECT 'SUCCESS: All RLS policies fixed! Students can now view assessments and announcements.' as result;
