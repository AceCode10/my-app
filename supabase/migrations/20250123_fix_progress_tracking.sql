-- ============================================
-- Fix progress tracking to:
-- 1. Exclude 100% completed items from "Continue where you left off"
-- 2. Include subject and topic slugs for proper URL generation
-- ============================================

-- Drop existing function first
DROP FUNCTION IF EXISTS get_recent_progress(integer);

-- Recreate the function with fixes
CREATE FUNCTION get_recent_progress(p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
    id UUID,
    activity_type VARCHAR(50),
    subject_id UUID,
    subject_name TEXT,
    subject_slug TEXT,
    topic_id UUID,
    topic_name TEXT,
    topic_slug TEXT,
    note_id UUID,
    question_id UUID,
    progress_data JSONB,
    completion_percentage INTEGER,
    last_accessed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.activity_type,
        up.subject_id,
        s.name AS subject_name,
        s.slug AS subject_slug,
        up.topic_id,
        t.name AS topic_name,
        t.slug AS topic_slug,
        up.note_id,
        up.question_id,
        up.progress_data,
        up.completion_percentage,
        up.last_accessed_at
    FROM user_progress up
    LEFT JOIN subjects s ON s.id = up.subject_id
    LEFT JOIN topics t ON t.id = up.topic_id
    WHERE up.user_id = auth.uid()
      AND up.completed_at IS NULL
      AND up.completion_percentage < 100  -- Exclude 100% completed items
    ORDER BY up.last_accessed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
