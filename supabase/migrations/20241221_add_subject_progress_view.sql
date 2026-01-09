-- ============================================
-- Subject Progress Summary View
-- Aggregates user progress at the subject level
-- ============================================

-- Create a view to calculate subject-level progress
CREATE OR REPLACE VIEW user_subject_progress AS
SELECT 
    user_id,
    subject_id,
    -- Calculate average completion across all activities for this subject
    COALESCE(AVG(completion_percentage), 0)::INTEGER AS progress_percentage,
    COUNT(DISTINCT topic_id) AS topics_accessed,
    MAX(last_accessed_at) AS last_accessed_at
FROM user_progress
WHERE subject_id IS NOT NULL
GROUP BY user_id, subject_id;

-- Grant access to authenticated users
GRANT SELECT ON user_subject_progress TO authenticated;

-- Alternative: Create materialized view for better performance (optional)
-- This can be refreshed periodically
CREATE MATERIALIZED VIEW IF NOT EXISTS user_subject_progress_materialized AS
SELECT 
    user_id,
    subject_id,
    COALESCE(AVG(completion_percentage), 0)::INTEGER AS progress_percentage,
    COUNT(DISTINCT topic_id) AS topics_accessed,
    MAX(last_accessed_at) AS last_accessed_at,
    NOW() AS last_updated
FROM user_progress
WHERE subject_id IS NOT NULL
GROUP BY user_id, subject_id;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subject_progress_mat_unique 
ON user_subject_progress_materialized(user_id, subject_id);

-- Grant access
GRANT SELECT ON user_subject_progress_materialized TO authenticated;

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_subject_progress()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_subject_progress_materialized;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
