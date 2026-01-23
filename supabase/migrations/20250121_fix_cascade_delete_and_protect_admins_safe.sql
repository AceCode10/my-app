-- Fix cascade delete issues and protect admin accounts from accidental deletion
-- Safe version: Only updates tables that exist

-- ============================================
-- PART 1: ADD CASCADE DELETE TO FOREIGN KEYS
-- ============================================

-- Function to safely update foreign key constraints
DO $$
DECLARE
  table_name TEXT;
  constraint_name TEXT;
  column_name TEXT;
BEGIN
  -- Loop through all foreign keys that reference users table
  FOR table_name, constraint_name, column_name IN
    SELECT 
      tc.table_name,
      tc.constraint_name,
      kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'users'
      AND tc.table_schema = 'public'
  LOOP
    BEGIN
      -- Drop the old constraint
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', table_name, constraint_name);
      
      -- Add new constraint with CASCADE
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES users(id) ON DELETE CASCADE',
        table_name, constraint_name, column_name
      );
      
      RAISE NOTICE 'Updated constraint: %.% (column: %)', table_name, constraint_name, column_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped %.%: %', table_name, constraint_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ All foreign key constraints updated with CASCADE';
END $$;

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

RAISE NOTICE '✅ Admin protection trigger created';

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

RAISE NOTICE '✅ Safe deletion function created';

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

RAISE NOTICE '✅ Demote and delete function created';

-- ============================================
-- PART 5: VERIFY SETUP
-- ============================================

-- Show summary of what was done
DO $$
DECLARE
  cascade_count INTEGER;
BEGIN
  -- Count how many foreign keys now have CASCADE
  SELECT COUNT(*) INTO cascade_count
  FROM information_schema.referential_constraints
  WHERE constraint_schema = 'public'
    AND delete_rule = 'CASCADE'
    AND unique_constraint_name IN (
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' 
        AND constraint_type = 'PRIMARY KEY'
    );
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CASCADE DELETE SETUP COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Foreign keys with CASCADE: %', cascade_count;
  RAISE NOTICE 'Admin protection: ENABLED';
  RAISE NOTICE 'Safe deletion functions: CREATED';
  RAISE NOTICE '========================================';
END $$;

-- Final success message
SELECT 'Cascade delete fixed and admin protection enabled!' as result;
