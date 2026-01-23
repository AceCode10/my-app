-- ============================================
-- Create quiz_attempts table for tracking topical question progress
-- Migration: 20250123_create_quiz_attempts_table_fixed.sql
-- ============================================

-- Create quiz_attempts table if it doesn't exist
CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_id UUID REFERENCES quizzes(id) ON DELETE SET NULL,
    class_id UUID,
    topic TEXT,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_subject_id ON quiz_attempts(subject_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_completed_at ON quiz_attempts(completed_at);

-- Enable RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users can view own quiz attempts" ON quiz_attempts
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users can insert own quiz attempts" ON quiz_attempts
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own quiz attempts" ON quiz_attempts;
CREATE POLICY "Users can update own quiz attempts" ON quiz_attempts
    FOR UPDATE USING (user_id = auth.uid());

-- Allow admins to view all attempts
DROP POLICY IF EXISTS "Admins can view all quiz attempts" ON quiz_attempts;
CREATE POLICY "Admins can view all quiz attempts" ON quiz_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.is_admin = true
        )
    );

-- ============================================
-- Create xp_transactions table for logging XP history
-- ============================================
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    xp_amount INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    source_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_source_type ON xp_transactions(source_type);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at);

-- Enable RLS
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for xp_transactions
DROP POLICY IF EXISTS "Users can view own xp transactions" ON xp_transactions;
CREATE POLICY "Users can view own xp transactions" ON xp_transactions
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "System can insert xp transactions" ON xp_transactions;
CREATE POLICY "System can insert xp transactions" ON xp_transactions
    FOR INSERT WITH CHECK (true);

-- ============================================
-- Ensure user_gamification table has all required columns
-- ============================================
DO $$
BEGIN
    -- Add xp_this_week column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_gamification' AND column_name = 'xp_this_week') THEN
        ALTER TABLE user_gamification ADD COLUMN xp_this_week INTEGER DEFAULT 0;
    END IF;
    
    -- Add xp_today column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_gamification' AND column_name = 'xp_today') THEN
        ALTER TABLE user_gamification ADD COLUMN xp_today INTEGER DEFAULT 0;
    END IF;
    
    -- Add last_xp_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_gamification' AND column_name = 'last_xp_date') THEN
        ALTER TABLE user_gamification ADD COLUMN last_xp_date DATE;
    END IF;
END $$;

-- ============================================
-- Update award_xp function to track daily XP
-- ============================================
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_xp_amount INTEGER,
    p_source_type TEXT,
    p_source_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    current_level INTEGER;
    new_level INTEGER;
    current_xp INTEGER;
    new_xp INTEGER;
    xp_progress INTEGER;
    xp_needed INTEGER;
    today_date DATE := CURRENT_DATE;
    current_xp_today INTEGER;
    current_last_xp_date DATE;
BEGIN
    -- First ensure user_gamification record exists
    INSERT INTO user_gamification (
        user_id, 
        total_xp, 
        xp_this_week,
        xp_today,
        xp_level,
        xp_progress_to_next_level,
        xp_needed_for_next_level,
        current_streak,
        longest_streak,
        last_xp_date
    )
    VALUES (
        p_user_id, 
        0, 
        0,
        0,
        1,
        0,
        100,
        0,
        0,
        NULL
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get current state
    SELECT total_xp, xp_level, xp_progress_to_next_level, xp_needed_for_next_level, 
           COALESCE(xp_today, 0), last_xp_date
    INTO current_xp, current_level, xp_progress, xp_needed, current_xp_today, current_last_xp_date
    FROM user_gamification 
    WHERE user_id = p_user_id;
    
    -- Reset daily XP if it's a new day
    IF current_last_xp_date IS NULL OR current_last_xp_date < today_date THEN
        current_xp_today := 0;
    END IF;
    
    -- Calculate new values
    new_xp := current_xp + p_xp_amount;
    xp_progress := xp_progress + p_xp_amount;
    
    -- Check for level up (handle multiple level ups at once)
    new_level := current_level;
    WHILE xp_progress >= xp_needed LOOP
        xp_progress := xp_progress - xp_needed;
        new_level := new_level + 1;
        xp_needed := ROUND(xp_needed * 1.2); -- 20% more XP needed per level
    END LOOP;
    
    -- Update user gamification
    UPDATE user_gamification 
    SET 
        total_xp = new_xp,
        xp_this_week = xp_this_week + p_xp_amount,
        xp_today = current_xp_today + p_xp_amount,
        xp_level = new_level,
        xp_progress_to_next_level = xp_progress,
        xp_needed_for_next_level = xp_needed,
        last_xp_date = today_date,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Record transaction
    INSERT INTO xp_transactions (user_id, xp_amount, source_type, source_id, description)
    VALUES (p_user_id, p_xp_amount, p_source_type, p_source_id, p_description);
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE NOTICE 'Error in award_xp: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION award_xp(UUID, INTEGER, TEXT, UUID, TEXT) TO authenticated;
