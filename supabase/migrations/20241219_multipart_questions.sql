-- Add multi-part question support to questions table
-- This allows questions to have parent-child relationships for structured questions like 2(a)(i), 2(a)(ii), etc.

-- Add parent_question_id for hierarchical questions
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS parent_question_id UUID REFERENCES questions(id) ON DELETE CASCADE;

-- Add part_label for sub-question labeling (e.g., "a", "b", "i", "ii")
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS part_label TEXT;

-- Add display_order for ordering sub-questions
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for parent lookups
CREATE INDEX IF NOT EXISTS idx_questions_parent ON questions(parent_question_id);

-- Function to get all sub-questions for a parent question
CREATE OR REPLACE FUNCTION get_question_with_parts(question_uuid UUID)
RETURNS TABLE (
    id UUID,
    parent_question_id UUID,
    part_label TEXT,
    stem_markdown TEXT,
    question_type TEXT,
    marks INTEGER,
    difficulty TEXT,
    display_order INTEGER,
    depth INTEGER
) AS $$
WITH RECURSIVE question_tree AS (
    -- Base case: the parent question
    SELECT 
        q.id,
        q.parent_question_id,
        q.part_label,
        q.stem_markdown,
        q.question_type::TEXT,
        q.marks,
        q.difficulty::TEXT,
        q.display_order,
        0 as depth
    FROM questions q
    WHERE q.id = question_uuid
    
    UNION ALL
    
    -- Recursive case: child questions
    SELECT 
        q.id,
        q.parent_question_id,
        q.part_label,
        q.stem_markdown,
        q.question_type::TEXT,
        q.marks,
        q.difficulty::TEXT,
        q.display_order,
        qt.depth + 1
    FROM questions q
    INNER JOIN question_tree qt ON q.parent_question_id = qt.id
)
SELECT * FROM question_tree
ORDER BY depth, display_order, part_label;
$$ LANGUAGE SQL;
