-- Fix foreign key constraints for past_papers deletion
-- Migration: 20260106_fix_past_papers_foreign_keys.sql

-- Drop and recreate the assessment_attempts paper_id foreign key with CASCADE
DO $$
BEGIN
    -- Check if the column exists and has a foreign key constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessment_attempts' AND column_name = 'paper_id'
    ) THEN
        -- Get the constraint name
        DECLARE 
            constraint_name TEXT;
        BEGIN
            SELECT tc.constraint_name
            INTO constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'assessment_attempts' 
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'paper_id';
            
            -- Drop the existing constraint if it exists
            IF constraint_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE assessment_attempts DROP CONSTRAINT ' || constraint_name;
            END IF;
            
            -- Add the new constraint with CASCADE
            EXECUTE 'ALTER TABLE assessment_attempts ADD CONSTRAINT assessment_attempts_paper_id_fkey 
                     FOREIGN KEY (paper_id) REFERENCES past_papers(id) ON DELETE CASCADE';
        END;
    END IF;
END $$;

-- Also check for any other tables that might reference past_papers without CASCADE
DO $$
BEGIN
    -- Check questions table for paper_id reference
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'paper_id'
    ) THEN
        -- Get the constraint name
        DECLARE 
            constraint_name TEXT;
        BEGIN
            SELECT tc.constraint_name
            INTO constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'questions' 
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'paper_id';
            
            -- Drop the existing constraint if it exists
            IF constraint_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE questions DROP CONSTRAINT ' || constraint_name;
            END IF;
            
            -- Add the new constraint with CASCADE
            EXECUTE 'ALTER TABLE questions ADD CONSTRAINT questions_paper_id_fkey 
                     FOREIGN KEY (paper_id) REFERENCES past_papers(id) ON DELETE CASCADE';
        END;
    END IF;
END $$;
