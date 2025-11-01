-- ============================================
-- SIMPLIFIED ADMIN RLS POLICIES
-- Row-Level Security policies using existing users.role
-- ============================================

-- NOTE: Run 20241101_create_audit_log.sql FIRST before running this!

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Content moderators can view their own logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins can create audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs are immutable" ON audit_logs;
DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON audit_logs;

-- Enable RLS on audit_logs table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

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

-- Drop existing user policies if they exist
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Super admins can update any user" ON users;
DROP POLICY IF EXISTS "Super admins can delete users" ON users;
DROP POLICY IF EXISTS "Super admins can create users" ON users;
DROP POLICY IF EXISTS "Content moderators can view user info" ON users;

-- Super admins can view all users
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  TO authenticated
  USING (is_super_admin(auth.uid()) OR id = auth.uid());

-- Super admins can update any user
CREATE POLICY "Super admins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (is_super_admin(auth.uid()) OR id = auth.uid())
  WITH CHECK (is_super_admin(auth.uid()) OR id = auth.uid());

-- Super admins can delete users (soft delete recommended)
CREATE POLICY "Super admins can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- Super admins can create users
CREATE POLICY "Super admins can create users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin(auth.uid()));

-- Content moderators can view user names (for content attribution)
CREATE POLICY "Content moderators can view user info"
  ON users FOR SELECT
  TO authenticated
  USING (
    is_content_moderator(auth.uid()) OR id = auth.uid()
  );

-- ============================================
-- QUESTIONS TABLE POLICIES (if not already set)
-- ============================================

-- Drop existing question policies if they exist
DROP POLICY IF EXISTS "Anyone can view published questions" ON questions;
DROP POLICY IF EXISTS "Admins can create questions" ON questions;
DROP POLICY IF EXISTS "Admins can update questions" ON questions;
DROP POLICY IF EXISTS "Super admins can delete questions" ON questions;

-- Enable RLS on questions if not already enabled
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Everyone can view published questions
CREATE POLICY "Anyone can view published questions"
  ON questions FOR SELECT
  TO authenticated
  USING (visibility = 'published' OR is_any_admin(auth.uid()));

-- Admins can create questions
CREATE POLICY "Admins can create questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (is_any_admin(auth.uid()));

-- Admins can update questions
CREATE POLICY "Admins can update questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (is_any_admin(auth.uid()))
  WITH CHECK (is_any_admin(auth.uid()));

-- Only super admins can delete questions
CREATE POLICY "Super admins can delete questions"
  ON questions FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- ============================================
-- PAST_PAPERS TABLE POLICIES (if not already set)
-- ============================================

-- Drop existing past paper policies if they exist
DROP POLICY IF EXISTS "Anyone can view published past papers" ON past_papers;
DROP POLICY IF EXISTS "Admins can create past papers" ON past_papers;
DROP POLICY IF EXISTS "Admins can update past papers" ON past_papers;
DROP POLICY IF EXISTS "Super admins can delete past papers" ON past_papers;

-- Enable RLS on past_papers if not already enabled
ALTER TABLE past_papers ENABLE ROW LEVEL SECURITY;

-- Everyone can view published past papers
CREATE POLICY "Anyone can view published past papers"
  ON past_papers FOR SELECT
  TO authenticated
  USING (status = 'published' OR is_any_admin(auth.uid()));

-- Admins can create past papers
CREATE POLICY "Admins can create past papers"
  ON past_papers FOR INSERT
  TO authenticated
  WITH CHECK (is_any_admin(auth.uid()));

-- Admins can update past papers
CREATE POLICY "Admins can update past papers"
  ON past_papers FOR UPDATE
  TO authenticated
  USING (is_any_admin(auth.uid()))
  WITH CHECK (is_any_admin(auth.uid()));

-- Only super admins can delete past papers
CREATE POLICY "Super admins can delete past papers"
  ON past_papers FOR DELETE
  TO authenticated
  USING (is_super_admin(auth.uid()));

-- ============================================
-- SUBJECTS TABLE POLICIES
-- ============================================

-- Drop existing subject policies if they exist
DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;

-- Enable RLS on subjects if not already enabled
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

-- Everyone can view subjects
CREATE POLICY "Anyone can view subjects"
  ON subjects FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage subjects
CREATE POLICY "Admins can manage subjects"
  ON subjects FOR ALL
  TO authenticated
  USING (is_any_admin(auth.uid()))
  WITH CHECK (is_any_admin(auth.uid()));

-- ============================================
-- TOPICS TABLE POLICIES
-- ============================================

-- Drop existing topic policies if they exist
DROP POLICY IF EXISTS "Anyone can view topics" ON topics;
DROP POLICY IF EXISTS "Admins can manage topics" ON topics;

-- Enable RLS on topics if not already enabled
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Everyone can view topics
CREATE POLICY "Anyone can view topics"
  ON topics FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage topics
CREATE POLICY "Admins can manage topics"
  ON topics FOR ALL
  TO authenticated
  USING (is_any_admin(auth.uid()))
  WITH CHECK (is_any_admin(auth.uid()));

-- Add comments
COMMENT ON POLICY "Super admins can view all audit logs" ON audit_logs IS 'Super admins can view complete audit trail';
COMMENT ON POLICY "Audit logs are immutable" ON audit_logs IS 'Audit logs cannot be modified to maintain integrity';
COMMENT ON POLICY "Admins can create questions" ON questions IS 'Content moderators and super admins can create questions';
COMMENT ON POLICY "Admins can update questions" ON questions IS 'Content moderators and super admins can update questions';
