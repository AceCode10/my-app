-- Fix Notes RLS Policies for Admin Access
-- Run this if notes page is still showing "Loading component..."

-- First, check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'notes';

-- Temporarily disable RLS to test (ONLY FOR DEBUGGING)
-- ALTER TABLE notes DISABLE ROW LEVEL SECURITY;

-- Better solution: Add admin policy if it doesn't exist
DO $$ 
BEGIN
    -- Drop existing admin policy if it exists
    DROP POLICY IF EXISTS "Admins can manage all notes" ON notes;
    
    -- Create comprehensive admin policy
    CREATE POLICY "Admins can manage all notes"
        ON notes FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND (
                    users.is_admin = true 
                    OR users.role IN ('super_admin', 'content_moderator')
                )
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND (
                    users.is_admin = true 
                    OR users.role IN ('super_admin', 'content_moderator')
                )
            )
        );
END $$;

-- Also add a policy for viewing all notes (for admin dashboard)
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can view all notes" ON notes;
    
    CREATE POLICY "Admins can view all notes"
        ON notes FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND (
                    users.is_admin = true 
                    OR users.role IN ('super_admin', 'content_moderator')
                )
            )
        );
END $$;

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'notes'
ORDER BY policyname;

-- Test query (should return notes if you're an admin)
SELECT COUNT(*) as note_count FROM notes;
