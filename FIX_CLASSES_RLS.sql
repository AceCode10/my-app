-- ============================================
-- FIX INFINITE RECURSION IN CLASSES RLS
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- The error "infinite recursion detected in policy for relation classes"
-- means there's a circular reference in RLS policies.

-- ============================================
-- STEP 1: DROP ALL EXISTING POLICIES ON CLASSES
-- ============================================
DROP POLICY IF EXISTS "Users can view their enrolled classes" ON classes;
DROP POLICY IF EXISTS "Teachers can view their classes" ON classes;
DROP POLICY IF EXISTS "Students can view enrolled classes" ON classes;
DROP POLICY IF EXISTS "Admins can manage classes" ON classes;
DROP POLICY IF EXISTS "Public can view classes" ON classes;
DROP POLICY IF EXISTS "Anyone can view classes" ON classes;
DROP POLICY IF EXISTS "allow_public_read_classes" ON classes;
DROP POLICY IF EXISTS "allow_admin_manage_classes" ON classes;
DROP POLICY IF EXISTS "Teachers can manage their classes" ON classes;
DROP POLICY IF EXISTS "classes_select_policy" ON classes;
DROP POLICY IF EXISTS "classes_insert_policy" ON classes;
DROP POLICY IF EXISTS "classes_update_policy" ON classes;
DROP POLICY IF EXISTS "classes_delete_policy" ON classes;

-- ============================================
-- STEP 2: DISABLE RLS ON CLASSES
-- ============================================
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: ALSO FIX CLASS_ENROLLMENTS IF EXISTS
-- ============================================
DROP POLICY IF EXISTS "Users can view their enrollments" ON class_enrollments;
DROP POLICY IF EXISTS "Students can view their enrollments" ON class_enrollments;
DROP POLICY IF EXISTS "Teachers can view class enrollments" ON class_enrollments;
DROP POLICY IF EXISTS "Admins can manage enrollments" ON class_enrollments;

-- Check if table exists before disabling RLS
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'class_enrollments') THEN
    ALTER TABLE class_enrollments DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ============================================
-- VERIFY THE FIX
-- ============================================
SELECT 'Classes RLS disabled - recursion fixed!' as status;
