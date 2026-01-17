-- Daily Goals System Migration
-- Adds tables for tracking daily XP goals, quests, and streaks

-- ============================================
-- DAILY GOALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Goal settings
  goal_type TEXT NOT NULL DEFAULT 'xp' CHECK (goal_type IN ('xp', 'questions', 'time')),
  goal_difficulty TEXT NOT NULL DEFAULT 'regular' CHECK (goal_difficulty IN ('casual', 'regular', 'serious', 'intense')),
  target_value INTEGER NOT NULL,
  
  -- Progress tracking
  current_value INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  
  -- Date tracking
  goal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One goal per type per day per user
  UNIQUE(user_id, goal_type, goal_date)
);

-- ============================================
-- GOAL PRESETS (difficulty levels)
-- ============================================
CREATE TABLE IF NOT EXISTS goal_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  difficulty TEXT NOT NULL UNIQUE CHECK (difficulty IN ('casual', 'regular', 'serious', 'intense')),
  display_name TEXT NOT NULL,
  description TEXT NOT NULL,
  xp_target INTEGER NOT NULL,
  questions_target INTEGER NOT NULL,
  time_target_minutes INTEGER NOT NULL,
  xp_bonus INTEGER NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT '🎯',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Insert default presets
INSERT INTO goal_presets (difficulty, display_name, description, xp_target, questions_target, time_target_minutes, xp_bonus, icon, sort_order) VALUES
  ('casual', 'Casual', '5 mins a day', 20, 5, 5, 5, '🌱', 1),
  ('regular', 'Regular', '10 mins a day', 50, 10, 10, 15, '📚', 2),
  ('serious', 'Serious', '15 mins a day', 100, 20, 15, 30, '🔥', 3),
  ('intense', 'Intense', '20 mins a day', 200, 40, 20, 50, '💪', 4)
ON CONFLICT (difficulty) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  xp_target = EXCLUDED.xp_target,
  questions_target = EXCLUDED.questions_target,
  time_target_minutes = EXCLUDED.time_target_minutes,
  xp_bonus = EXCLUDED.xp_bonus,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- ============================================
-- USER GOAL PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS user_goal_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Preferred difficulty
  preferred_difficulty TEXT NOT NULL DEFAULT 'regular' CHECK (preferred_difficulty IN ('casual', 'regular', 'serious', 'intense')),
  
  -- Goal type preference (which goal to show primarily)
  primary_goal_type TEXT NOT NULL DEFAULT 'xp' CHECK (primary_goal_type IN ('xp', 'questions', 'time')),
  
  -- Notification preferences
  reminder_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reminder_time TIME DEFAULT '18:00:00',
  
  -- Stats
  total_goals_completed INTEGER NOT NULL DEFAULT 0,
  current_goal_streak INTEGER NOT NULL DEFAULT 0,
  longest_goal_streak INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- DAILY QUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Quest definition
  quest_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '⭐',
  
  -- Requirements
  requirement_type TEXT NOT NULL, -- 'quiz_complete', 'perfect_score', 'streak_maintain', etc.
  requirement_value INTEGER NOT NULL DEFAULT 1,
  
  -- Progress
  current_progress INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  
  -- Rewards
  xp_reward INTEGER NOT NULL DEFAULT 10,
  
  -- Date tracking
  quest_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique quest per type per day
  UNIQUE(user_id, quest_type, quest_date)
);

-- ============================================
-- QUEST TEMPLATES
-- ============================================
CREATE TABLE IF NOT EXISTS quest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_type TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '⭐',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 10,
  difficulty TEXT NOT NULL DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default quest templates
INSERT INTO quest_templates (quest_type, title, description, icon, requirement_type, requirement_value, xp_reward, difficulty) VALUES
  ('complete_quiz', 'Quiz Champion', 'Complete 1 quiz today', '📝', 'quiz_complete', 1, 15, 'easy'),
  ('complete_3_quizzes', 'Triple Threat', 'Complete 3 quizzes today', '🎯', 'quiz_complete', 3, 30, 'medium'),
  ('perfect_score', 'Perfectionist', 'Get a perfect score on any quiz', '💯', 'perfect_score', 1, 50, 'hard'),
  ('read_notes', 'Knowledge Seeker', 'Read study notes for 5 minutes', '📖', 'notes_time', 5, 10, 'easy'),
  ('earn_xp', 'XP Hunter', 'Earn 50 XP today', '⚡', 'xp_earned', 50, 20, 'medium'),
  ('maintain_streak', 'Streak Keeper', 'Maintain your learning streak', '🔥', 'streak_maintain', 1, 25, 'easy'),
  ('first_activity', 'Early Bird', 'Complete your first activity of the day', '🌅', 'first_activity', 1, 10, 'easy'),
  ('high_score', 'High Achiever', 'Score 80% or higher on a quiz', '🌟', 'high_score', 80, 25, 'medium')
ON CONFLICT (quest_type) DO NOTHING;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create daily goals for a user
CREATE OR REPLACE FUNCTION create_daily_goals(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_difficulty TEXT;
  v_preset RECORD;
BEGIN
  -- Get user's preferred difficulty
  SELECT preferred_difficulty INTO v_difficulty
  FROM user_goal_preferences
  WHERE user_id = p_user_id;
  
  -- Default to regular if no preference
  IF v_difficulty IS NULL THEN
    v_difficulty := 'regular';
  END IF;
  
  -- Get preset values
  SELECT * INTO v_preset FROM goal_presets WHERE difficulty = v_difficulty;
  
  -- Create XP goal
  INSERT INTO daily_goals (user_id, goal_type, goal_difficulty, target_value, goal_date)
  VALUES (p_user_id, 'xp', v_difficulty, v_preset.xp_target, CURRENT_DATE)
  ON CONFLICT (user_id, goal_type, goal_date) DO NOTHING;
  
  -- Create questions goal
  INSERT INTO daily_goals (user_id, goal_type, goal_difficulty, target_value, goal_date)
  VALUES (p_user_id, 'questions', v_difficulty, v_preset.questions_target, CURRENT_DATE)
  ON CONFLICT (user_id, goal_type, goal_date) DO NOTHING;
  
  -- Create time goal
  INSERT INTO daily_goals (user_id, goal_type, goal_difficulty, target_value, goal_date)
  VALUES (p_user_id, 'time', v_difficulty, v_preset.time_target_minutes, CURRENT_DATE)
  ON CONFLICT (user_id, goal_type, goal_date) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update goal progress
CREATE OR REPLACE FUNCTION update_goal_progress(
  p_user_id UUID,
  p_goal_type TEXT,
  p_increment INTEGER
)
RETURNS TABLE (
  goal_id UUID,
  new_value INTEGER,
  target INTEGER,
  just_completed BOOLEAN,
  xp_bonus INTEGER
) AS $$
DECLARE
  v_goal RECORD;
  v_preset RECORD;
  v_just_completed BOOLEAN := FALSE;
  v_xp_bonus INTEGER := 0;
BEGIN
  -- Ensure today's goals exist
  PERFORM create_daily_goals(p_user_id);
  
  -- Get current goal
  SELECT * INTO v_goal
  FROM daily_goals
  WHERE user_id = p_user_id
    AND goal_type = p_goal_type
    AND goal_date = CURRENT_DATE;
  
  IF v_goal IS NULL THEN
    RETURN;
  END IF;
  
  -- Update progress
  UPDATE daily_goals
  SET 
    current_value = LEAST(current_value + p_increment, target_value),
    is_completed = CASE 
      WHEN current_value + p_increment >= target_value AND NOT is_completed THEN TRUE 
      ELSE is_completed 
    END,
    completed_at = CASE 
      WHEN current_value + p_increment >= target_value AND NOT is_completed THEN NOW() 
      ELSE completed_at 
    END,
    updated_at = NOW()
  WHERE id = v_goal.id
  RETURNING * INTO v_goal;
  
  -- Check if just completed
  IF v_goal.is_completed AND v_goal.completed_at > NOW() - INTERVAL '1 second' THEN
    v_just_completed := TRUE;
    
    -- Get XP bonus from preset
    SELECT xp_bonus INTO v_xp_bonus
    FROM goal_presets
    WHERE difficulty = v_goal.goal_difficulty;
    
    -- Update user stats
    UPDATE user_goal_preferences
    SET 
      total_goals_completed = total_goals_completed + 1,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN QUERY SELECT 
    v_goal.id,
    v_goal.current_value,
    v_goal.target_value,
    v_just_completed,
    COALESCE(v_xp_bonus, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate daily quests for a user
CREATE OR REPLACE FUNCTION generate_daily_quests(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_template RECORD;
  v_count INTEGER := 0;
BEGIN
  -- Generate 3 random quests from templates
  FOR v_template IN 
    SELECT * FROM quest_templates 
    WHERE is_active = TRUE 
    ORDER BY RANDOM() 
    LIMIT 3
  LOOP
    INSERT INTO daily_quests (
      user_id, quest_type, title, description, icon,
      requirement_type, requirement_value, xp_reward, quest_date
    )
    VALUES (
      p_user_id, v_template.quest_type, v_template.title, v_template.description,
      v_template.icon, v_template.requirement_type, v_template.requirement_value,
      v_template.xp_reward, CURRENT_DATE
    )
    ON CONFLICT (user_id, quest_type, quest_date) DO NOTHING;
    
    v_count := v_count + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_daily_goals_user_date ON daily_goals(user_id, goal_date);
CREATE INDEX IF NOT EXISTS idx_daily_goals_date ON daily_goals(goal_date);
CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id, quest_date);
CREATE INDEX IF NOT EXISTS idx_user_goal_preferences_user ON user_goal_preferences(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goal_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_templates ENABLE ROW LEVEL SECURITY;

-- Daily goals policies
CREATE POLICY "Users can view own daily goals"
  ON daily_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily goals"
  ON daily_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily goals"
  ON daily_goals FOR UPDATE
  USING (auth.uid() = user_id);

-- User goal preferences policies
CREATE POLICY "Users can view own goal preferences"
  ON user_goal_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal preferences"
  ON user_goal_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal preferences"
  ON user_goal_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Daily quests policies
CREATE POLICY "Users can view own daily quests"
  ON daily_quests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily quests"
  ON daily_quests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily quests"
  ON daily_quests FOR UPDATE
  USING (auth.uid() = user_id);

-- Presets and templates are public read
CREATE POLICY "Anyone can view goal presets"
  ON goal_presets FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view quest templates"
  ON quest_templates FOR SELECT
  USING (true);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_goals_updated_at
  BEFORE UPDATE ON daily_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_goal_preferences_updated_at
  BEFORE UPDATE ON user_goal_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
