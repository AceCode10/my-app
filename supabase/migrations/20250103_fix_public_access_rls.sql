-- ============================================
-- FIX PUBLIC ACCESS RLS POLICIES
-- This migration ensures that public (unauthenticated) users
-- can access subjects, topics, exam_boards, and questions
-- for the public-facing pages like topical questions and past papers
-- ============================================

-- ============================================
-- PART 1: FIX EXAM_BOARDS - Allow public read
-- ============================================

-- Drop all existing select policies on exam_boards
DROP POLICY IF EXISTS "exam_boards_public_read" ON exam_boards;
DROP POLICY IF EXISTS "exam_boards_authenticated_select" ON exam_boards;
DROP POLICY IF EXISTS "Public can view exam boards" ON exam_boards;
DROP POLICY IF EXISTS "Anyone can view exam boards" ON exam_boards;

-- Enable RLS
ALTER TABLE exam_boards ENABLE ROW LEVEL SECURITY;

-- Create policy for public (anon) read access
CREATE POLICY "exam_boards_anon_select"
ON exam_boards FOR SELECT
TO anon
USING (is_active = true);

-- Create policy for authenticated read access
CREATE POLICY "exam_boards_authenticated_select"
ON exam_boards FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- PART 2: FIX SUBJECTS - Allow public read
-- ============================================

-- Drop all existing select policies on subjects
DROP POLICY IF EXISTS "subjects_public_read" ON subjects;
DROP POLICY IF EXISTS "subjects_authenticated_select" ON subjects;
DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
DROP POLICY IF EXISTS "Public can view subjects" ON subjects;

-- Enable RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Create policy for public (anon) read access - only published subjects
CREATE POLICY "subjects_anon_select"
ON subjects FOR SELECT
TO anon
USING (status = 'published');

-- Create policy for authenticated read access
CREATE POLICY "subjects_authenticated_select"
ON subjects FOR SELECT
TO authenticated
USING (true);

-- Keep admin management policy
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;
CREATE POLICY "subjects_admin_all"
ON subjects FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'content_moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'content_moderator')
  )
);

-- ============================================
-- PART 3: FIX TOPICS - Allow public read
-- ============================================

-- Drop all existing select policies on topics
DROP POLICY IF EXISTS "topics_public_read" ON topics;
DROP POLICY IF EXISTS "topics_authenticated_select" ON topics;
DROP POLICY IF EXISTS "Anyone can view topics" ON topics;
DROP POLICY IF EXISTS "Public can view topics" ON topics;

-- Enable RLS
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Create policy for public (anon) read access - only published topics
CREATE POLICY "topics_anon_select"
ON topics FOR SELECT
TO anon
USING (status = 'published');

-- Create policy for authenticated read access
CREATE POLICY "topics_authenticated_select"
ON topics FOR SELECT
TO authenticated
USING (true);

-- Keep admin management policy
DROP POLICY IF EXISTS "Admins can manage topics" ON topics;
CREATE POLICY "topics_admin_all"
ON topics FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'content_moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'content_moderator')
  )
);

-- ============================================
-- PART 4: FIX QUESTIONS - Allow public read
-- ============================================

-- Drop all existing select policies on questions
DROP POLICY IF EXISTS "questions_select" ON questions;
DROP POLICY IF EXISTS "questions_public_read" ON questions;
DROP POLICY IF EXISTS "questions_authenticated_select" ON questions;
DROP POLICY IF EXISTS "Anyone can view questions" ON questions;
DROP POLICY IF EXISTS "Public can view questions" ON questions;

-- Enable RLS
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Create policy for public (anon) read access - only published questions
CREATE POLICY "questions_anon_select"
ON questions FOR SELECT
TO anon
USING (visibility = 'published' OR status = 'published');

-- Create policy for authenticated read access
CREATE POLICY "questions_authenticated_select"
ON questions FOR SELECT
TO authenticated
USING (true);

-- Keep admin management policy
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;
CREATE POLICY "questions_admin_all"
ON questions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'content_moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'content_moderator')
  )
);

-- ============================================
-- PART 5: FIX PAST_PAPERS - Allow public read
-- ============================================

-- Drop all existing select policies on past_papers
DROP POLICY IF EXISTS "past_papers_select" ON past_papers;
DROP POLICY IF EXISTS "past_papers_public_read" ON past_papers;
DROP POLICY IF EXISTS "past_papers_authenticated_select" ON past_papers;
DROP POLICY IF EXISTS "Anyone can view past papers" ON past_papers;
DROP POLICY IF EXISTS "Public can view past papers" ON past_papers;

-- Enable RLS
ALTER TABLE past_papers ENABLE ROW LEVEL SECURITY;

-- Create policy for public (anon) read access - only published papers
CREATE POLICY "past_papers_anon_select"
ON past_papers FOR SELECT
TO anon
USING (status = 'published');

-- Create policy for authenticated read access
CREATE POLICY "past_papers_authenticated_select"
ON past_papers FOR SELECT
TO authenticated
USING (true);

-- Keep admin management policy
DROP POLICY IF EXISTS "Admins can manage past papers" ON past_papers;
CREATE POLICY "past_papers_admin_all"
ON past_papers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'content_moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'content_moderator')
  )
);

-- ============================================
-- PART 6: FIX PAPER_QUESTIONS - Allow public read
-- ============================================

-- Drop all existing select policies on paper_questions
DROP POLICY IF EXISTS "paper_questions_select" ON paper_questions;
DROP POLICY IF EXISTS "paper_questions_public_read" ON paper_questions;
DROP POLICY IF EXISTS "paper_questions_authenticated_select" ON paper_questions;
DROP POLICY IF EXISTS "Anyone can view paper questions" ON paper_questions;
DROP POLICY IF EXISTS "Public can view paper questions" ON paper_questions;

-- Enable RLS
ALTER TABLE paper_questions ENABLE ROW LEVEL SECURITY;

-- Create policy for public (anon) read access
CREATE POLICY "paper_questions_anon_select"
ON paper_questions FOR SELECT
TO anon
USING (true);

-- Create policy for authenticated read access
CREATE POLICY "paper_questions_authenticated_select"
ON paper_questions FOR SELECT
TO authenticated
USING (true);

-- Keep admin management policy
DROP POLICY IF EXISTS "Admins can manage paper questions" ON paper_questions;
CREATE POLICY "paper_questions_admin_all"
ON paper_questions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'content_moderator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'content_moderator')
  )
);

-- ============================================
-- VERIFICATION COMMENTS
-- ============================================
-- After running this migration, verify:
-- 1. Public users can view subjects at /resources/topical-questions
-- 2. Public users can view topics when clicking on a subject
-- 3. Public users can view questions when practicing
-- 4. Public users can view past papers at /resources/past-papers
-- 5. Admin users can still manage all content
