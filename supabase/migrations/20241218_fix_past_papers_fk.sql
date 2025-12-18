-- ============================================
-- FIX PAST PAPERS FOREIGN KEY RELATIONSHIP
-- Adds proper foreign key constraint for subject_id
-- ============================================

-- First, ensure the subject_id column exists
ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS subject_id UUID;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'past_papers_subject_id_fkey'
        AND table_name = 'past_papers'
    ) THEN
        ALTER TABLE past_papers 
        ADD CONSTRAINT past_papers_subject_id_fkey 
        FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for the foreign key if not exists
CREATE INDEX IF NOT EXISTS idx_past_papers_subject_id ON past_papers(subject_id);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Past papers foreign key constraint added!' as status;
