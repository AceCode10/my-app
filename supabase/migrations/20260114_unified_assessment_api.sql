-- ============================================
-- UNIFIED ASSESSMENT API MIGRATION
-- Adds columns needed for unified attempt tracking
-- ============================================

-- Add questions_snapshot column to assessment_attempts if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'questions_snapshot'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN questions_snapshot JSONB;
    END IF;
END $$;

-- Add topic_id column to assessment_attempts for topic quizzes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'topic_id'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN topic_id UUID REFERENCES topics(id);
    END IF;
END $$;

-- Add assignment_id column to assessment_attempts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'assignment_id'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN assignment_id UUID REFERENCES assignments(id);
    END IF;
END $$;

-- Add expires_at column to assessment_attempts for timed assessments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add requires_manual_grading column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'requires_manual_grading'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN requires_manual_grading BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add grading_details column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'grading_details'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN grading_details JSONB;
    END IF;
END $$;

-- Add answers column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'answers'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN answers JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add max_score column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'max_score'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN max_score NUMERIC;
    END IF;
END $$;

-- Add auto_graded column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'auto_graded'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN auto_graded BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_topic ON assessment_attempts(topic_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_assignment ON assessment_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_expires ON assessment_attempts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_status_expires ON assessment_attempts(status, expires_at) 
    WHERE status = 'in_progress' AND expires_at IS NOT NULL;

-- ============================================
-- XP TRANSACTIONS TABLE (for tracking XP awards)
-- ============================================
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(created_at);

-- Enable RLS
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for xp_transactions
DROP POLICY IF EXISTS "Users can view own xp transactions" ON xp_transactions;
CREATE POLICY "Users can view own xp transactions" ON xp_transactions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert xp transactions" ON xp_transactions;
CREATE POLICY "System can insert xp transactions" ON xp_transactions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- ADD RESULT RELEASE COLUMNS TO ASSIGNMENTS
-- ============================================

-- Add results_release_policy column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assignments' AND column_name = 'results_release_policy'
    ) THEN
        ALTER TABLE assignments ADD COLUMN results_release_policy TEXT DEFAULT 'immediately'
            CHECK (results_release_policy IN ('immediately', 'after_submit', 'after_due', 'manual'));
    END IF;
END $$;

-- Add results_released_at column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assignments' AND column_name = 'results_released_at'
    ) THEN
        ALTER TABLE assignments ADD COLUMN results_released_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================
-- UPDATE RLS POLICIES FOR ASSESSMENT_ATTEMPTS
-- ============================================

-- Allow users to view their own attempts
DROP POLICY IF EXISTS "Users can view own assessment attempts" ON assessment_attempts;
CREATE POLICY "Users can view own assessment attempts" ON assessment_attempts
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Allow teachers to view attempts for their assignments
DROP POLICY IF EXISTS "Teachers can view assignment attempts" ON assessment_attempts;
CREATE POLICY "Teachers can view assignment attempts" ON assessment_attempts
    FOR SELECT TO authenticated
    USING (
        assignment_id IN (
            SELECT id FROM assignments WHERE assigned_by = auth.uid()
        )
    );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Unified Assessment API migration complete!' as status;
