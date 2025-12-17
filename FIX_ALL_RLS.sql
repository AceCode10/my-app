-- ============================================
-- FIX ALL RLS POLICIES FOR PUBLIC ACCESS
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- ============================================
-- FIX SUBJECTS TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Public can view subjects" ON subjects;
DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;
DROP POLICY IF EXISTS "allow_public_read_subjects" ON subjects;

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_public_read_subjects" ON subjects
  FOR SELECT USING (true);

CREATE POLICY "allow_admin_manage_subjects" ON subjects
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'content_moderator')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'content_moderator')));

-- ============================================
-- FIX TOPICS TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Public can view topics" ON topics;
DROP POLICY IF EXISTS "Public can view published topics" ON topics;
DROP POLICY IF EXISTS "Anyone can view topics" ON topics;
DROP POLICY IF EXISTS "Admins can manage topics" ON topics;
DROP POLICY IF EXISTS "Admins can manage all topics" ON topics;
DROP POLICY IF EXISTS "allow_public_read_topics" ON topics;

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_public_read_topics" ON topics
  FOR SELECT USING (true);

CREATE POLICY "allow_admin_manage_topics" ON topics
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'content_moderator')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'content_moderator')));

-- ============================================
-- FIX QUESTIONS TABLE RLS (if not already done)
-- ============================================
DROP POLICY IF EXISTS "Public can view published questions" ON questions;
DROP POLICY IF EXISTS "Public can view questions" ON questions;
DROP POLICY IF EXISTS "Anyone can view published questions" ON questions;
DROP POLICY IF EXISTS "Admins can create questions" ON questions;
DROP POLICY IF EXISTS "Admins can update questions" ON questions;
DROP POLICY IF EXISTS "Super admins can delete questions" ON questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
DROP POLICY IF EXISTS "Admins can manage all questions" ON questions;
DROP POLICY IF EXISTS "allow_public_read_questions" ON questions;
DROP POLICY IF EXISTS "allow_admin_insert_questions" ON questions;
DROP POLICY IF EXISTS "allow_admin_update_questions" ON questions;
DROP POLICY IF EXISTS "allow_admin_delete_questions" ON questions;

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_public_read_questions" ON questions
  FOR SELECT USING (true);

CREATE POLICY "allow_admin_manage_questions" ON questions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'content_moderator')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'content_moderator')));

-- ============================================
-- FIX EXAM_BOARDS TABLE RLS
-- ============================================
DROP POLICY IF EXISTS "Public can view exam boards" ON exam_boards;
DROP POLICY IF EXISTS "Anyone can view exam boards" ON exam_boards;
DROP POLICY IF EXISTS "allow_public_read_exam_boards" ON exam_boards;

ALTER TABLE exam_boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_public_read_exam_boards" ON exam_boards
  FOR SELECT USING (true);

CREATE POLICY "allow_admin_manage_exam_boards" ON exam_boards
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'content_moderator')))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin', 'content_moderator')));

-- ============================================
-- VERIFY
-- ============================================
SELECT 'Subjects:' as table_name, COUNT(*) as count FROM subjects;
SELECT 'Topics:' as table_name, COUNT(*) as count FROM topics;
SELECT 'Questions:' as table_name, COUNT(*) as count FROM questions;
SELECT 'Exam Boards:' as table_name, COUNT(*) as count FROM exam_boards;
