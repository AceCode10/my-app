-- Add sub_inputs column to paper_questions table
-- This allows questions to have multiple labeled input fields (e.g., Way 1, Way 2, Example 1, Example 2)

ALTER TABLE paper_questions
ADD COLUMN IF NOT EXISTS sub_inputs jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN paper_questions.sub_inputs IS 'Array of labels for multiple answer input fields, e.g., ["Way 1", "Way 2", "Way 3"]';

-- Create index for queries that filter by sub_inputs existence
CREATE INDEX IF NOT EXISTS idx_paper_questions_has_sub_inputs 
ON paper_questions ((sub_inputs IS NOT NULL))
WHERE sub_inputs IS NOT NULL;
