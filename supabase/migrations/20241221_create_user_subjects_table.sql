-- ============================================
-- User Subjects Table
-- Tracks which subjects students have selected
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

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own subjects" ON user_subjects;
CREATE POLICY "Users can view own subjects"
    ON user_subjects FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own subjects" ON user_subjects;
CREATE POLICY "Users can insert own subjects"
    ON user_subjects FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own subjects" ON user_subjects;
CREATE POLICY "Users can delete own subjects"
    ON user_subjects FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

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
