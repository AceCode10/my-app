-- Fix the question_type check constraint to allow all needed types
-- Drop the existing constraint and recreate with all valid types

ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;

ALTER TABLE questions ADD CONSTRAINT questions_question_type_check 
CHECK (question_type IN ('mcq', 'true_false', 'short_answer', 'essay', 'structured', 'context', 'calculation', 'fill_blank', 'numeric'));
