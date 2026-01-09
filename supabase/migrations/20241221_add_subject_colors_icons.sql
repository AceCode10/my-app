-- ============================================
-- Add varied colors and icon mappings to subjects
-- ============================================

-- Update subjects with varied colors and icon names
-- Colors match the gradient design system

-- Mathematics subjects
UPDATE subjects SET 
    color = '#8b5cf6',  -- Purple
    icon_url = 'calculator'
WHERE LOWER(name) LIKE '%math%' OR LOWER(name) LIKE '%calculus%';

-- Science subjects
UPDATE subjects SET 
    color = '#10b981',  -- Green
    icon_url = 'flask'
WHERE LOWER(name) LIKE '%chemistry%';

UPDATE subjects SET 
    color = '#ec4899',  -- Pink/Magenta
    icon_url = 'atom'
WHERE LOWER(name) LIKE '%physics%';

UPDATE subjects SET 
    color = '#06b6d4',  -- Cyan
    icon_url = 'microscope'
WHERE LOWER(name) LIKE '%biology%' OR LOWER(name) LIKE '%science%';

-- Languages
UPDATE subjects SET 
    color = '#3b82f6',  -- Blue
    icon_url = 'book-open'
WHERE LOWER(name) LIKE '%english%' AND LOWER(name) NOT LIKE '%literature%';

UPDATE subjects SET 
    color = '#6366f1',  -- Indigo
    icon_url = 'book'
WHERE LOWER(name) LIKE '%literature%';

UPDATE subjects SET 
    color = '#f59e0b',  -- Amber
    icon_url = 'languages'
WHERE LOWER(name) LIKE '%french%' OR LOWER(name) LIKE '%spanish%' OR LOWER(name) LIKE '%german%' OR LOWER(name) LIKE '%chinese%';

-- Humanities
UPDATE subjects SET 
    color = '#ef4444',  -- Red
    icon_url = 'landmark'
WHERE LOWER(name) LIKE '%history%';

UPDATE subjects SET 
    color = '#14b8a6',  -- Teal
    icon_url = 'globe'
WHERE LOWER(name) LIKE '%geography%';

UPDATE subjects SET 
    color = '#8b5cf6',  -- Purple
    icon_url = 'scale'
WHERE LOWER(name) LIKE '%religious%' OR LOWER(name) LIKE '%philosophy%';

-- Business and Economics
UPDATE subjects SET 
    color = '#0ea5e9',  -- Sky blue
    icon_url = 'trending-up'
WHERE LOWER(name) LIKE '%economics%';

UPDATE subjects SET 
    color = '#6366f1',  -- Indigo
    icon_url = 'briefcase'
WHERE LOWER(name) LIKE '%business%' OR LOWER(name) LIKE '%accounting%';

-- Technology and Arts
UPDATE subjects SET 
    color = '#10b981',  -- Green
    icon_url = 'cpu'
WHERE LOWER(name) LIKE '%computer%' OR LOWER(name) LIKE '%ict%' OR LOWER(name) LIKE '%technology%';

UPDATE subjects SET 
    color = '#f59e0b',  -- Amber
    icon_url = 'palette'
WHERE LOWER(name) LIKE '%art%' OR LOWER(name) LIKE '%design%';

UPDATE subjects SET 
    color = '#ec4899',  -- Pink
    icon_url = 'music'
WHERE LOWER(name) LIKE '%music%';

-- Set default color for any subjects without a color
UPDATE subjects SET 
    color = '#3b82f6',  -- Default blue
    icon_url = 'book-open'
WHERE color IS NULL OR color = '';

-- Add comment to track icon mapping
COMMENT ON COLUMN subjects.icon_url IS 'Stores lucide icon name or URL. Common values: calculator, flask, atom, microscope, book-open, book, languages, landmark, globe, scale, trending-up, briefcase, cpu, palette, music';
