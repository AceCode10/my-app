-- ============================================
-- UPDATE SUBJECTS WITH EXAM BOARD ID
-- This sets exam_board_id for existing subjects that have null
-- Run this in Supabase SQL Editor
-- ============================================

-- Get the Cambridge (CIE) exam board ID and update all subjects with null exam_board_id
-- Since all current subjects are Cambridge IGCSE subjects
UPDATE subjects
SET exam_board_id = (SELECT id FROM exam_boards WHERE code = 'CIE' LIMIT 1)
WHERE exam_board_id IS NULL;

-- Normalize level values to lowercase for consistency
UPDATE subjects
SET level = LOWER(level)
WHERE level IS NOT NULL AND level != LOWER(level);

-- Set level to 'igcse' for subjects that don't have a level set
UPDATE subjects
SET level = 'igcse'
WHERE level IS NULL;

-- Verify the update
SELECT 
  s.name, 
  s.code, 
  s.level,
  eb.code as exam_board_code,
  eb.name as exam_board_name
FROM subjects s
LEFT JOIN exam_boards eb ON s.exam_board_id = eb.id
ORDER BY s.name
LIMIT 20;
