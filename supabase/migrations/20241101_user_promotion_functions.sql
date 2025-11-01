-- ============================================
-- USER PROMOTION/DEMOTION FUNCTIONS
-- Functions to promote/demote users to/from admin roles
-- ============================================

-- Function to promote user to admin
CREATE OR REPLACE FUNCTION promote_user_to_admin(
  p_user_email TEXT,
  p_admin_role TEXT -- 'super_admin' or 'content_moderator'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM users WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', p_user_email;
  END IF;
  
  -- Validate role
  IF p_admin_role NOT IN ('super_admin', 'content_moderator') THEN
    RAISE EXCEPTION 'Invalid admin role: %. Must be super_admin or content_moderator', p_admin_role;
  END IF;
  
  -- Update user role
  UPDATE users 
  SET role = p_admin_role
  WHERE id = v_user_id;
  
  -- Create audit log
  PERFORM create_audit_log(
    auth.uid(),
    'promote',
    'user',
    v_user_id,
    format('Promoted %s to %s', p_user_email, p_admin_role),
    jsonb_build_object('new_role', p_admin_role)
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to demote admin to regular user
CREATE OR REPLACE FUNCTION demote_admin_to_user(
  p_user_email TEXT,
  p_new_role TEXT DEFAULT 'student' -- 'student' or 'teacher'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_old_role TEXT;
BEGIN
  -- Get user ID and current role
  SELECT id, role INTO v_user_id, v_old_role 
  FROM users 
  WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', p_user_email;
  END IF;
  
  -- Validate new role
  IF p_new_role NOT IN ('student', 'teacher') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be student or teacher', p_new_role;
  END IF;
  
  -- Update user role
  UPDATE users 
  SET role = p_new_role
  WHERE id = v_user_id;
  
  -- Create audit log
  PERFORM create_audit_log(
    auth.uid(),
    'demote',
    'user',
    v_user_id,
    format('Demoted %s from %s to %s', p_user_email, v_old_role, p_new_role),
    jsonb_build_object('old_role', v_old_role, 'new_role', p_new_role)
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to change user role (general purpose)
CREATE OR REPLACE FUNCTION change_user_role(
  p_user_email TEXT,
  p_new_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_old_role TEXT;
BEGIN
  -- Get user ID and current role
  SELECT id, role INTO v_user_id, v_old_role 
  FROM users 
  WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', p_user_email;
  END IF;
  
  -- Validate role
  IF p_new_role NOT IN ('student', 'teacher', 'content_moderator', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;
  
  -- Update user role
  UPDATE users 
  SET role = p_new_role
  WHERE id = v_user_id;
  
  -- Create audit log
  PERFORM create_audit_log(
    auth.uid(),
    'update',
    'user',
    v_user_id,
    format('Changed role for %s from %s to %s', p_user_email, v_old_role, p_new_role),
    jsonb_build_object('old_role', v_old_role, 'new_role', p_new_role)
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION promote_user_to_admin IS 'Promote a user to admin role (super_admin or content_moderator)';
COMMENT ON FUNCTION demote_admin_to_user IS 'Demote an admin back to regular user (student or teacher)';
COMMENT ON FUNCTION change_user_role IS 'Change a user role to any valid role';
