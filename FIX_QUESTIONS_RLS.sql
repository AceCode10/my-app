-- ============================================
-- FIX QUESTIONS & TOPICS RLS POLICIES
-- Run this ENTIRE script in Supabase SQL Editor
-- Go to: https://supabase.com/dashboard > Your Project > SQL Editor
-- ============================================

-- ============================================
-- STEP 1: DISABLE RLS TEMPORARILY (for testing)
-- ============================================
-- Uncomment these lines if you want to completely disable RLS for testing:
-- ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE topics DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: DROP ALL EXISTING QUESTION POLICIES
-- ============================================
DROP POLICY IF EXISTS "Public can view published questions" ON questions;
DROP POLICY IF EXISTS "Public can view questions" ON questions;
DROP POLICY IF EXISTS "Anyone can view published questions" ON questions;
DROP POLICY IF EXISTS "Admins can create questions" ON questions;
DROP POLICY IF EXISTS "Admins can update questions" ON questions;
DROP POLICY IF EXISTS "Super admins can delete questions" ON questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Admins can manage all questions" ON questions;
DROP POLICY IF EXISTS "questions_select_policy" ON questions;
DROP POLICY IF EXISTS "questions_insert_policy" ON questions;
DROP POLICY IF EXISTS "questions_update_policy" ON questions;
DROP POLICY IF EXISTS "questions_delete_policy" ON questions;

-- ============================================
-- STEP 3: ENABLE RLS AND CREATE NEW POLICIES
-- ============================================
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Allow ANYONE to SELECT questions (no authentication required)
CREATE POLICY "allow_public_read_questions" ON questions
  FOR SELECT 
  USING (true);

-- Allow authenticated admins to INSERT questions
CREATE POLICY "allow_admin_insert_questions" ON questions
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'content_moderator')
    )
  );

-- Allow authenticated admins to UPDATE questions
CREATE POLICY "allow_admin_update_questions" ON questions
  FOR UPDATE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'content_moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'content_moderator')
    )
  );

-- Allow authenticated admins to DELETE questions
CREATE POLICY "allow_admin_delete_questions" ON questions
  FOR DELETE 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'content_moderator')
    )
  );

-- ============================================
-- FIX TOPICS RLS POLICIES (if needed)
-- ============================================
DROP POLICY IF EXISTS "Public can view published topics" ON topics;
DROP POLICY IF EXISTS "Public can view topics" ON topics;
DROP POLICY IF EXISTS "Admins can manage topics" ON topics;
DROP POLICY IF EXISTS "Admins can manage all topics" ON topics;

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view topics
CREATE POLICY "Public can view topics" ON topics
  FOR SELECT USING (true);

-- Allow admins to manage topics
CREATE POLICY "Admins can manage topics" ON topics
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'content_moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'content_moderator')
    )
  );

-- ============================================
-- VERIFY DATA
-- ============================================
SELECT 'Questions count:' as info, COUNT(*) as count FROM questions;
SELECT 'Topics count:' as info, COUNT(*) as count FROM topics;

-- Show sample questions
SELECT id, topic_id, visibility, LEFT(stem_md, 50) as question_preview FROM questions LIMIT 5;
