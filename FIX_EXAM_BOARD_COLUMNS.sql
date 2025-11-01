-- ============================================
-- FIX EXAM BOARD COLUMNS
-- Ensures exam_board_id exists in all necessary tables
-- Run this BEFORE ASSESSMENT_SYSTEM_MIGRATION.sql
-- ============================================

-- ============================================
-- 1. CREATE EXAM_BOARDS TABLE IF NOT EXISTS
-- ============================================

CREATE TABLE IF NOT EXISTS exam_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ADD EXAM_BOARD_ID TO QUESTIONS TABLE
-- ============================================

DO $$ 
BEGIN
    -- Check if exam_board_id column exists in questions table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'questions' 
        AND column_name = 'exam_board_id'
    ) THEN
        -- Add the column
        ALTER TABLE questions ADD COLUMN exam_board_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE questions 
        ADD CONSTRAINT fk_questions_exam_board 
        FOREIGN KEY (exam_board_id) 
        REFERENCES exam_boards(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added exam_board_id column to questions table';
    ELSE
        RAISE NOTICE 'exam_board_id column already exists in questions table';
    END IF;
END $$;

-- ============================================
-- 3. ADD EXAM_BOARD_ID TO SUBJECTS TABLE
-- ============================================

DO $$ 
BEGIN
    -- Check if exam_board_id column exists in subjects table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'subjects' 
        AND column_name = 'exam_board_id'
    ) THEN
        -- Add the column
        ALTER TABLE subjects ADD COLUMN exam_board_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE subjects 
        ADD CONSTRAINT fk_subjects_exam_board 
        FOREIGN KEY (exam_board_id) 
        REFERENCES exam_boards(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added exam_board_id column to subjects table';
    ELSE
        RAISE NOTICE 'exam_board_id column already exists in subjects table';
    END IF;
END $$;

-- ============================================
-- 4. ADD EXAM_BOARD_ID TO TOPICS TABLE
-- ============================================

DO $$ 
BEGIN
    -- Check if exam_board_id column exists in topics table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'topics' 
        AND column_name = 'exam_board_id'
    ) THEN
        -- Add the column
        ALTER TABLE topics ADD COLUMN exam_board_id UUID;
        
        -- Add foreign key constraint
        ALTER TABLE topics 
        ADD CONSTRAINT fk_topics_exam_board 
        FOREIGN KEY (exam_board_id) 
        REFERENCES exam_boards(id) 
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added exam_board_id column to topics table';
    ELSE
        RAISE NOTICE 'exam_board_id column already exists in topics table';
    END IF;
END $$;

-- ============================================
-- 5. ADD EXAM_BOARD_ID TO NOTES TABLE (if exists)
-- ============================================

DO $$ 
BEGIN
    -- Check if notes table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'notes'
    ) THEN
        -- Check if exam_board_id column exists
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'notes' 
            AND column_name = 'exam_board_id'
        ) THEN
            -- Add the column
            ALTER TABLE notes ADD COLUMN exam_board_id UUID;
            
            -- Add foreign key constraint
            ALTER TABLE notes 
            ADD CONSTRAINT fk_notes_exam_board 
            FOREIGN KEY (exam_board_id) 
            REFERENCES exam_boards(id) 
            ON DELETE SET NULL;
            
            RAISE NOTICE 'Added exam_board_id column to notes table';
        ELSE
            RAISE NOTICE 'exam_board_id column already exists in notes table';
        END IF;
    ELSE
        RAISE NOTICE 'notes table does not exist, skipping';
    END IF;
END $$;

-- ============================================
-- 6. ADD EXAM_BOARD_ID TO PAPERS TABLE (if exists)
-- ============================================

DO $$ 
BEGIN
    -- Check if papers table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'papers'
    ) THEN
        -- Check if exam_board_id column exists
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'papers' 
            AND column_name = 'exam_board_id'
        ) THEN
            -- Add the column
            ALTER TABLE papers ADD COLUMN exam_board_id UUID;
            
            -- Add foreign key constraint
            ALTER TABLE papers 
            ADD CONSTRAINT fk_papers_exam_board 
            FOREIGN KEY (exam_board_id) 
            REFERENCES exam_boards(id) 
            ON DELETE SET NULL;
            
            RAISE NOTICE 'Added exam_board_id column to papers table';
        ELSE
            RAISE NOTICE 'exam_board_id column already exists in papers table';
        END IF;
    ELSE
        RAISE NOTICE 'papers table does not exist, skipping';
    END IF;
END $$;

-- ============================================
-- 7. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_questions_exam_board_id ON questions(exam_board_id);
CREATE INDEX IF NOT EXISTS idx_subjects_exam_board_id ON subjects(exam_board_id);
CREATE INDEX IF NOT EXISTS idx_topics_exam_board_id ON topics(exam_board_id);

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes') THEN
        CREATE INDEX IF NOT EXISTS idx_notes_exam_board_id ON notes(exam_board_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'papers') THEN
        CREATE INDEX IF NOT EXISTS idx_papers_exam_board_id ON papers(exam_board_id);
    END IF;
END $$;

-- ============================================
-- 8. VERIFICATION
-- ============================================

-- Show which tables have exam_board_id column
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE column_name = 'exam_board_id'
AND table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- SCRIPT COMPLETE
-- ============================================

SELECT '✅ Exam board columns fix completed successfully!' as status;
