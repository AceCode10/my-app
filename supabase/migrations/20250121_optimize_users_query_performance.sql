-- ============================================
-- OPTIMIZE USERS TABLE QUERY PERFORMANCE
-- Fix slow login by adding indexes and simplifying RLS
-- ============================================

-- Ensure primary key index exists (should already exist, but verify)
-- PostgreSQL automatically creates an index on PRIMARY KEY columns
-- But let's ensure it's optimal

-- Add index on id for faster lookups (if not already exists from PRIMARY KEY)
-- This is critical for the .eq('id', userId) query
CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

-- Add index on email for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Analyze the users table to update statistics for query planner
ANALYZE users;

-- ============================================
-- SIMPLIFY RLS POLICIES FOR FASTER EVALUATION
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "users_read" ON users;
DROP POLICY IF EXISTS "users_authenticated_select" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_own_update" ON users;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Simple, fast policy: authenticated users can read all users
-- This is the fastest possible RLS policy
CREATE POLICY "users_select_policy"
ON users FOR SELECT
TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "users_update_policy"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Users can insert their own profile (for signup)
DROP POLICY IF EXISTS "users_insert_policy" ON users;
CREATE POLICY "users_insert_policy"
ON users FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================
-- VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================

-- Ensure the foreign key to auth.users is properly indexed
-- This should already exist, but let's verify
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_id_fkey'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Users table optimized for fast queries!' as result;
