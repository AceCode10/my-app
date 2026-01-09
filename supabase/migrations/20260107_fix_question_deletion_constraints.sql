-- Fix question deletion foreign key constraints
-- Migration: 20260107_fix_question_deletion_constraints.sql

-- Check and fix all foreign key references to questions table
DO $$
BEGIN
    -- Fix user_progress_tracking question_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_progress_tracking' AND column_name = 'question_id'
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
            WHERE tc.table_name = 'user_progress_tracking' 
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'question_id';
            
            -- Drop the existing constraint if it exists
            IF constraint_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE user_progress_tracking DROP CONSTRAINT ' || constraint_name;
            END IF;
            
            -- Add the new constraint with CASCADE
            EXECUTE 'ALTER TABLE user_progress_tracking ADD CONSTRAINT user_progress_tracking_question_id_fkey 
                     FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE';
        END;
    END IF;

    -- Fix paper_questions question_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'paper_questions' AND column_name = 'question_id'
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
            WHERE tc.table_name = 'paper_questions' 
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'question_id';
            
            -- Drop the existing constraint if it exists
            IF constraint_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE paper_questions DROP CONSTRAINT ' || constraint_name;
            END IF;
            
            -- Add the new constraint with CASCADE
            EXECUTE 'ALTER TABLE paper_questions ADD CONSTRAINT paper_questions_question_id_fkey 
                     FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE';
        END;
    END IF;

    -- Fix flashcards question_id constraint
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'flashcards' AND column_name = 'question_id'
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
            WHERE tc.table_name = 'flashcards' 
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'question_id';
            
            -- Drop the existing constraint if it exists
            IF constraint_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE flashcards DROP CONSTRAINT ' || constraint_name;
            END IF;
            
            -- Add the new constraint with CASCADE
            EXECUTE 'ALTER TABLE flashcards ADD CONSTRAINT flashcards_question_id_fkey 
                     FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE';
        END;
    END IF;

    -- Check for test_questions table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'test_questions'
    ) THEN
        -- Fix test_questions question_id constraint
        DECLARE 
            constraint_name TEXT;
        BEGIN
            SELECT tc.constraint_name
            INTO constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'test_questions' 
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'question_id';
            
            -- Drop the existing constraint if it exists
            IF constraint_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE test_questions DROP CONSTRAINT ' || constraint_name;
            END IF;
            
            -- Add the new constraint with CASCADE
            EXECUTE 'ALTER TABLE test_questions ADD CONSTRAINT test_questions_question_id_fkey 
                     FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE';
        END;
    END IF;

    -- Check for assessment_questions table
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'assessment_questions'
    ) THEN
        -- Fix assessment_questions question_id constraint
        DECLARE 
            constraint_name TEXT;
        BEGIN
            SELECT tc.constraint_name
            INTO constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'assessment_questions' 
                AND tc.constraint_type = 'FOREIGN KEY'
                AND kcu.column_name = 'question_id';
            
            -- Drop the existing constraint if it exists
            IF constraint_name IS NOT NULL THEN
                EXECUTE 'ALTER TABLE assessment_questions DROP CONSTRAINT ' || constraint_name;
            END IF;
            
            -- Add the new constraint with CASCADE
            EXECUTE 'ALTER TABLE assessment_questions ADD CONSTRAINT assessment_questions_question_id_fkey 
                     FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE';
        END;
    END IF;

END $$;
