-- ============================================
-- Add display names for subjects
-- Shortens long names for better UI display
-- ============================================

-- Add display_name column if it doesn't exist
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS display_name VARCHAR(50);

-- Update display names for subjects with long names
UPDATE subjects SET display_name = 'ICT' 
WHERE LOWER(name) LIKE '%information%communication%technology%' 
   OR LOWER(name) LIKE '%information and communication technology%';

UPDATE subjects SET display_name = 'Computer Science' 
WHERE LOWER(name) LIKE '%computer science%' AND display_name IS NULL;

UPDATE subjects SET display_name = 'Business Studies' 
WHERE LOWER(name) LIKE '%business studies%' AND display_name IS NULL;

UPDATE subjects SET display_name = 'Religious Studies' 
WHERE LOWER(name) LIKE '%religious studies%' AND display_name IS NULL;

UPDATE subjects SET display_name = 'Combined Science' 
WHERE LOWER(name) LIKE '%combined science%' AND display_name IS NULL;

UPDATE subjects SET display_name = 'English Literature' 
WHERE LOWER(name) LIKE '%english literature%' AND display_name IS NULL;

UPDATE subjects SET display_name = 'English Language' 
WHERE LOWER(name) LIKE '%english language%' AND display_name IS NULL;

-- For all other subjects, use the original name as display name
UPDATE subjects SET display_name = name WHERE display_name IS NULL;

-- Add comment
COMMENT ON COLUMN subjects.display_name IS 'Shortened display name for UI (e.g., "ICT" instead of "Information and Communication Technology")';
