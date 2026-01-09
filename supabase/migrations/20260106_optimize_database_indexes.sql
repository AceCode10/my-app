-- Database optimization: Add indexes for frequently queried columns
-- This migration adds indexes to improve query performance

-- Subjects table indexes
CREATE INDEX IF NOT EXISTS idx_subjects_exam_board_id ON subjects(exam_board_id);
CREATE INDEX IF NOT EXISTS idx_subjects_level ON subjects(level);
CREATE INDEX IF NOT EXISTS idx_subjects_status_display_order ON subjects(status, display_order);
CREATE INDEX IF NOT EXISTS idx_subjects_exam_board_level ON subjects(exam_board_id, level);

-- Topics table indexes
CREATE INDEX IF NOT EXISTS idx_topics_subject_status ON topics(subject_id, status);

-- Questions table indexes
CREATE INDEX IF NOT EXISTS idx_questions_subject_topic ON questions(subject_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_type_status ON questions(question_type, status);

-- Past papers table indexes
CREATE INDEX IF NOT EXISTS idx_past_papers_subject_id ON past_papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_past_papers_year_session ON past_papers(year, session);
CREATE INDEX IF NOT EXISTS idx_past_papers_status ON past_papers(status);
CREATE INDEX IF NOT EXISTS idx_past_papers_exam_board ON past_papers(exam_board);
CREATE INDEX IF NOT EXISTS idx_past_papers_level ON past_papers(level);

-- Notes table indexes
CREATE INDEX IF NOT EXISTS idx_notes_subject_topic ON notes(subject_id, topic_id);
CREATE INDEX IF NOT EXISTS idx_notes_visibility ON notes(visibility);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);

-- User progress indexes
CREATE INDEX IF NOT EXISTS idx_user_subject_progress_user ON user_subject_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user ON user_topic_progress(user_id);

-- Exam boards index
CREATE INDEX IF NOT EXISTS idx_exam_boards_code ON exam_boards(code);
CREATE INDEX IF NOT EXISTS idx_exam_boards_active_order ON exam_boards(is_active, display_order);

-- Analyze tables to update statistics for query planner
ANALYZE subjects;
ANALYZE topics;
ANALYZE questions;
ANALYZE past_papers;
ANALYZE notes;
ANALYZE exam_boards;
