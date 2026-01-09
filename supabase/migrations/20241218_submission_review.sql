-- ============================================
-- SUBMISSION REVIEW SYSTEM
-- Adds class_id to track submissions and review status
-- ============================================

-- Add class_id to assessment_attempts for class-based submissions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'class_id'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN class_id UUID REFERENCES classes(id);
    END IF;
END $$;

-- Add review status columns
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'review_status'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN review_status TEXT DEFAULT 'pending' 
            CHECK (review_status IN ('pending', 'in_review', 'reviewed', 'returned'));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'reviewed_by'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN reviewed_by UUID REFERENCES public.users(id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'reviewed_at'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN reviewed_at TIMESTAMPTZ;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'reviewer_feedback'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN reviewer_feedback TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'awarded_marks'
    ) THEN
        ALTER TABLE assessment_attempts ADD COLUMN awarded_marks INTEGER;
    END IF;
END $$;

-- Create index for class_id lookups
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_class ON assessment_attempts(class_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_review_status ON assessment_attempts(review_status);

-- Add marks_awarded column to paper_attempt_answers for per-question grading
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'paper_attempt_answers' AND column_name = 'marks_awarded'
    ) THEN
        ALTER TABLE paper_attempt_answers ADD COLUMN marks_awarded INTEGER;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'paper_attempt_answers' AND column_name = 'feedback'
    ) THEN
        ALTER TABLE paper_attempt_answers ADD COLUMN feedback TEXT;
    END IF;
END $$;

-- RLS: Admins can view ALL submitted attempts
DROP POLICY IF EXISTS "Admins can view all submissions" ON assessment_attempts;
CREATE POLICY "Admins can view all submissions"
    ON assessment_attempts FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- RLS: Admins can update ALL attempts (for grading)
DROP POLICY IF EXISTS "Admins can update all submissions" ON assessment_attempts;
CREATE POLICY "Admins can update all submissions"
    ON assessment_attempts FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- RLS: Teachers can view submissions from their classes
DROP POLICY IF EXISTS "Teachers can view class submissions" ON assessment_attempts;
CREATE POLICY "Teachers can view class submissions"
    ON assessment_attempts FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = assessment_attempts.class_id
            AND classes.teacher_id = auth.uid()
        )
    );

-- RLS: Teachers can update submissions from their classes (for grading)
DROP POLICY IF EXISTS "Teachers can grade class submissions" ON assessment_attempts;
CREATE POLICY "Teachers can grade class submissions"
    ON assessment_attempts FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM classes
            WHERE classes.id = assessment_attempts.class_id
            AND classes.teacher_id = auth.uid()
        )
    );

-- RLS: Content moderators can view all submissions without class_id
DROP POLICY IF EXISTS "Content moderators can view unassigned submissions" ON assessment_attempts;
CREATE POLICY "Content moderators can view unassigned submissions"
    ON assessment_attempts FOR SELECT
    TO authenticated
    USING (
        (class_id IS NULL AND status = 'submitted')
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- RLS: Content moderators can update unassigned submissions
DROP POLICY IF EXISTS "Content moderators can grade unassigned submissions" ON assessment_attempts;
CREATE POLICY "Content moderators can grade unassigned submissions"
    ON assessment_attempts FOR UPDATE
    TO authenticated
    USING (
        (class_id IS NULL)
        AND EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- RLS: Teachers can view answers for submissions in their classes
DROP POLICY IF EXISTS "Teachers can view class submission answers" ON paper_attempt_answers;
CREATE POLICY "Teachers can view class submission answers"
    ON paper_attempt_answers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessment_attempts aa
            JOIN classes c ON c.id = aa.class_id
            WHERE aa.id = paper_attempt_answers.attempt_id
            AND c.teacher_id = auth.uid()
        )
    );

-- RLS: Teachers can update answers for grading
DROP POLICY IF EXISTS "Teachers can grade class submission answers" ON paper_attempt_answers;
CREATE POLICY "Teachers can grade class submission answers"
    ON paper_attempt_answers FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessment_attempts aa
            JOIN classes c ON c.id = aa.class_id
            WHERE aa.id = paper_attempt_answers.attempt_id
            AND c.teacher_id = auth.uid()
        )
    );

-- RLS: Content moderators can view/update unassigned submission answers
DROP POLICY IF EXISTS "Content moderators can view unassigned answers" ON paper_attempt_answers;
CREATE POLICY "Content moderators can view unassigned answers"
    ON paper_attempt_answers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessment_attempts aa
            WHERE aa.id = paper_attempt_answers.attempt_id
            AND aa.class_id IS NULL
            AND EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = auth.uid()
                AND users.role IN ('super_admin', 'content_moderator')
            )
        )
    );

DROP POLICY IF EXISTS "Content moderators can grade unassigned answers" ON paper_attempt_answers;
CREATE POLICY "Content moderators can grade unassigned answers"
    ON paper_attempt_answers FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessment_attempts aa
            WHERE aa.id = paper_attempt_answers.attempt_id
            AND aa.class_id IS NULL
            AND EXISTS (
                SELECT 1 FROM public.users
                WHERE users.id = auth.uid()
                AND users.role IN ('super_admin', 'content_moderator')
            )
        )
    );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Submission review system migration complete!' as status;
