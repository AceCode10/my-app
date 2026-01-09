-- ============================================
-- CLEANUP: Drop Unused Tables
-- Run this in Supabase SQL Editor
-- ============================================

-- WARNING: This migration drops tables that are NOT used in the codebase
-- Based on comprehensive analysis of all code references

-- 1. Drop unused attempts table (completely unused in codebase)
-- test_attempts and assessment_attempts are the active ones
DROP TABLE IF EXISTS attempts CASCADE;

-- 2. Drop unused assessment_assignments table (completely unused in codebase)
-- assignments table is the active one
DROP TABLE IF EXISTS assessment_assignments CASCADE;

-- 3. Drop unused papers table (completely unused in codebase)
-- past_papers table is the active one
DROP TABLE IF EXISTS papers CASCADE;

-- 4. Drop backup messages table (archive, no longer needed)
DROP TABLE IF EXISTS messages_backup_20251228 CASCADE;

-- 5. Clean up any orphaned indexes/constraints
-- (This will silently fail if they don't exist, which is fine)

SELECT 'Unused tables cleanup completed!' as result;
