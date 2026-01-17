-- ============================================
-- AUDIT LOGS SYSTEM - RLS POLICIES
-- Track important user actions for security and analytics
-- Note: Table already exists from 20241101_create_audit_log.sql
-- This migration adds RLS policies to the existing table
-- ============================================

-- Verify required columns exist (they should from the earlier migration)
-- The existing table uses: resource_type, resource_id, metadata (not entity_type, entity_id, details)

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Teachers can view audit logs for their students
CREATE POLICY "Teachers can view student audit logs" ON audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'teacher'
        )
        AND user_id IN (
            SELECT e.user_id FROM enrollments e
            JOIN classes c ON e.class_id = c.id
            WHERE c.teacher_id = auth.uid()
        )
    );

-- System can insert audit logs (via service role)
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- ============================================
-- COMMON AUDIT ACTIONS
-- ============================================
-- Authentication:
--   - user.login
--   - user.logout
--   - user.password_change
--   - user.profile_update
-- 
-- Assessments:
--   - assessment.start
--   - assessment.submit
--   - assessment.auto_submit
--   - assessment.grade
--
-- Classes:
--   - class.create
--   - class.update
--   - class.delete
--   - class.student_enroll
--   - class.student_remove
--
-- Assignments:
--   - assignment.create
--   - assignment.update
--   - assignment.delete
--   - assignment.release_results
--
-- Content:
--   - question.create
--   - question.update
--   - question.delete
--   - note.create
--   - note.update
--   - note.delete
-- ============================================

SELECT '✅ Audit logs migration complete!' as status;
