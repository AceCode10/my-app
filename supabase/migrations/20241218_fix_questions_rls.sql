-- ============================================
-- FIX: Questions table RLS policies
-- The empty {} error indicates RLS is blocking inserts
-- ============================================

-- First, ensure the columns exist
ALTER TABLE questions ADD COLUMN IF NOT EXISTS paper_id UUID REFERENCES past_papers(id) ON DELETE CASCADE;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS section_name TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS part_label TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create index for paper_id
CREATE INDEX IF NOT EXISTS idx_questions_paper_id ON questions(paper_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view questions" ON questions;
DROP POLICY IF EXISTS "Admins can manage all questions" ON questions;
DROP POLICY IF EXISTS "Authenticated users can insert questions" ON questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON questions;

-- Recreate policies with correct syntax
-- Policy 1: Anyone can view published questions
CREATE POLICY "Public can view questions"
    ON questions FOR SELECT
    USING (true);

-- Policy 2: Authenticated admins can do everything
-- Using a simpler check that's more reliable
CREATE POLICY "Admins can manage questions"
    ON questions FOR ALL
    TO authenticated
    USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'content_moderator', 'admin')
    )
    WITH CHECK (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'content_moderator', 'admin')
    );

SELECT 'RLS policies updated for questions table' as status;
