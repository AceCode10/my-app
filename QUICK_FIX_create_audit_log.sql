-- ============================================
-- QUICK FIX: Update create_audit_log function
-- This version works with your existing audit_logs table structure
-- ============================================

-- Drop the old function
DROP FUNCTION IF EXISTS create_audit_log(UUID, TEXT, TEXT, UUID, TEXT, JSONB);

-- Create new version that works with existing schema
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
  -- Insert using the column names that exist in your table
  -- Based on the error, your table has: actor_id, target_table, target_id, details
  INSERT INTO audit_logs (
    actor_id,           -- maps to p_user_id
    action,             -- maps to p_action
    target_table,       -- maps to p_resource_type
    target_id,          -- maps to p_resource_id
    details             -- maps to p_metadata (and description combined)
  )
  VALUES (
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    jsonb_build_object(
      'description', p_description,
      'metadata', p_metadata
    )
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_audit_log IS 'Helper function to create audit log entries (compatible with existing schema)';
