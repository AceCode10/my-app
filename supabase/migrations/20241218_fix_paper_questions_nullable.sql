-- ============================================
-- FIX: Make question_id nullable in paper_questions
-- The question_id column should be optional since questions
-- can be stored directly in paper_questions without referencing
-- the questions table
-- ============================================

ALTER TABLE paper_questions ALTER COLUMN question_id DROP NOT NULL;

SELECT '✅ Fixed: question_id is now nullable' as status;
