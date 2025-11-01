-- ============================================
-- FIX: Add INSERT policy for users table
-- Run this in Supabase SQL Editor
-- ============================================

-- Allow authenticated users to create their own profile during signup
CREATE POLICY "Users can create own profile on signup"
  ON users FOR INSERT
  WITH CHECK (
    auth.uid() = id
  );

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'users';
