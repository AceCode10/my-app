-- ============================================
-- SIMPLIFIED ADMIN PERMISSION HELPER FUNCTIONS
-- Works with existing users.role column
-- ============================================

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id;
  
  RETURN user_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is content moderator
CREATE OR REPLACE FUNCTION is_content_moderator(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id;
  
  RETURN user_role = 'content_moderator';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is any type of admin
CREATE OR REPLACE FUNCTION is_any_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id;
  
  RETURN user_role IN ('super_admin', 'content_moderator');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is teacher
CREATE OR REPLACE FUNCTION is_teacher(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id;
  
  RETURN user_role = 'teacher';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is student
CREATE OR REPLACE FUNCTION is_student(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id;
  
  RETURN user_role = 'student';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific permission based on role
CREATE OR REPLACE FUNCTION has_permission(user_id UUID, permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id;
  
  -- Super admin has all permissions
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Content moderator permissions
  IF user_role = 'content_moderator' THEN
    RETURN permission IN (
      'manage_content',
      'upload_questions',
      'manage_past_papers',
      'create_flashcards',
      'manage_quizzes',
      'view_analytics',
      'manage_subjects'
    );
  END IF;
  
  -- Teacher permissions
  IF user_role = 'teacher' THEN
    RETURN permission IN (
      'create_tests',
      'manage_classes',
      'view_student_progress',
      'grade_assignments'
    );
  END IF;
  
  -- Students have no special permissions
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comments
COMMENT ON FUNCTION is_super_admin(UUID) IS 'Check if user is a super administrator';
COMMENT ON FUNCTION is_content_moderator(UUID) IS 'Check if user is a content moderator';
COMMENT ON FUNCTION is_any_admin(UUID) IS 'Check if user has any admin privileges';
COMMENT ON FUNCTION is_teacher(UUID) IS 'Check if user is a teacher';
COMMENT ON FUNCTION is_student(UUID) IS 'Check if user is a student';
COMMENT ON FUNCTION has_permission(UUID, TEXT) IS 'Check if user has a specific permission based on their role';
