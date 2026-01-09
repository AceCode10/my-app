-- ============================================
-- QUICK FIX: Allow admins to view all assessment_attempts
-- Run this in Supabase SQL Editor immediately
-- ============================================

-- Allow admins (super_admin, content_moderator) to view ALL assessment attempts
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

-- Allow admins to update attempts (for grading)
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

-- Allow admins to view all paper_attempt_answers
DROP POLICY IF EXISTS "Admins can view all answers" ON paper_attempt_answers;
CREATE POLICY "Admins can view all answers"
    ON paper_attempt_answers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- Allow admins to update paper_attempt_answers (for grading)
DROP POLICY IF EXISTS "Admins can update all answers" ON paper_attempt_answers;
CREATE POLICY "Admins can update all answers"
    ON paper_attempt_answers FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

SELECT '✅ Admin RLS policies for submissions created!' as status;
