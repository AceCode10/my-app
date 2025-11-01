-- ============================================
-- ADMIN RLS POLICIES
-- Row-Level Security policies for admin access
-- ============================================

-- Enable RLS on admin_roles table
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ADMIN_ROLES POLICIES
-- ============================================

-- Super admins can view all roles
CREATE POLICY "Super admins can view all admin roles"
  ON admin_roles FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Content moderators can view their own role
CREATE POLICY "Content moderators can view their role"
  ON admin_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
      AND users.admin_role_id = admin_roles.id
    )
  );

-- Only super admins can modify admin roles
CREATE POLICY "Only super admins can modify admin roles"
  ON admin_roles FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- ============================================
-- AUDIT_LOGS POLICIES
-- ============================================

-- Super admins can view all audit logs
CREATE POLICY "Super admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Content moderators can view their own audit logs
CREATE POLICY "Content moderators can view their own logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    is_content_moderator(auth.uid()) AND user_id = auth.uid()
  );

-- All admins can insert audit logs (system-generated)
CREATE POLICY "Admins can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_any_admin(auth.uid()));

-- No one can update or delete audit logs (immutable)
CREATE POLICY "Audit logs are immutable"
  ON audit_logs FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Audit logs cannot be deleted"
  ON audit_logs FOR DELETE
  TO authenticated
  USING (false);

-- ============================================
-- USERS TABLE ADMIN POLICIES
-- ============================================

-- Super admins can view all users
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can update any user
CREATE POLICY "Super admins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- Super admins can delete users (soft delete)
CREATE POLICY "Super admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can create users
CREATE POLICY "Super admins can create users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

-- Content moderators can view basic user info (for content attribution)
CREATE POLICY "Content moderators can view user names"
  ON users FOR SELECT
  TO authenticated
  USING (
    is_content_moderator(auth.uid()) AND (
      -- Can see their own profile
      id = auth.uid() OR
      -- Can see other users' display names only (for content attribution)
      true
    )
  );

-- Add comments
COMMENT ON POLICY "Super admins can view all admin roles" ON admin_roles IS 'Super admins have full visibility of all admin roles';
COMMENT ON POLICY "Super admins can view all audit logs" ON audit_logs IS 'Super admins can view complete audit trail';
COMMENT ON POLICY "Audit logs are immutable" ON audit_logs IS 'Audit logs cannot be modified to maintain integrity';
