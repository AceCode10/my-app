-- ============================================
-- User Progress Tracking
-- Enables "Pick up where you left off" feature
-- ============================================

-- Create user_progress table to track where users left off
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- What they were doing
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'viewing_notes',
        'practicing_questions', 
        'taking_quiz',
        'reviewing_flashcards',
        'watching_video'
    )),
    
    -- Context references
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
    question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    
    -- Progress details
    progress_data JSONB DEFAULT '{}', -- Flexible storage for scroll position, question index, etc.
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Ensure one active progress per user per activity type per context
    UNIQUE(user_id, activity_type, subject_id, topic_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_last_accessed ON user_progress(user_id, last_accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_activity ON user_progress(user_id, activity_type);

-- Enable RLS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own progress
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
CREATE POLICY "Users can view own progress"
    ON user_progress FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
CREATE POLICY "Users can insert own progress"
    ON user_progress FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;
CREATE POLICY "Users can update own progress"
    ON user_progress FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own progress" ON user_progress;
CREATE POLICY "Users can delete own progress"
    ON user_progress FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- Topic Progress Summary (aggregated view)
-- ============================================
CREATE TABLE IF NOT EXISTS user_topic_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    
    -- Progress metrics
    notes_read INTEGER DEFAULT 0,
    total_notes INTEGER DEFAULT 0,
    questions_attempted INTEGER DEFAULT 0,
    questions_correct INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    
    -- Calculated fields
    mastery_level VARCHAR(20) DEFAULT 'not_started' CHECK (mastery_level IN (
        'not_started', 'beginner', 'intermediate', 'proficient', 'mastered'
    )),
    
    -- Timestamps
    first_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, topic_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_user ON user_topic_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_topic_progress_subject ON user_topic_progress(user_id, subject_id);

-- Enable RLS
ALTER TABLE user_topic_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own topic progress" ON user_topic_progress;
CREATE POLICY "Users can view own topic progress"
    ON user_topic_progress FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own topic progress" ON user_topic_progress;
CREATE POLICY "Users can manage own topic progress"
    ON user_topic_progress FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ============================================
-- Function to update/upsert user progress
-- ============================================
CREATE OR REPLACE FUNCTION upsert_user_progress(
    p_activity_type VARCHAR(50),
    p_subject_id UUID DEFAULT NULL,
    p_topic_id UUID DEFAULT NULL,
    p_note_id UUID DEFAULT NULL,
    p_question_id UUID DEFAULT NULL,
    p_progress_data JSONB DEFAULT '{}',
    p_completion_percentage INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_progress_id UUID;
BEGIN
    INSERT INTO user_progress (
        user_id,
        activity_type,
        subject_id,
        topic_id,
        note_id,
        question_id,
        progress_data,
        completion_percentage,
        last_accessed_at
    ) VALUES (
        auth.uid(),
        p_activity_type,
        p_subject_id,
        p_topic_id,
        p_note_id,
        p_question_id,
        p_progress_data,
        p_completion_percentage,
        NOW()
    )
    ON CONFLICT (user_id, activity_type, subject_id, topic_id)
    DO UPDATE SET
        note_id = COALESCE(EXCLUDED.note_id, user_progress.note_id),
        question_id = COALESCE(EXCLUDED.question_id, user_progress.question_id),
        progress_data = EXCLUDED.progress_data,
        completion_percentage = EXCLUDED.completion_percentage,
        last_accessed_at = NOW()
    RETURNING id INTO v_progress_id;
    
    RETURN v_progress_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function to get recent activity for "Continue where you left off"
-- ============================================
CREATE OR REPLACE FUNCTION get_recent_progress(p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
    id UUID,
    activity_type VARCHAR(50),
    subject_id UUID,
    subject_name TEXT,
    topic_id UUID,
    topic_name TEXT,
    note_id UUID,
    question_id UUID,
    progress_data JSONB,
    completion_percentage INTEGER,
    last_accessed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.activity_type,
        up.subject_id,
        s.name AS subject_name,
        up.topic_id,
        t.name AS topic_name,
        up.note_id,
        up.question_id,
        up.progress_data,
        up.completion_percentage,
        up.last_accessed_at
    FROM user_progress up
    LEFT JOIN subjects s ON s.id = up.subject_id
    LEFT JOIN topics t ON t.id = up.topic_id
    WHERE up.user_id = auth.uid()
      AND up.completed_at IS NULL
    ORDER BY up.last_accessed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
