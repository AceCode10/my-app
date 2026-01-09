-- ============================================
-- COMPREHENSIVE FIX FOR ALL RLS ISSUES
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: FIX QUESTIONS TABLE
-- ============================================

-- Drop all existing policies on questions
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'questions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON questions', pol.policyname);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view questions
CREATE POLICY "questions_select_all"
ON questions FOR SELECT
TO authenticated
USING (true);

-- Allow admins/teachers to manage questions
CREATE POLICY "questions_manage"
ON questions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('super_admin', 'admin', 'content_moderator', 'teacher')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('super_admin', 'admin', 'content_moderator', 'teacher')
    )
);

-- ============================================
-- PART 2: FIX TESTS TABLE
-- ============================================

-- Drop all existing policies on tests
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'tests'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON tests', pol.policyname);
    END LOOP;
END $$;

-- Enable RLS
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;

-- Users can view their own tests
CREATE POLICY "tests_select_own"
ON tests FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- Users can insert their own tests
CREATE POLICY "tests_insert_own"
ON tests FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Users can update their own tests
CREATE POLICY "tests_update_own"
ON tests FOR UPDATE
TO authenticated
USING (created_by = auth.uid());

-- Users can delete their own tests
CREATE POLICY "tests_delete_own"
ON tests FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- Admins can manage all tests
CREATE POLICY "tests_admin_all"
ON tests FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('super_admin', 'admin')
    )
);

-- ============================================
-- PART 3: FIX CLASSES TABLE
-- ============================================

-- Drop all existing policies on classes
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'classes'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON classes', pol.policyname);
    END LOOP;
END $$;

-- Create helper function if not exists
CREATE OR REPLACE FUNCTION is_enrolled_student(class_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM enrollments 
    WHERE class_id = class_uuid 
    AND user_id = auth.uid() 
    AND status = 'active'
  );
$$;

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Teachers can do everything with their own classes
CREATE POLICY "classes_teacher_all"
ON classes FOR ALL
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

-- Students can view classes they're enrolled in
CREATE POLICY "classes_student_view"
ON classes FOR SELECT
TO authenticated
USING (is_enrolled_student(id));

-- Admins can manage all classes
CREATE POLICY "classes_admin_all"
ON classes FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('super_admin', 'admin')
    )
);

-- ============================================
-- PART 4: FIX ENROLLMENTS TABLE
-- ============================================

-- Drop all existing policies on enrollments
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'enrollments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON enrollments', pol.policyname);
    END LOOP;
END $$;

-- Create helper function for teacher check
CREATE OR REPLACE FUNCTION is_class_owner(class_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes 
    WHERE id = class_uuid 
    AND teacher_id = auth.uid()
  );
$$;

-- Enable RLS
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Users can view their own enrollments
CREATE POLICY "enrollments_view_own"
ON enrollments FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Teachers can view enrollments for their classes
CREATE POLICY "enrollments_teacher_view"
ON enrollments FOR SELECT
TO authenticated
USING (is_class_owner(class_id));

-- Users can enroll themselves
CREATE POLICY "enrollments_insert_self"
ON enrollments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Teachers can manage enrollments for their classes
CREATE POLICY "enrollments_teacher_manage"
ON enrollments FOR ALL
TO authenticated
USING (is_class_owner(class_id));

-- ============================================
-- PART 5: GRANT PERMISSIONS
-- ============================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON enrollments TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'All RLS policies have been fixed!' as status;
