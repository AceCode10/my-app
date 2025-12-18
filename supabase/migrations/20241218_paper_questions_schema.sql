-- ============================================
-- PAPER QUESTIONS SCHEMA
-- Links questions to past papers for full paper practice
-- ============================================

-- Create paper_questions junction table
CREATE TABLE IF NOT EXISTS paper_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL REFERENCES past_papers(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    
    -- Question ordering within the paper
    question_number INTEGER NOT NULL,
    section_name TEXT, -- e.g., "Section A", "Section B"
    part_label TEXT, -- e.g., "a", "b", "c" for sub-parts
    
    -- Question content (can be stored directly or reference questions table)
    question_text TEXT, -- The actual question text/markdown
    question_type TEXT DEFAULT 'short_answer' CHECK (question_type IN ('mcq', 'short_answer', 'essay', 'calculation', 'true_false', 'structured')),
    marks INTEGER NOT NULL DEFAULT 1,
    
    -- Answer/marking information
    correct_answer TEXT,
    mark_scheme TEXT,
    examiner_tips TEXT,
    
    -- MCQ options (stored as JSONB array)
    options JSONB, -- [{"label": "A", "text": "...", "is_correct": true}, ...]
    
    -- Media
    image_url TEXT,
    diagram_url TEXT,
    
    -- Metadata
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    topic_tags TEXT[], -- Array of topic tags for this question
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique question numbers within a paper
    UNIQUE(paper_id, question_number, part_label)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_paper_questions_paper_id ON paper_questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_questions_question_id ON paper_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_paper_questions_order ON paper_questions(paper_id, question_number, part_label);

-- Enable RLS
ALTER TABLE paper_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public can view questions for published papers
DROP POLICY IF EXISTS "Public can view paper questions" ON paper_questions;
CREATE POLICY "Public can view paper questions"
    ON paper_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM past_papers 
            WHERE past_papers.id = paper_questions.paper_id 
            AND past_papers.status = 'published'
        )
    );

-- Admins can manage all paper questions
DROP POLICY IF EXISTS "Admins can manage paper questions" ON paper_questions;
CREATE POLICY "Admins can manage paper questions"
    ON paper_questions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid()
            AND public.users.role IN ('super_admin', 'content_moderator')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid()
            AND public.users.role IN ('super_admin', 'content_moderator')
        )
    );

-- Create updated_at trigger
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

-- ============================================
-- PAPER ATTEMPT ANSWERS TABLE
-- Stores user answers for each question in a paper attempt
-- ============================================

CREATE TABLE IF NOT EXISTS paper_attempt_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    paper_question_id UUID NOT NULL REFERENCES paper_questions(id) ON DELETE CASCADE,
    
    -- User's answer
    answer_text TEXT,
    selected_option TEXT, -- For MCQ: the selected option label (A, B, C, D)
    
    -- Scoring (for self-assessment or auto-grading)
    marks_awarded DECIMAL(5,2),
    is_correct BOOLEAN,
    
    -- Metadata
    time_spent_seconds INTEGER,
    flagged_for_review BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One answer per question per attempt
    UNIQUE(attempt_id, paper_question_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_paper_attempt_answers_attempt ON paper_attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_paper_attempt_answers_question ON paper_attempt_answers(paper_question_id);

-- Enable RLS
ALTER TABLE paper_attempt_answers ENABLE ROW LEVEL SECURITY;

-- Users can manage their own answers
DROP POLICY IF EXISTS "Users can manage own paper answers" ON paper_attempt_answers;
CREATE POLICY "Users can manage own paper answers"
    ON paper_attempt_answers FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessment_attempts
            WHERE assessment_attempts.id = paper_attempt_answers.attempt_id
            AND assessment_attempts.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM assessment_attempts
            WHERE assessment_attempts.id = paper_attempt_answers.attempt_id
            AND assessment_attempts.user_id = auth.uid()
        )
    );

-- Admins can view all answers
DROP POLICY IF EXISTS "Admins can view all paper answers" ON paper_attempt_answers;
CREATE POLICY "Admins can view all paper answers"
    ON paper_attempt_answers FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE public.users.id = auth.uid()
            AND public.users.role IN ('super_admin', 'content_moderator', 'teacher')
        )
    );

-- Create updated_at trigger for answers
CREATE OR REPLACE FUNCTION update_paper_attempt_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS paper_attempt_answers_updated_at ON paper_attempt_answers;
CREATE TRIGGER paper_attempt_answers_updated_at
    BEFORE UPDATE ON paper_attempt_answers
    FOR EACH ROW
    EXECUTE FUNCTION update_paper_attempt_answers_updated_at();

-- ============================================
-- HELPER VIEW: Full paper with questions
-- ============================================

CREATE OR REPLACE VIEW paper_with_questions AS
SELECT 
    pp.id as paper_id,
    pp.title as paper_title,
    pp.year,
    pp.session,
    pp.paper_number,
    pp.variant,
    pp.duration_minutes,
    pp.total_marks,
    pp.subject_id,
    pp.exam_board_id,
    pp.status as paper_status,
    pp.question_paper_url,
    pp.mark_scheme_url,
    pq.id as question_id,
    pq.question_number,
    pq.section_name,
    pq.part_label,
    pq.question_text,
    pq.question_type,
    pq.marks as question_marks,
    pq.correct_answer,
    pq.mark_scheme as question_mark_scheme,
    pq.options,
    pq.image_url,
    pq.difficulty
FROM past_papers pp
LEFT JOIN paper_questions pq ON pq.paper_id = pp.id
ORDER BY pp.id, pq.question_number, pq.part_label;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

SELECT '✅ Paper questions schema migration complete!' as status;
