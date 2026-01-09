-- Fixed Gamification and Notifications Schema
-- Migration: 20241228_gamification_schema_fixed.sql
-- This migration handles existing tables and adds missing columns

-- ========================================
-- HANDLE EXISTING TABLES
-- ========================================

-- Check and add missing columns to existing badges table
DO $$
BEGIN
    -- Add icon column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'badges' AND column_name = 'icon'
    ) THEN
        ALTER TABLE badges ADD COLUMN icon TEXT NOT NULL DEFAULT '🏆';
    END IF;

    -- Add category column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'badges' AND column_name = 'category'
    ) THEN
        ALTER TABLE badges ADD COLUMN category TEXT NOT NULL DEFAULT 'special';
    END IF;

    -- Add requirement_type column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'badges' AND column_name = 'requirement_type'
    ) THEN
        ALTER TABLE badges ADD COLUMN requirement_type TEXT NOT NULL DEFAULT 'special';
    END IF;

    -- Add requirement_value column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'badges' AND column_name = 'requirement_value'
    ) THEN
        ALTER TABLE badges ADD COLUMN requirement_value INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Add points column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'badges' AND column_name = 'points'
    ) THEN
        ALTER TABLE badges ADD COLUMN points INTEGER DEFAULT 0;
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'badges' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE badges ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'badges' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE badges ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Make criteria column nullable if it exists (to avoid NOT NULL constraint errors)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'badges' AND column_name = 'criteria' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE badges ALTER COLUMN criteria DROP NOT NULL;
    END IF;
END $$;

-- ========================================
-- CREATE MISSING TABLES
-- ========================================

-- User XP and gamification profile (only if doesn't exist)
CREATE TABLE IF NOT EXISTS user_gamification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- XP System
    total_xp INTEGER DEFAULT 0,
    xp_this_week INTEGER DEFAULT 0,
    xp_level INTEGER DEFAULT 1,
    xp_progress_to_next_level INTEGER DEFAULT 0,
    xp_needed_for_next_level INTEGER DEFAULT 100,
    
    -- Streak System
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    streak_freeze_count INTEGER DEFAULT 0,
    
    -- Activity Tracking
    total_quizzes_completed INTEGER DEFAULT 0,
    total_notes_viewed INTEGER DEFAULT 0,
    total_time_spent_minutes INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- User earned badges (only if doesn't exist)
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id),
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    is_displayed BOOLEAN DEFAULT true,
    UNIQUE(user_id, badge_id)
);

-- XP transactions for audit trail (only if doesn't exist)
CREATE TABLE IF NOT EXISTS xp_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    xp_amount INTEGER NOT NULL,
    source_type TEXT NOT NULL, -- 'quiz_completion', 'note_view', 'badge_earned', etc.
    source_id UUID, -- reference to quiz, note, etc.
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard cache for performance (only if doesn't exist)
CREATE TABLE IF NOT EXISTS leaderboard_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    total_xp INTEGER NOT NULL,
    level INTEGER NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table (only if doesn't exist)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'quiz_completed', 'streak_milestone', 'badge_earned', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    action_text TEXT,
    is_read BOOLEAN DEFAULT false,
    is_push_sent BOOLEAN DEFAULT false,
    is_email_sent BOOLEAN DEFAULT false,
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    data JSONB, -- Additional structured data
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- Notification preferences (only if doesn't exist)
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    quiz_completed BOOLEAN DEFAULT true,
    streak_milestone BOOLEAN DEFAULT true,
    badge_earned BOOLEAN DEFAULT true,
    assignment_due BOOLEAN DEFAULT true,
    class_announcement BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Class announcements (only if doesn't exist)
CREATE TABLE IF NOT EXISTS class_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_published BOOLEAN DEFAULT false,
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- ========================================
-- CREATE INDEXES
-- ========================================

-- Gamification indexes
CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id ON user_gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_total_xp ON user_gamification(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_gamification_current_streak ON user_gamification(current_streak DESC);

-- Badge indexes
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_is_active ON badges(is_active);

-- User badges indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at DESC);

-- XP transactions indexes
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created_at ON xp_transactions(created_at DESC);

-- Leaderboard indexes
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_rank ON leaderboard_cache(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_updated_at ON leaderboard_cache(updated_at);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Class announcement indexes
CREATE INDEX IF NOT EXISTS idx_class_announcements_class_id ON class_announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_class_announcements_published ON class_announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_class_announcements_scheduled ON class_announcements(scheduled_at);

-- ========================================
-- RLS POLICIES
-- ========================================

-- Enable RLS on all tables (only if not already enabled)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'user_gamification' AND rowsecurity = true
    ) THEN
        ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'badges' AND rowsecurity = true
    ) THEN
        ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'user_badges' AND rowsecurity = true
    ) THEN
        ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'xp_transactions' AND rowsecurity = true
    ) THEN
        ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'leaderboard_cache' AND rowsecurity = true
    ) THEN
        ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'notifications' AND rowsecurity = true
    ) THEN
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'notification_preferences' AND rowsecurity = true
    ) THEN
        ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'class_announcements' AND rowsecurity = true
    ) THEN
        ALTER TABLE class_announcements ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own gamification" ON user_gamification;
DROP POLICY IF EXISTS "Users can update own gamification" ON user_gamification;
DROP POLICY IF EXISTS "Anyone can view active badges" ON badges;
DROP POLICY IF EXISTS "Admins can manage badges" ON badges;
DROP POLICY IF EXISTS "Users can view own badges" ON user_badges;
DROP POLICY IF EXISTS "System can insert badges" ON user_badges;
DROP POLICY IF EXISTS "Users can view own XP transactions" ON xp_transactions;
DROP POLICY IF EXISTS "System can insert XP transactions" ON xp_transactions;
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON leaderboard_cache;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Class members can view announcements" ON class_announcements;
DROP POLICY IF EXISTS "Teachers can manage announcements" ON class_announcements;

-- Create new policies
-- User gamification policies
CREATE POLICY "Users can view own gamification" ON user_gamification
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own gamification" ON user_gamification
    FOR UPDATE USING (auth.uid() = user_id);

-- Badges policies (public read, admin write)
CREATE POLICY "Anyone can view active badges" ON badges
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage badges" ON badges
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('super_admin', 'content_moderator')
        )
    );

-- User badges policies
CREATE POLICY "Users can view own badges" ON user_badges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert badges" ON user_badges
    FOR INSERT WITH CHECK (true);

-- XP transactions policies
CREATE POLICY "Users can view own XP transactions" ON xp_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert XP transactions" ON xp_transactions
    FOR INSERT WITH CHECK (true);

-- Leaderboard policies
CREATE POLICY "Anyone can view leaderboard" ON leaderboard_cache
    FOR SELECT USING (true);

-- Notification policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Notification preferences policies
CREATE POLICY "Users can manage own preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Class announcement policies
CREATE POLICY "Class members can view announcements" ON class_announcements
    FOR SELECT USING (
        is_published = true AND
        EXISTS (
            SELECT 1 FROM enrollments 
            WHERE class_id = class_announcements.class_id 
            AND user_id = auth.uid()
            AND status = 'active'
        )
    );

CREATE POLICY "Teachers can manage announcements" ON class_announcements
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM enrollments 
            WHERE class_id = class_announcements.class_id 
            AND user_id = auth.uid()
            AND status = 'active'
            AND EXISTS (
                SELECT 1 FROM classes 
                WHERE id = class_announcements.class_id 
                AND teacher_id = auth.uid()
            )
        )
    );

-- ========================================
-- DATABASE FUNCTIONS
-- ========================================

-- Initialize user gamification profile
CREATE OR REPLACE FUNCTION initialize_user_gamification(p_user_id UUID) RETURNS VOID AS $$
BEGIN
    INSERT INTO user_gamification (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Award XP function
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
    xp_needed INTEGER;
BEGIN
    -- Update user gamification
    UPDATE user_gamification 
    SET 
        total_xp = total_xp + p_xp_amount,
        xp_this_week = xp_this_week + p_xp_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Get current level
    SELECT xp_level INTO current_level 
    FROM user_gamification 
    WHERE user_id = p_user_id;
    
    -- Calculate new level (100 XP per level)
    new_level := FLOOR((SELECT total_xp FROM user_gamification WHERE user_id = p_user_id) / 100) + 1;
    
    -- Update level if changed
    IF new_level > current_level THEN
        UPDATE user_gamification 
        SET 
            xp_level = new_level,
            xp_progress_to_next_level = 0,
            xp_needed_for_next_level = 100
        WHERE user_id = p_user_id;
    END IF;
    
    -- Record transaction
    INSERT INTO xp_transactions (user_id, xp_amount, source_type, source_id, description)
    VALUES (p_user_id, p_xp_amount, p_source_type, p_source_id, p_description);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Update streak function
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID) RETURNS BOOLEAN AS $$
DECLARE
    last_activity DATE;
    current_date DATE := CURRENT_DATE;
    streak_count INTEGER;
BEGIN
    -- Get last activity date
    SELECT last_activity_date INTO last_activity
    FROM user_gamification
    WHERE user_id = p_user_id;
    
    -- If no previous activity, start new streak
    IF last_activity IS NULL THEN
        UPDATE user_gamification
        SET 
            current_streak = 1,
            longest_streak = GREATEST(longest_streak, 1),
            last_activity_date = current_date,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        RETURN true;
    END IF;
    
    -- If last activity was yesterday, increment streak
    IF last_activity = current_date - INTERVAL '1 day' THEN
        UPDATE user_gamification
        SET 
            current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_activity_date = current_date,
            updated_at = NOW()
        WHERE user_id = p_user_id;
        RETURN true;
    END IF;
    
    -- If already active today, no change
    IF last_activity = current_date THEN
        RETURN true;
    END IF;
    
    -- If streak broken, reset to 1
    UPDATE user_gamification
    SET 
        current_streak = 1,
        last_activity_date = current_date,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Award badge function
CREATE OR REPLACE FUNCTION award_badge(p_user_id UUID, p_badge_name TEXT) RETURNS BOOLEAN AS $$
DECLARE
    badge_id UUID;
BEGIN
    -- Get badge ID
    SELECT id INTO badge_id
    FROM badges
    WHERE name = p_badge_name AND is_active = true;
    
    IF badge_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Award badge if not already earned
    INSERT INTO user_badges (user_id, badge_id)
    VALUES (p_user_id, badge_id)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Update leaderboard cache
CREATE OR REPLACE FUNCTION update_leaderboard_cache() RETURNS VOID AS $$
BEGIN
    -- Refresh leaderboard cache
    DELETE FROM leaderboard_cache;
    
    INSERT INTO leaderboard_cache (user_id, rank, total_xp, level, display_name, avatar_url, updated_at)
    SELECT 
        ug.user_id,
        ROW_NUMBER() OVER (ORDER BY ug.total_xp DESC, ug.created_at ASC) as rank,
        ug.total_xp,
        ug.xp_level,
        COALESCE(u.display_name, u.email) as display_name,
        u.avatar_url,
        NOW() as updated_at
    FROM user_gamification ug
    JOIN users u ON ug.user_id = u.id
    WHERE u.leaderboard_opt_out = false
    ORDER BY ug.total_xp DESC, ug.created_at ASC
    LIMIT 1000;
    
    -- Notify clients of leaderboard update
    PERFORM pg_notify('leaderboard_updated', 'refresh');
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- INITIAL BADGE DATA
-- ========================================

-- Insert initial badges (only if badges table is empty)
INSERT INTO badges (name, description, icon, category, requirement_type, requirement_value, points)
SELECT 
    name, description, icon, category, requirement_type, requirement_value, points
FROM (VALUES
-- XP Badges
('XP Beginner', 'Earn your first 100 XP', '🌟', 'xp', 'xp_threshold', 100, 10),
('XP Learner', 'Earn 500 XP', '⭐', 'xp', 'xp_threshold', 500, 25),
('XP Expert', 'Earn 1,000 XP', '💫', 'xp', 'xp_threshold', 1000, 50),
('XP Master', 'Earn 5,000 XP', '🌠', 'xp', 'xp_threshold', 5000, 100),
('XP Legend', 'Earn 10,000 XP', '🌌', 'xp', 'xp_threshold', 10000, 200),

-- Streak Badges
('First Steps', 'Start your first streak', '👣', 'streak', 'special', 0, 5),
('3 Day Streak', 'Maintain a 3-day streak', '🔥', 'streak', 'special', 0, 15),
('Week Warrior', 'Maintain a 7-day streak', '🔥', 'streak', 'special', 0, 25),
('Fortnight Fighter', 'Maintain a 14-day streak', '🔥', 'streak', 'special', 0, 50),
('Monthly Master', 'Maintain a 30-day streak', '🔥', 'streak', 'special', 0, 100),
('Streak Legend', 'Maintain a 100-day streak', '🔥', 'streak', 'special', 0, 200),

-- Quiz Badges
('First Quiz', 'Complete your first quiz', '📝', 'quiz', 'quiz_count', 1, 10),
('Quiz Enthusiast', 'Complete 10 quizzes', '📚', 'quiz', 'quiz_count', 10, 25),
('Quiz Expert', 'Complete 50 quizzes', '🎯', 'quiz', 'quiz_count', 50, 75),
('Quiz Master', 'Complete 100 quizzes', '🏆', 'quiz', 'quiz_count', 100, 150),

-- Note Badges
('Note Reader', 'Read your first note', '📖', 'note', 'note_count', 1, 5),
('Note Learner', 'Read 25 notes', '📚', 'note', 'note_count', 25, 20),
('Note Scholar', 'Read 100 notes', '🎓', 'note', 'note_count', 100, 50),

-- Special Badges
('Perfect Score', 'Get 100% on a quiz', '💯', 'special', 'perfect_quiz', 1, 30),
('Quick Learner', 'Complete a quiz in under 5 minutes', '⚡', 'special', 'quick_quiz', 1, 20),
('Night Owl', 'Study after 10 PM', '🦉', 'special', 'time_based', 1, 15),
('Early Bird', 'Study before 7 AM', '🐦', 'special', 'time_based', 1, 15),
('Weekend Warrior', 'Study on weekend', '🌟', 'special', 'time_based', 1, 15)
) AS badges_data(name, description, icon, category, requirement_type, requirement_value, points)
WHERE NOT EXISTS (SELECT 1 FROM badges LIMIT 1);

COMMIT;
