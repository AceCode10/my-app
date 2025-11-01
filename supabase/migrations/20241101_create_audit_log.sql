-- ============================================
-- AUDIT LOG TABLE
-- Track all admin actions for accountability
-- ============================================

-- NOTE: If audit_logs table already exists, this will skip creation
-- If you get errors about existing columns, the table structure is different
-- Run CHECK_EXISTING_SCHEMA.sql to see your current table structure

-- Create table only if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'approve', 'reject'
  resource_type TEXT NOT NULL, -- 'user', 'question', 'past_paper', 'flashcard', 'setting', etc.
  resource_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context (old values, new values, etc.)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables with different structure)
DO $$ 
BEGIN
  -- Add user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Add action if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'action'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN action TEXT NOT NULL DEFAULT 'unknown';
  END IF;

  -- Add resource_type if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'resource_type'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN resource_type TEXT NOT NULL DEFAULT 'unknown';
  END IF;

  -- Add resource_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'resource_id'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN resource_id UUID;
  END IF;

  -- Add description if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'description'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN description TEXT NOT NULL DEFAULT '';
  END IF;

  -- Add metadata if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;

  -- Add ip_address if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN ip_address INET;
  END IF;

  -- Add user_agent if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
  END IF;

  -- Add created_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'audit_logs' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log(
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, description, metadata)
  VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_description, p_metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all admin actions';
COMMENT ON FUNCTION create_audit_log IS 'Helper function to create audit log entries';
