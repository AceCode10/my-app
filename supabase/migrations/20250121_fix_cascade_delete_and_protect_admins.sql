-- Fix cascade delete issues and protect admin accounts from accidental deletion
-- This migration ensures:
-- 1. All foreign keys have ON DELETE CASCADE for proper cleanup
-- 2. Admin/moderator accounts cannot be accidentally deleted

-- ============================================
-- PART 1: ADD CASCADE DELETE TO FOREIGN KEYS
-- ============================================

-- Drop and recreate foreign key constraints with CASCADE

-- User gamification
ALTER TABLE user_gamification 
DROP CONSTRAINT IF EXISTS user_gamification_user_id_fkey;

ALTER TABLE user_gamification 
ADD CONSTRAINT user_gamification_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User goals
ALTER TABLE user_goals 
DROP CONSTRAINT IF EXISTS user_goals_user_id_fkey;

ALTER TABLE user_goals 
ADD CONSTRAINT user_goals_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User goal preferences
ALTER TABLE user_goal_preferences 
DROP CONSTRAINT IF EXISTS user_goal_preferences_user_id_fkey;

ALTER TABLE user_goal_preferences 
ADD CONSTRAINT user_goal_preferences_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User subjects
ALTER TABLE user_subjects 
DROP CONSTRAINT IF EXISTS user_subjects_user_id_fkey;

ALTER TABLE user_subjects 
ADD CONSTRAINT user_subjects_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User topics
ALTER TABLE user_topics 
DROP CONSTRAINT IF EXISTS user_topics_user_id_fkey;

ALTER TABLE user_topics 
ADD CONSTRAINT user_topics_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User notes
ALTER TABLE user_notes 
DROP CONSTRAINT IF EXISTS user_notes_user_id_fkey;

ALTER TABLE user_notes 
ADD CONSTRAINT user_notes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User past papers
ALTER TABLE user_past_papers 
DROP CONSTRAINT IF EXISTS user_past_papers_user_id_fkey;

ALTER TABLE user_past_papers 
ADD CONSTRAINT user_past_papers_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Class members
ALTER TABLE class_members 
DROP CONSTRAINT IF EXISTS class_members_user_id_fkey;

ALTER TABLE class_members 
ADD CONSTRAINT class_members_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Classes (teacher_id)
ALTER TABLE classes 
DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;

ALTER TABLE classes 
ADD CONSTRAINT classes_teacher_id_fkey 
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- Notifications
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User progress
ALTER TABLE user_progress 
DROP CONSTRAINT IF EXISTS user_progress_user_id_fkey;

ALTER TABLE user_progress 
ADD CONSTRAINT user_progress_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Question attempts
ALTER TABLE question_attempts 
DROP CONSTRAINT IF EXISTS question_attempts_user_id_fkey;

ALTER TABLE question_attempts 
ADD CONSTRAINT question_attempts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Assessment attempts
ALTER TABLE assessment_attempts 
DROP CONSTRAINT IF EXISTS assessment_attempts_user_id_fkey;

ALTER TABLE assessment_attempts 
ADD CONSTRAINT assessment_attempts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User privacy settings
ALTER TABLE user_privacy_settings 
DROP CONSTRAINT IF EXISTS user_privacy_settings_user_id_fkey;

ALTER TABLE user_privacy_settings 
ADD CONSTRAINT user_privacy_settings_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- XP transactions
ALTER TABLE xp_transactions 
DROP CONSTRAINT IF EXISTS xp_transactions_user_id_fkey;

ALTER TABLE xp_transactions 
ADD CONSTRAINT xp_transactions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User streaks
ALTER TABLE user_streaks 
DROP CONSTRAINT IF EXISTS user_streaks_user_id_fkey;

ALTER TABLE user_streaks 
ADD CONSTRAINT user_streaks_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User badges
ALTER TABLE user_badges 
DROP CONSTRAINT IF EXISTS user_badges_user_id_fkey;

ALTER TABLE user_badges 
ADD CONSTRAINT user_badges_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- User achievements
ALTER TABLE user_achievements 
DROP CONSTRAINT IF EXISTS user_achievements_user_id_fkey;

ALTER TABLE user_achievements 
ADD CONSTRAINT user_achievements_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================
-- PART 2: PROTECT ADMIN ACCOUNTS
-- ============================================

-- Create a function to prevent deletion of admin/moderator accounts
CREATE OR REPLACE FUNCTION prevent_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user being deleted is an admin or moderator
  IF OLD.role IN ('super_admin', 'content_moderator') THEN
    RAISE EXCEPTION 'Cannot delete admin or moderator accounts. Role: %. Please demote the user first or use emergency deletion procedures.', OLD.role
      USING HINT = 'Change the user role to student or teacher before deletion',
            ERRCODE = 'restrict_violation';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent admin deletion
DROP TRIGGER IF EXISTS prevent_admin_deletion_trigger ON users;

CREATE TRIGGER prevent_admin_deletion_trigger
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_admin_deletion();

-- ============================================
-- PART 3: CREATE SAFE DELETION FUNCTION
-- ============================================

-- Create a safe deletion function that checks for admin role
CREATE OR REPLACE FUNCTION safe_delete_user(
  target_user_id UUID,
  force_delete BOOLEAN DEFAULT false
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM users WHERE id = target_user_id;
  
  IF user_role IS NULL THEN
    RETURN QUERY SELECT false, 'User not found';
    RETURN;
  END IF;
  
  -- Check if user is admin/moderator
  IF user_role IN ('super_admin', 'content_moderator') AND NOT force_delete THEN
    RETURN QUERY SELECT false, format('Cannot delete %s account. Set force_delete=true to override.', user_role);
    RETURN;
  END IF;
  
  -- Delete the user (cascade will handle related records)
  DELETE FROM users WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN QUERY SELECT true, 'User deleted successfully';
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION safe_delete_user TO authenticated;

-- ============================================
-- PART 4: CREATE ADMIN DEMOTION FUNCTION
-- ============================================

-- Function to safely demote admin before deletion
CREATE OR REPLACE FUNCTION demote_and_delete_user(
  target_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- First demote the user to student
  UPDATE users SET role = 'student' WHERE id = target_user_id;
  
  -- Then delete
  DELETE FROM users WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN QUERY SELECT true, 'User demoted and deleted successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT false, format('Error: %s', SQLERRM);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION demote_and_delete_user TO authenticated;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 'Cascade delete fixed and admin protection enabled!' as result;
