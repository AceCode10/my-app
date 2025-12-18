-- ============================================
-- CLEAN PAPER QUESTIONS SCHEMA
-- Dedicated table for past paper questions
-- Separate from topical questions
-- ============================================

-- Drop dependent tables first
DROP TABLE IF EXISTS paper_attempt_answers CASCADE;
DROP TABLE IF EXISTS paper_questions CASCADE;

-- Create a clean paper_questions table
CREATE TABLE paper_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL REFERENCES past_papers(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL DEFAULT 1,
    section_name TEXT,
    part_label TEXT,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'short_answer',
    marks INTEGER DEFAULT 1,
    correct_answer TEXT,
    mark_scheme TEXT,
    examiner_tips TEXT,
    options JSONB,
    difficulty VARCHAR(20) DEFAULT 'medium',
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_paper_questions_paper_id ON paper_questions(paper_id);
CREATE INDEX idx_paper_questions_question_number ON paper_questions(question_number);

-- Enable RLS
ALTER TABLE paper_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view paper questions
CREATE POLICY "Anyone can view paper questions"
    ON paper_questions FOR SELECT
    USING (true);

-- RLS Policy: Authenticated admins can manage paper questions
CREATE POLICY "Admins can manage paper questions"
    ON paper_questions FOR ALL
    TO authenticated
    USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'content_moderator', 'admin')
    )
    WITH CHECK (
        (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'content_moderator', 'admin')
    );

-- ============================================
-- PAPER ATTEMPT ANSWERS TABLE
-- Stores user answers for each question in a paper attempt
-- ============================================

CREATE TABLE paper_attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    paper_question_id UUID NOT NULL REFERENCES paper_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    selected_option TEXT,
    is_flagged BOOLEAN DEFAULT false,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(attempt_id, paper_question_id)
);

-- Create indexes
CREATE INDEX idx_paper_attempt_answers_attempt ON paper_attempt_answers(attempt_id);
CREATE INDEX idx_paper_attempt_answers_question ON paper_attempt_answers(paper_question_id);

-- Enable RLS
ALTER TABLE paper_attempt_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own answers
CREATE POLICY "Users can view own answers"
    ON paper_attempt_answers FOR SELECT
    TO authenticated
    USING (
        attempt_id IN (
            SELECT id FROM assessment_attempts WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Users can insert their own answers
CREATE POLICY "Users can insert own answers"
    ON paper_attempt_answers FOR INSERT
    TO authenticated
    WITH CHECK (
        attempt_id IN (
            SELECT id FROM assessment_attempts WHERE user_id = auth.uid()
        )
    );

-- RLS Policy: Users can update their own answers
CREATE POLICY "Users can update own answers"
    ON paper_attempt_answers FOR UPDATE
    TO authenticated
    USING (
        attempt_id IN (
            SELECT id FROM assessment_attempts WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        attempt_id IN (
            SELECT id FROM assessment_attempts WHERE user_id = auth.uid()
        )
    );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_paper_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS paper_questions_updated_at ON paper_questions;
CREATE TRIGGER paper_questions_updated_at
    BEFORE UPDATE ON paper_questions
    FOR EACH ROW
    EXECUTE FUNCTION update_paper_questions_updated_at();

DROP TRIGGER IF EXISTS paper_attempt_answers_updated_at ON paper_attempt_answers;
CREATE TRIGGER paper_attempt_answers_updated_at
    BEFORE UPDATE ON paper_attempt_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_paper_questions_updated_at();

SELECT 'Paper questions and answers tables created successfully!' as status;
