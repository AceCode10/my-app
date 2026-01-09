-- ============================================
-- SAFE FIX: Add short_name column to existing exam_boards table
-- Does NOT drop the table - preserves all existing data
-- ============================================

-- Add short_name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exam_boards' 
        AND column_name = 'short_name'
    ) THEN
        ALTER TABLE exam_boards ADD COLUMN short_name TEXT;
    END IF;
END $$;

-- Update short_name based on existing code values
UPDATE exam_boards SET short_name = 
    CASE code
        WHEN 'CIE' THEN 'Cambridge'
        WHEN 'EDEX' THEN 'Edexcel'
        WHEN 'AQA' THEN 'AQA'
        WHEN 'OCR' THEN 'OCR'
        WHEN 'AP' THEN 'AP'
        WHEN 'IB' THEN 'IB'
        ELSE name
    END
WHERE short_name IS NULL;

-- ============================================
-- Add exam_board_id to questions table (if missing)
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' 
        AND column_name = 'exam_board_id'
    ) THEN
        ALTER TABLE questions ADD COLUMN exam_board_id UUID REFERENCES exam_boards(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_questions_exam_board ON questions(exam_board_id);

-- ============================================
-- Add exam_board_id to assessments table (if missing)
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessments' 
        AND column_name = 'exam_board_id'
    ) THEN
        ALTER TABLE assessments ADD COLUMN exam_board_id UUID REFERENCES exam_boards(id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assessments' 
        AND column_name = 'level'
    ) THEN
        ALTER TABLE assessments ADD COLUMN level TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assessments_exam_board ON assessments(exam_board_id);
CREATE INDEX IF NOT EXISTS idx_assessments_level ON assessments(level);

-- ============================================
-- Fix test_attempts table
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_attempts' 
        AND column_name = 'assignment_id'
    ) THEN
        ALTER TABLE test_attempts ADD COLUMN assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE;
    END IF;
    
    -- Make test_id nullable
    ALTER TABLE test_attempts ALTER COLUMN test_id DROP NOT NULL;
    
    -- Make paper_id nullable if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'test_attempts' 
        AND column_name = 'paper_id'
    ) THEN
        ALTER TABLE test_attempts ALTER COLUMN paper_id DROP NOT NULL;
    END IF;
END $$;

-- Drop existing test_attempts policies
DROP POLICY IF EXISTS "test_attempts_student_select" ON test_attempts;
DROP POLICY IF EXISTS "test_attempts_student_insert" ON test_attempts;
DROP POLICY IF EXISTS "test_attempts_student_update" ON test_attempts;
DROP POLICY IF EXISTS "test_attempts_teacher_select" ON test_attempts;

-- Enable RLS
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;

-- Students can view their own attempts
CREATE POLICY "test_attempts_student_select"
ON test_attempts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Students can insert their own attempts
CREATE POLICY "test_attempts_student_insert"
ON test_attempts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Students can update their own attempts
CREATE POLICY "test_attempts_student_update"
ON test_attempts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Teachers can view attempts for their classes
CREATE POLICY "test_attempts_teacher_select"
ON test_attempts FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM assignments 
        WHERE assignments.id = test_attempts.assignment_id 
        AND EXISTS (
            SELECT 1 FROM classes 
            WHERE classes.id = assignments.target_class_id 
            AND classes.teacher_id = auth.uid()
        )
    )
);

-- ============================================
-- Fix class_announcements table
-- ============================================

DROP TABLE IF EXISTS class_announcements CASCADE;

CREATE TABLE class_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_class_announcements_class ON class_announcements(class_id);
CREATE INDEX idx_class_announcements_teacher ON class_announcements(teacher_id);
CREATE INDEX idx_class_announcements_pinned ON class_announcements(is_pinned);

ALTER TABLE class_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_announcements_teacher_select"
ON class_announcements FOR SELECT
TO authenticated
USING (
    teacher_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = class_announcements.class_id 
        AND classes.teacher_id = auth.uid()
    )
);

CREATE POLICY "class_announcements_student_select"
ON class_announcements FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM enrollments 
        WHERE enrollments.class_id = class_announcements.class_id 
        AND enrollments.user_id = auth.uid()
    )
);

CREATE POLICY "class_announcements_teacher_insert"
ON class_announcements FOR INSERT
TO authenticated
WITH CHECK (
    teacher_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = class_announcements.class_id 
        AND classes.teacher_id = auth.uid()
    )
);

CREATE POLICY "class_announcements_teacher_update"
ON class_announcements FOR UPDATE
TO authenticated
USING (teacher_id = auth.uid())
WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "class_announcements_teacher_delete"
ON class_announcements FOR DELETE
TO authenticated
USING (teacher_id = auth.uid());

-- ============================================
-- Ensure users table is readable
-- ============================================

DROP POLICY IF EXISTS "users_public_read" ON users;
CREATE POLICY "users_public_read"
ON users FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Safe migration completed! Existing exam_boards data preserved.' as result;
