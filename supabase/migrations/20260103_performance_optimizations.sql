-- ============================================
-- PERFORMANCE OPTIMIZATIONS FOR PAPER QUESTIONS
-- Add indexes and optimize queries for faster access
-- ============================================

-- Composite index for efficient question fetching by paper
CREATE INDEX IF NOT EXISTS idx_paper_questions_paper_number_order 
ON paper_questions(paper_id, question_number, display_order);

-- Index for parent-child relationships
CREATE INDEX IF NOT EXISTS idx_paper_questions_parent_paper 
ON paper_questions(parent_question_id, paper_id) 
WHERE parent_question_id IS NOT NULL;

-- Index for filtering by question type
CREATE INDEX IF NOT EXISTS idx_paper_questions_type 
ON paper_questions(paper_id, question_type);

-- Index for marks-based queries (leaderboards, statistics)
CREATE INDEX IF NOT EXISTS idx_paper_questions_marks 
ON paper_questions(paper_id, marks) 
WHERE marks > 0;

-- Optimize paper_attempt_answers for faster lookups
CREATE INDEX IF NOT EXISTS idx_paper_attempt_answers_composite 
ON paper_attempt_answers(attempt_id, paper_question_id, updated_at);

-- Index for flagged questions
CREATE INDEX IF NOT EXISTS idx_paper_attempt_answers_flagged 
ON paper_attempt_answers(attempt_id, is_flagged) 
WHERE is_flagged = true;

-- Optimize past_papers table
CREATE INDEX IF NOT EXISTS idx_past_papers_subject_year 
ON past_papers(subject_id, year, session);

CREATE INDEX IF NOT EXISTS idx_past_papers_status 
ON past_papers(status, created_at DESC) 
WHERE status = 'published';

-- Add materialized view for paper statistics (optional, for very large datasets)
-- This can be refreshed periodically for better performance
CREATE MATERIALIZED VIEW IF NOT EXISTS paper_statistics AS
SELECT 
  p.id as paper_id,
  p.title,
  COUNT(DISTINCT pq.id) as total_questions,
  COUNT(DISTINCT pq.id) FILTER (WHERE pq.marks > 0) as answerable_questions,
  SUM(pq.marks) FILTER (WHERE pq.marks > 0) as total_marks,
  COUNT(DISTINCT pq.id) FILTER (WHERE pq.question_type = 'mcq') as mcq_count,
  COUNT(DISTINCT pq.id) FILTER (WHERE pq.question_type = 'structured') as structured_count,
  COUNT(DISTINCT pq.id) FILTER (WHERE pq.question_type = 'short_answer') as short_answer_count,
  MAX(pq.updated_at) as last_updated
FROM past_papers p
LEFT JOIN paper_questions pq ON p.id = pq.paper_id
WHERE p.status = 'published'
GROUP BY p.id, p.title;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_paper_statistics_paper_id 
ON paper_statistics(paper_id);

-- Function to refresh statistics (call this after bulk imports)
CREATE OR REPLACE FUNCTION refresh_paper_statistics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY paper_statistics;
END;
$$ LANGUAGE plpgsql;

-- Note: Run ANALYZE separately after migration for better query planning
-- ANALYZE paper_questions;
-- ANALYZE paper_attempt_answers; 
-- ANALYZE past_papers;
-- (VACUUM cannot run in transaction blocks, run manually if needed)

SELECT 'Performance optimizations applied successfully!' as status;
SELECT 'Run ANALYZE commands separately for optimal query planning' as note;
