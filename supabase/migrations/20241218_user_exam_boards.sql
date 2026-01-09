-- ============================================
-- ADD EXAM BOARDS SELECTION TO USERS TABLE
-- Allows users to select which exam boards they're studying
-- ============================================

-- Add exam_boards column to users table (array of exam board codes)
ALTER TABLE users ADD COLUMN IF NOT EXISTS exam_boards TEXT[] DEFAULT '{}';

-- Add subjects_of_interest column for tracking preferred subjects
ALTER TABLE users ADD COLUMN IF NOT EXISTS subjects_of_interest UUID[] DEFAULT '{}';

-- Add onboarding_completed flag to track if user has completed initial setup
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create index for faster filtering by exam boards
CREATE INDEX IF NOT EXISTS idx_users_exam_boards ON users USING GIN (exam_boards);

-- Update RLS policies to allow users to update their own exam_boards
DROP POLICY IF EXISTS "Users can update own exam_boards" ON users;
CREATE POLICY "Users can update own exam_boards" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMENT ON COLUMN users.exam_boards IS 'Array of exam board codes the user is studying (e.g., CIE, IB, EDEX)';
COMMENT ON COLUMN users.subjects_of_interest IS 'Array of subject IDs the user is interested in';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether user has completed initial onboarding (exam board selection)';
