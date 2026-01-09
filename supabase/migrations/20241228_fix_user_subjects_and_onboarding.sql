-- ============================================
-- FIX USER SUBJECTS TABLE AND ENHANCE ONBOARDING
-- Ensures user_subjects table exists and adds comprehensive onboarding support
-- ============================================

-- Create user_subjects table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure a user can only add a subject once
    UNIQUE(user_id, subject_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subjects_user_id ON user_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subjects_subject_id ON user_subjects(subject_id);

-- Enable RLS
ALTER TABLE user_subjects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own subjects" ON user_subjects;
DROP POLICY IF EXISTS "Users can insert own subjects" ON user_subjects;
DROP POLICY IF EXISTS "Users can delete own subjects" ON user_subjects;
DROP POLICY IF EXISTS "Teachers can view all subjects" ON user_subjects;

-- RLS Policies for students
CREATE POLICY "Users can view own subjects"
    ON user_subjects FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subjects"
    ON user_subjects FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own subjects"
    ON user_subjects FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- RLS Policy for teachers to view all subjects (for class management)
CREATE POLICY "Teachers can view all subjects"
    ON user_subjects FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'teacher'
        )
    );

-- Add level column to users if it doesn't exist (single level for students)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'level'
    ) THEN
        ALTER TABLE users ADD COLUMN level TEXT;
    END IF;
END $$;

-- Add levels column for teachers (multiple levels)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'levels'
    ) THEN
        ALTER TABLE users ADD COLUMN levels TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Add exam_boards column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'exam_boards'
    ) THEN
        ALTER TABLE users ADD COLUMN exam_boards TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Add onboarding_completed flag if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'onboarding_completed'
    ) THEN
        ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create education_levels table if it doesn't exist
CREATE TABLE IF NOT EXISTS education_levels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    exam_boards TEXT[] DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on education_levels
ALTER TABLE education_levels ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view education levels" ON education_levels;

-- Everyone can read levels
CREATE POLICY "Anyone can view education levels" ON education_levels
    FOR SELECT TO authenticated
    USING (true);

-- Insert or update education levels
INSERT INTO education_levels (id, name, description, exam_boards, display_order) VALUES
    ('igcse', 'IGCSE', 'International General Certificate of Secondary Education (Ages 14-16)', ARRAY['cambridge', 'edexcel'], 1),
    ('gcse', 'GCSE', 'General Certificate of Secondary Education (Ages 14-16)', ARRAY['aqa', 'ocr', 'edexcel'], 2),
    ('as_level', 'AS Level', 'Advanced Subsidiary Level (Ages 16-17)', ARRAY['cambridge', 'edexcel', 'aqa', 'ocr'], 3),
    ('a_level', 'A Level', 'Advanced Level (Ages 16-18)', ARRAY['cambridge', 'edexcel', 'aqa', 'ocr'], 4),
    ('ib_myp', 'IB MYP', 'International Baccalaureate Middle Years Programme (Ages 11-16)', ARRAY['ib'], 5),
    ('ib_dp', 'IB DP', 'International Baccalaureate Diploma Programme (Ages 16-19)', ARRAY['ib'], 6),
    ('ap', 'AP', 'Advanced Placement (High School)', ARRAY['ap'], 7)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    exam_boards = EXCLUDED.exam_boards,
    display_order = EXCLUDED.display_order;

-- Add level column to subjects table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' AND column_name = 'level'
    ) THEN
        ALTER TABLE subjects ADD COLUMN level TEXT;
    END IF;
END $$;

-- Create indexes for faster filtering
CREATE INDEX IF NOT EXISTS idx_users_level ON users (level);
CREATE INDEX IF NOT EXISTS idx_users_levels ON users USING GIN (levels);
CREATE INDEX IF NOT EXISTS idx_users_exam_boards ON users USING GIN (exam_boards);
CREATE INDEX IF NOT EXISTS idx_subjects_level ON subjects (level);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_subjects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_user_subjects_updated_at_trigger ON user_subjects;
CREATE TRIGGER update_user_subjects_updated_at_trigger
    BEFORE UPDATE ON user_subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_user_subjects_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_subjects IS 'Tracks which subjects users have selected for their personalized experience';
COMMENT ON COLUMN users.level IS 'Single education level for students (e.g., igcse, a_level)';
COMMENT ON COLUMN users.levels IS 'Multiple education levels for teachers (e.g., {igcse, a_level})';
COMMENT ON COLUMN users.exam_boards IS 'Array of exam board codes the user is studying/teaching';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether user has completed initial onboarding';
