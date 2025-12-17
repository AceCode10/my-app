-- Add display_order column to topics table
-- This enables drag-and-drop reordering of topics

ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_topics_display_order ON topics(subject_id, display_order);

-- Initialize display_order based on current name ordering
WITH ordered_topics AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY name) - 1 as new_order
  FROM topics
)
UPDATE topics 
SET display_order = ordered_topics.new_order
FROM ordered_topics
WHERE topics.id = ordered_topics.id;
