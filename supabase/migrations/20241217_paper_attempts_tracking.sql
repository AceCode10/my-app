-- ============================================
-- PAPER ATTEMPTS TRACKING
-- Adds paper_id to assessment_attempts for direct paper practice tracking
-- ============================================

-- Add paper_id column to assessment_attempts for direct paper practice
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'paper_id'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN paper_id UUID REFERENCES past_papers(id);
    END IF;
END $$;

-- Add practice_mode column to track timed vs untimed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'practice_mode'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN practice_mode TEXT CHECK (practice_mode IN ('timed', 'untimed', 'assigned'));
    END IF;
END $$;

-- Add self_score column for self-assessment
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'self_score'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN self_score DECIMAL(5,2);
    END IF;
END $$;

-- Add notes column for student notes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'notes'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Create index for paper_id lookups
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_paper ON assessment_attempts(paper_id);

-- Create a view for paper practice history
CREATE OR REPLACE VIEW paper_practice_history AS
SELECT 
    aa.id as attempt_id,
    aa.user_id,
    aa.paper_id,
    pp.title as paper_title,
    pp.year as paper_year,
    pp.session as paper_session,
    pp.paper_number,
    pp.variant,
    pp.total_marks,
    pp.duration_minutes,
    s.id as subject_id,
    s.name as subject_name,
    s.slug as subject_slug,
    aa.started_at,
    aa.submitted_at,
    aa.time_spent_seconds,
    aa.practice_mode,
    aa.self_score,
    aa.status,
    aa.notes
FROM assessment_attempts aa
JOIN past_papers pp ON pp.id = aa.paper_id
LEFT JOIN subjects s ON s.id = pp.subject_id
WHERE aa.paper_id IS NOT NULL;

-- Update RLS policy to allow users to create their own paper attempts
DROP POLICY IF EXISTS "Users can create paper attempts" ON assessment_attempts;
CREATE POLICY "Users can create paper attempts"
    ON assessment_attempts FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Allow users to update their own attempts (for submitting, adding self-score)
DROP POLICY IF EXISTS "Users can update own attempts" ON assessment_attempts;
CREATE POLICY "Users can update own attempts"
    ON assessment_attempts FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Paper attempts tracking migration complete!' as status;
