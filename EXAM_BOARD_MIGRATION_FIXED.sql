-- ============================================
-- EXAM BOARD SYSTEM MIGRATION (FIXED)
-- Compatible with existing users table
-- ============================================

-- ============================================
-- 1. CREATE EXAM BOARDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS exam_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- 'CIE', 'EDEXCEL', 'AQA', 'OCR', 'AP'
    name TEXT NOT NULL, -- Display name
    full_name TEXT NOT NULL, -- Full official name
    description TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS exam_boards_code_idx ON exam_boards(code);
CREATE INDEX IF NOT EXISTS exam_boards_active_idx ON exam_boards(is_active);

-- ============================================
-- 2. UPDATE USERS TABLE FOR ONBOARDING
-- ============================================

-- Add exam board preference to users table (not profiles)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferred_exam_board_id UUID REFERENCES exam_boards(id) ON DELETE SET NULL;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS show_all_exam_boards BOOLEAN DEFAULT false;

-- Index for filtering
CREATE INDEX IF NOT EXISTS users_exam_board_idx ON users(preferred_exam_board_id);

-- ============================================
-- 3. UPDATE CONTENT TABLES WITH EXAM BOARD REFERENCES
-- ============================================

-- Subjects table
-- First, check if exam_board column exists and is TEXT type
DO $$ 
BEGIN
    -- Drop the old TEXT column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' 
        AND column_name = 'exam_board'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE subjects DROP COLUMN exam_board;
    END IF;
END $$;

-- Add new UUID reference
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS exam_board_id UUID REFERENCES exam_boards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS subjects_exam_board_id_idx ON subjects(exam_board_id);

-- Topics table (inherit from subject, but allow override)
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS exam_board_id UUID REFERENCES exam_boards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS topics_exam_board_id_idx ON topics(exam_board_id);

-- Questions table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questions') THEN
        -- Drop old TEXT column if exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'questions' 
            AND column_name = 'exam_board'
            AND data_type = 'text'
        ) THEN
            EXECUTE 'ALTER TABLE questions DROP COLUMN exam_board';
        END IF;
        
        -- Add new UUID reference
        EXECUTE 'ALTER TABLE questions ADD COLUMN IF NOT EXISTS exam_board_id UUID REFERENCES exam_boards(id) ON DELETE SET NULL';
        EXECUTE 'CREATE INDEX IF NOT EXISTS questions_exam_board_id_idx ON questions(exam_board_id)';
    END IF;
END $$;

-- Past papers table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'past_papers') THEN
        -- Drop old TEXT column if exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'past_papers' 
            AND column_name = 'exam_board'
            AND data_type = 'text'
        ) THEN
            EXECUTE 'ALTER TABLE past_papers DROP COLUMN exam_board';
        END IF;
        
        -- Add new UUID reference
        EXECUTE 'ALTER TABLE past_papers ADD COLUMN IF NOT EXISTS exam_board_id UUID REFERENCES exam_boards(id) ON DELETE SET NULL';
        EXECUTE 'CREATE INDEX IF NOT EXISTS past_papers_exam_board_id_idx ON past_papers(exam_board_id)';
    END IF;
END $$;

-- Papers table (if exists - alternative name)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'papers') THEN
        EXECUTE 'ALTER TABLE papers ADD COLUMN IF NOT EXISTS exam_board_id UUID REFERENCES exam_boards(id) ON DELETE SET NULL';
        EXECUTE 'CREATE INDEX IF NOT EXISTS papers_exam_board_id_idx ON papers(exam_board_id)';
    END IF;
END $$;

-- Notes table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes') THEN
        EXECUTE 'ALTER TABLE notes ADD COLUMN IF NOT EXISTS exam_board_id UUID REFERENCES exam_boards(id) ON DELETE SET NULL';
        EXECUTE 'CREATE INDEX IF NOT EXISTS notes_exam_board_id_idx ON notes(exam_board_id)';
    END IF;
END $$;

-- ============================================
-- 4. CREATE JUNCTION TABLE FOR MULTI-BOARD CONTENT
-- ============================================

CREATE TABLE IF NOT EXISTS content_exam_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type TEXT NOT NULL, -- 'subject', 'topic', 'question', 'paper', 'note'
    content_id UUID NOT NULL,
    exam_board_id UUID NOT NULL REFERENCES exam_boards(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(content_type, content_id, exam_board_id)
);

CREATE INDEX IF NOT EXISTS content_exam_boards_content_idx ON content_exam_boards(content_type, content_id);
CREATE INDEX IF NOT EXISTS content_exam_boards_board_idx ON content_exam_boards(exam_board_id);

-- ============================================
-- 5. SEED INITIAL EXAM BOARD DATA
-- ============================================

INSERT INTO exam_boards (code, name, full_name, description, display_order) VALUES
('CIE', 'CIE', 'Cambridge International Examinations', 'IGCSE, AS & A Level by Cambridge Assessment International Education', 1),
('EDEXCEL', 'Edexcel', 'Pearson Edexcel', 'IGCSE, GCSE, A Level by Pearson Edexcel', 2),
('AQA', 'AQA', 'Assessment and Qualifications Alliance', 'GCSE and A Level qualifications', 3),
('OCR', 'OCR', 'Oxford Cambridge and RSA', 'GCSE and A Level examinations', 4),
('AP', 'AP', 'Advanced Placement', 'College Board Advanced Placement courses', 5)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    full_name = EXCLUDED.full_name,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to get content with exam board filtering
CREATE OR REPLACE FUNCTION get_user_exam_board_filter(user_id UUID)
RETURNS UUID AS $$
DECLARE
    board_id UUID;
    show_all BOOLEAN;
BEGIN
    SELECT preferred_exam_board_id, show_all_exam_boards
    INTO board_id, show_all
    FROM users
    WHERE id = user_id;
    
    -- If show_all is true or no preference set, return NULL (show all)
    IF show_all IS TRUE OR board_id IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if content belongs to exam board (including multi-board)
CREATE OR REPLACE FUNCTION content_matches_exam_board(
    p_content_type TEXT,
    p_content_id UUID,
    p_exam_board_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check direct assignment
    CASE p_content_type
        WHEN 'subject' THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects') THEN
                RETURN EXISTS (
                    SELECT 1 FROM subjects 
                    WHERE id = p_content_id 
                    AND (exam_board_id = p_exam_board_id OR exam_board_id IS NULL)
                );
            END IF;
        WHEN 'topic' THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'topics') THEN
                RETURN EXISTS (
                    SELECT 1 FROM topics 
                    WHERE id = p_content_id 
                    AND (exam_board_id = p_exam_board_id OR exam_board_id IS NULL)
                );
            END IF;
        WHEN 'question' THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questions') THEN
                RETURN EXISTS (
                    SELECT 1 FROM questions 
                    WHERE id = p_content_id 
                    AND (exam_board_id = p_exam_board_id OR exam_board_id IS NULL)
                );
            END IF;
        WHEN 'paper' THEN
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'past_papers') THEN
                RETURN EXISTS (
                    SELECT 1 FROM past_papers 
                    WHERE id = p_content_id 
                    AND (exam_board_id = p_exam_board_id OR exam_board_id IS NULL)
                );
            ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'papers') THEN
                RETURN EXISTS (
                    SELECT 1 FROM papers 
                    WHERE id = p_content_id 
                    AND (exam_board_id = p_exam_board_id OR exam_board_id IS NULL)
                );
            END IF;
    END CASE;
    
    -- Check junction table for multi-board content
    RETURN EXISTS (
        SELECT 1 FROM content_exam_boards
        WHERE content_type = p_content_type
        AND content_id = p_content_id
        AND exam_board_id = p_exam_board_id
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. UPDATE RLS POLICIES FOR EXAM BOARD FILTERING
-- ============================================

-- Note: Only update policies for tables that exist
-- Subjects policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects') THEN
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS "Public can view published subjects" ON subjects;
        DROP POLICY IF EXISTS "Public can view subjects" ON subjects;
        DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
        
        -- Create new policy with exam board filtering (no status check)
        CREATE POLICY "Public can view subjects"
            ON subjects FOR SELECT
            USING (
                -- Guest users see all
                auth.uid() IS NULL OR
                -- Logged in users see based on preference
                exam_board_id IS NULL OR
                exam_board_id = get_user_exam_board_filter(auth.uid()) OR
                get_user_exam_board_filter(auth.uid()) IS NULL OR
                -- Check multi-board assignment
                EXISTS (
                    SELECT 1 FROM content_exam_boards ceb
                    INNER JOIN users u ON u.preferred_exam_board_id = ceb.exam_board_id
                    WHERE ceb.content_type = 'subject'
                    AND ceb.content_id = subjects.id
                    AND u.id = auth.uid()
                )
            );
    END IF;
END $$;

-- Topics policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'topics') THEN
        DROP POLICY IF EXISTS "Public can view published topics" ON topics;
        DROP POLICY IF EXISTS "Public can view topics" ON topics;
        DROP POLICY IF EXISTS "Anyone can view topics" ON topics;
        
        -- Create new policy with exam board filtering (no status check)
        CREATE POLICY "Public can view topics"
            ON topics FOR SELECT
            USING (
                -- Guest users see all
                auth.uid() IS NULL OR
                -- Logged in users see based on preference
                exam_board_id IS NULL OR
                exam_board_id = get_user_exam_board_filter(auth.uid()) OR
                get_user_exam_board_filter(auth.uid()) IS NULL OR
                -- Check multi-board assignment
                EXISTS (
                    SELECT 1 FROM content_exam_boards ceb
                    INNER JOIN users u ON u.preferred_exam_board_id = ceb.exam_board_id
                    WHERE ceb.content_type = 'topic'
                    AND ceb.content_id = topics.id
                    AND u.id = auth.uid()
                )
            );
    END IF;
END $$;

-- ============================================
-- 8. ENABLE RLS ON NEW TABLES
-- ============================================

ALTER TABLE exam_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_exam_boards ENABLE ROW LEVEL SECURITY;

-- Everyone can view active exam boards
CREATE POLICY "Anyone can view active exam boards"
    ON exam_boards FOR SELECT
    USING (is_active = true);

-- Only admins can manage exam boards
CREATE POLICY "Admins can manage exam boards"
    ON exam_boards FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

-- Everyone can view content_exam_boards mappings
CREATE POLICY "Anyone can view content exam board mappings"
    ON content_exam_boards FOR SELECT
    USING (true);

-- Only admins can manage mappings
CREATE POLICY "Admins can manage content exam board mappings"
    ON content_exam_boards FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('super_admin', 'content_moderator')
        )
    );

-- ============================================
-- 9. UPDATE TRIGGERS
-- ============================================

-- Update exam_boards updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_exam_boards_updated_at 
    BEFORE UPDATE ON exam_boards
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. DATA MIGRATION (Optional - for existing data)
-- ============================================

-- Migrate existing subjects to CIE by default
-- Uncomment if you have existing data:

/*
DO $$
DECLARE
    cie_id UUID;
BEGIN
    -- Get CIE exam board ID
    SELECT id INTO cie_id FROM exam_boards WHERE code = 'CIE';
    
    -- Update subjects without exam_board_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects') THEN
        UPDATE subjects 
        SET exam_board_id = cie_id 
        WHERE exam_board_id IS NULL;
    END IF;
    
    -- Update questions without exam_board_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'questions') THEN
        UPDATE questions 
        SET exam_board_id = cie_id 
        WHERE exam_board_id IS NULL;
    END IF;
    
    -- Update past_papers without exam_board_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'past_papers') THEN
        UPDATE past_papers 
        SET exam_board_id = cie_id 
        WHERE exam_board_id IS NULL;
    END IF;
    
    -- Update papers without exam_board_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'papers') THEN
        UPDATE papers 
        SET exam_board_id = cie_id 
        WHERE exam_board_id IS NULL;
    END IF;
END $$;
*/

-- ============================================
-- 11. VERIFICATION QUERIES
-- ============================================

-- Verify exam boards created
SELECT 'Exam boards created:' as status, COUNT(*) as count FROM exam_boards;

-- Verify columns added to users table
SELECT 
    'users.preferred_exam_board_id' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'preferred_exam_board_id'
    ) as exists;

SELECT 
    'subjects.exam_board_id' as column_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'subjects' 
        AND column_name = 'exam_board_id'
    ) as exists;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Exam board system migration completed successfully!' as status;
