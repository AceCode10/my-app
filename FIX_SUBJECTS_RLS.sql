-- ============================================
-- FIX SUBJECTS TABLE RLS FOR INSERTS
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Public can view subjects" ON subjects;
DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;
DROP POLICY IF EXISTS "allow_public_read_subjects" ON subjects;
DROP POLICY IF EXISTS "allow_admin_manage_subjects" ON subjects;
DROP POLICY IF EXISTS "subjects_select_policy" ON subjects;
DROP POLICY IF EXISTS "subjects_insert_policy" ON subjects;
DROP POLICY IF EXISTS "subjects_update_policy" ON subjects;
DROP POLICY IF EXISTS "subjects_delete_policy" ON subjects;

-- Enable RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read subjects
CREATE POLICY "subjects_public_read" ON subjects
  FOR SELECT USING (true);

-- Allow authenticated users with admin roles to insert
CREATE POLICY "subjects_admin_insert" ON subjects
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'content_moderator', 'admin')
    )
  );

-- Allow authenticated users with admin roles to update
CREATE POLICY "subjects_admin_update" ON subjects
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'content_moderator', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'content_moderator', 'admin')
    )
  );

-- Allow authenticated users with admin roles to delete
CREATE POLICY "subjects_admin_delete" ON subjects
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('super_admin', 'content_moderator', 'admin')
    )
  );

-- Verify
SELECT 'Subjects RLS policies fixed!' as status;
