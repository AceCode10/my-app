-- Add composite indexes for improved query performance
-- These indexes optimize the most common query patterns

-- Composite index for questions table (admin questions page)
-- Optimizes: filtering by status, subject_id, topic_id, question_type, difficulty
CREATE INDEX IF NOT EXISTS idx_questions_status_subject ON questions(status, subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject_topic ON questions(subject_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_status_type ON questions(status, question_type);
CREATE INDEX IF NOT EXISTS idx_questions_status_difficulty ON questions(status, difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_full_filter ON questions(status, subject_id, topic_id, question_type, difficulty);

-- Composite index for subjects table (subjects grid)
-- Optimizes: filtering by exam_board_id, level, status
CREATE INDEX IF NOT EXISTS idx_subjects_exam_board_level_status ON subjects(exam_board_id, level, status);
CREATE INDEX IF NOT EXISTS idx_subjects_status_order ON subjects(status, display_order);

-- Composite index for topics table
-- Optimizes: filtering by subject_id and status
CREATE INDEX IF NOT EXISTS idx_topics_subject_status ON topics(subject_id, status);

-- Composite index for past papers table
-- Optimizes: filtering by subject_id, year, session, status
CREATE INDEX IF NOT EXISTS idx_past_papers_subject_year_session ON past_papers(subject_id, year, session);
CREATE INDEX IF NOT EXISTS idx_past_papers_status_year ON past_papers(status, year DESC);

-- Composite index for notes table
-- Optimizes: filtering by subject_id, topic_id, visibility
CREATE INDEX IF NOT EXISTS idx_notes_subject_topic_visibility ON notes(subject_id, topic_id, visibility);

-- Composite index for user progress tables
-- Optimizes: user-specific queries
CREATE INDEX IF NOT EXISTS idx_user_subject_progress_user_subject ON user_subject_progress(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user_topic ON user_topic_progress(user_id, topic_id);

-- Add partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_questions_published ON questions(created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_subjects_published ON subjects(display_order) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_topics_published ON topics(subject_id, display_order) WHERE status = 'published';

-- Update table statistics for better query planning
ANALYZE questions;
ANALYZE subjects;
ANALYZE topics;
ANALYZE past_papers;
ANALYZE notes;
ANALYZE user_subject_progress;
ANALYZE user_topic_progress;
