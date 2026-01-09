-- ============================================
-- FIX CLASS JOIN AND GAMIFICATION RLS ISSUES
-- ============================================

-- ============================================
-- PART 1: FIX CLASSES TABLE - Allow join code lookup
-- ============================================

-- Add policy to allow students to find classes by join code
DROP POLICY IF EXISTS "classes_join_code_lookup" ON classes;
CREATE POLICY "classes_join_code_lookup"
ON classes FOR SELECT
TO authenticated
USING (join_code IS NOT NULL);

-- ============================================
-- PART 2: FIX USER_GAMIFICATION TABLE
-- Create table if not exists and add proper RLS
-- ============================================

-- Create user_gamification table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_gamification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    streak_freeze_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id ON user_gamification(user_id);

-- Enable RLS
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "user_gamification_select_own" ON user_gamification;
DROP POLICY IF EXISTS "user_gamification_insert_own" ON user_gamification;
DROP POLICY IF EXISTS "user_gamification_update_own" ON user_gamification;

-- Users can view their own gamification data
CREATE POLICY "user_gamification_select_own"
ON user_gamification FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own gamification data
CREATE POLICY "user_gamification_insert_own"
ON user_gamification FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own gamification data
CREATE POLICY "user_gamification_update_own"
ON user_gamification FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON user_gamification TO authenticated;

-- ============================================
-- PART 3: FIX CLASS_INVITATIONS TABLE RLS
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE class_invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "class_invitations_select" ON class_invitations;
DROP POLICY IF EXISTS "class_invitations_insert" ON class_invitations;
DROP POLICY IF EXISTS "class_invitations_update" ON class_invitations;
DROP POLICY IF EXISTS "class_invitations_delete" ON class_invitations;

-- Teachers can manage invitations for their classes
CREATE POLICY "class_invitations_teacher_manage"
ON class_invitations FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = class_invitations.class_id 
        AND classes.teacher_id = auth.uid()
    )
);

-- Students can view invitations sent to their email
CREATE POLICY "class_invitations_student_view"
ON class_invitations FOR SELECT
TO authenticated
USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Students can update invitations sent to their email (accept/decline)
CREATE POLICY "class_invitations_student_update"
ON class_invitations FOR UPDATE
TO authenticated
USING (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
    invited_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON class_invitations TO authenticated;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT 'Class join, gamification, and invitation RLS policies fixed!' as status;
