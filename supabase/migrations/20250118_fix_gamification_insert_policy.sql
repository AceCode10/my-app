-- Fix gamification INSERT policy to allow users to create their own record
-- Migration: 20250118_fix_gamification_insert_policy.sql

-- Drop existing insert policy if exists
DROP POLICY IF EXISTS "Users can insert own gamification" ON user_gamification;

-- Create policy to allow users to insert their own gamification record
CREATE POLICY "Users can insert own gamification" ON user_gamification
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also enable real-time for the table
ALTER PUBLICATION supabase_realtime ADD TABLE user_gamification;
