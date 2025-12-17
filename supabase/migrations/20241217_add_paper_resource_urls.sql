-- ============================================
-- ADD ADDITIONAL RESOURCE URL COLUMNS
-- Adds columns for insert, grade thresholds, specimen, and source files
-- ============================================

-- Add insert_url column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'past_papers' AND column_name = 'insert_url'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN insert_url TEXT;
    END IF;
END $$;

-- Add grade_thresholds_url column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'past_papers' AND column_name = 'grade_thresholds_url'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN grade_thresholds_url TEXT;
    END IF;
END $$;

-- Add specimen_url column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'past_papers' AND column_name = 'specimen_url'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN specimen_url TEXT;
    END IF;
END $$;

-- Add source_files_url column
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'past_papers' AND column_name = 'source_files_url'
    ) THEN
        ALTER TABLE past_papers ADD COLUMN source_files_url TEXT;
    END IF;
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Paper resource URLs migration complete!' as status;
