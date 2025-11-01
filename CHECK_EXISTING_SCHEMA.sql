-- ============================================
-- CHECK EXISTING DATABASE SCHEMA
-- Run this to see what already exists
-- ============================================

-- Check if audit_logs table exists and its structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- Check if users table exists and its structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check existing functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%admin%' OR routine_name LIKE '%audit%'
ORDER BY routine_name;

-- Check existing RLS policies on audit_logs
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'audit_logs';
