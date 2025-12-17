-- Add missing columns to subjects table
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS exam_board VARCHAR(50);
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS icon_url TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#3b82f6';

-- Create index for display_order
CREATE INDEX IF NOT EXISTS idx_subjects_display_order ON subjects(display_order);

-- Drop the existing level check constraint and add a new one with all supported levels
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_level_check;
ALTER TABLE subjects ADD CONSTRAINT subjects_level_check 
  CHECK (level IS NULL OR level IN ('igcse', 'gcse', 'as', 'a2', 'alevel', 'ib_myp', 'ib_dp', 'ap'));

-- Add missing columns to topics table
ALTER TABLE topics ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published';
ALTER TABLE topics ADD COLUMN IF NOT EXISTS code VARCHAR(20);
ALTER TABLE topics ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS answers_pdf_url TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS estimated_time INTEGER;

-- Add missing columns to subtopics table (if exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subtopics') THEN
        ALTER TABLE subtopics ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published';
    END IF;
END $$;

-- Create questions table if not exists
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    stem_markdown TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'short_answer',
    difficulty VARCHAR(20) DEFAULT 'medium',
    marks INTEGER DEFAULT 2,
    correct_answer TEXT,
    options JSONB,
    explanation TEXT,
    examiner_comment TEXT,
    question_number VARCHAR(20),
    status VARCHAR(20) DEFAULT 'published',
    exam_board_id UUID REFERENCES exam_boards(id),
    level VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for questions
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam_board_id ON questions(exam_board_id);

-- Enable RLS on questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for questions
DROP POLICY IF EXISTS "Public can view questions" ON questions;
CREATE POLICY "Public can view questions"
    ON questions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admins can manage all questions" ON questions;
CREATE POLICY "Admins can manage all questions"
    ON questions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = (SELECT auth.uid())
            AND role IN ('super_admin', 'content_moderator')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = (SELECT auth.uid())
            AND role IN ('super_admin', 'content_moderator')
        )
    );
