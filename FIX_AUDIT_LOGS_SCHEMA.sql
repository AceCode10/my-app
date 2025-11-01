-- ============================================
-- FIX AUDIT LOGS SCHEMA
-- This will update your existing audit_logs table to match the new schema
-- ============================================

-- First, let's see what columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- If you see columns like 'actor_id', 'target_table', 'target_id', 'details'
-- Run this to rename them to the new schema:

-- Rename columns to match new schema
DO $$ 
BEGIN
  -- Rename actor_id to user_id (if it exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'actor_id'
  ) THEN
    ALTER TABLE audit_logs RENAME COLUMN actor_id TO user_id;
  END IF;

  -- Rename target_table to resource_type (if it exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'target_table'
  ) THEN
    ALTER TABLE audit_logs RENAME COLUMN target_table TO resource_type;
  END IF;

  -- Rename target_id to resource_id (if it exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'target_id'
  ) THEN
    ALTER TABLE audit_logs RENAME COLUMN target_id TO resource_id;
  END IF;

  -- Rename details to metadata (if it exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'details'
  ) THEN
    ALTER TABLE audit_logs RENAME COLUMN details TO metadata;
  END IF;

  -- Add description column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'description'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN description TEXT NOT NULL DEFAULT '';
  END IF;

  -- Make resource_type nullable if it's not null
  ALTER TABLE audit_logs ALTER COLUMN resource_type DROP NOT NULL;
  
  -- Make resource_id nullable if it's not null (it should be UUID type)
  ALTER TABLE audit_logs ALTER COLUMN resource_id DROP NOT NULL;

END $$;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;
