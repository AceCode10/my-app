-- ============================================
-- Fix XP System Migration v2
-- Drops existing functions first to avoid type conflicts
-- ============================================

-- Drop existing functions that have type conflicts
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, TEXT, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_streak(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_daily_goals(UUID) CASCADE;
DROP FUNCTION IF EXISTS update_daily_goals_difficulty(UUID, TEXT) CASCADE;

-- ============================================
-- 1. FIX AWARD_XP FUNCTION
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
BEGIN
    -- First ensure user_gamification record exists
    INSERT INTO user_gamification (
        user_id, 
        total_xp, 
        xp_this_week,
        xp_level,
        xp_progress_to_next_level,
        xp_needed_for_next_level,
        current_streak,
        longest_streak
    )
    VALUES (
        p_user_id, 
        0, 
        0,
        1,
        0,
        100,
        0,
        0
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get current state
    SELECT total_xp, xp_level, xp_progress_to_next_level, xp_needed_for_next_level
    INTO current_xp, current_level, xp_progress, xp_needed
    FROM user_gamification 
    WHERE user_id = p_user_id;
    
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
        xp_level = new_level,
        xp_progress_to_next_level = xp_progress,
        xp_needed_for_next_level = xp_needed,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Record transaction (only if xp_transactions table exists)
    BEGIN
        INSERT INTO xp_transactions (user_id, xp_amount, source_type, source_id, description)
        VALUES (p_user_id, p_xp_amount, p_source_type, p_source_id, p_description);
    EXCEPTION WHEN undefined_table THEN
        -- Table doesn't exist, skip transaction logging
        NULL;
    END;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE NOTICE 'Error in award_xp: %', SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. UPDATE DAILY GOALS WHEN DIFFICULTY CHANGES
-- ============================================
CREATE OR REPLACE FUNCTION update_daily_goals_difficulty(
    p_user_id UUID,
    p_new_difficulty TEXT
)
RETURNS VOID AS $$
DECLARE
    v_preset RECORD;
BEGIN
    -- Get preset values for the new difficulty
    SELECT * INTO v_preset FROM goal_presets WHERE difficulty = p_new_difficulty;
    
    IF v_preset IS NULL THEN
        RAISE EXCEPTION 'Invalid difficulty: %', p_new_difficulty;
    END IF;
    
    -- Update today's XP goal target
    UPDATE daily_goals
    SET 
        goal_difficulty = p_new_difficulty,
        target_value = v_preset.xp_target,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND goal_type = 'xp'
      AND goal_date = CURRENT_DATE;
    
    -- Update today's questions goal target
    UPDATE daily_goals
    SET 
        goal_difficulty = p_new_difficulty,
        target_value = v_preset.questions_target,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND goal_type = 'questions'
      AND goal_date = CURRENT_DATE;
    
    -- Update today's time goal target
    UPDATE daily_goals
    SET 
        goal_difficulty = p_new_difficulty,
        target_value = v_preset.time_target_minutes,
        updated_at = NOW()
    WHERE user_id = p_user_id
      AND goal_type = 'time'
      AND goal_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. FIX CREATE_DAILY_GOALS TO HANDLE DIFFICULTY CHANGES
-- ============================================
CREATE OR REPLACE FUNCTION create_daily_goals(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_difficulty TEXT;
  v_preset RECORD;
BEGIN
  -- First ensure user_goal_preferences exists
  INSERT INTO user_goal_preferences (user_id, preferred_difficulty)
  VALUES (p_user_id, 'regular')
  ON CONFLICT (user_id) DO NOTHING;
  
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
  
  -- Create or update XP goal
  INSERT INTO daily_goals (user_id, goal_type, goal_difficulty, target_value, goal_date)
  VALUES (p_user_id, 'xp', v_difficulty, v_preset.xp_target, CURRENT_DATE)
  ON CONFLICT (user_id, goal_type, goal_date) 
  DO UPDATE SET 
    goal_difficulty = v_difficulty,
    target_value = v_preset.xp_target,
    updated_at = NOW()
  WHERE daily_goals.goal_difficulty != v_difficulty;
  
  -- Create or update questions goal
  INSERT INTO daily_goals (user_id, goal_type, goal_difficulty, target_value, goal_date)
  VALUES (p_user_id, 'questions', v_difficulty, v_preset.questions_target, CURRENT_DATE)
  ON CONFLICT (user_id, goal_type, goal_date) 
  DO UPDATE SET 
    goal_difficulty = v_difficulty,
    target_value = v_preset.questions_target,
    updated_at = NOW()
  WHERE daily_goals.goal_difficulty != v_difficulty;
  
  -- Create or update time goal
  INSERT INTO daily_goals (user_id, goal_type, goal_difficulty, target_value, goal_date)
  VALUES (p_user_id, 'time', v_difficulty, v_preset.time_target_minutes, CURRENT_DATE)
  ON CONFLICT (user_id, goal_type, goal_date) 
  DO UPDATE SET 
    goal_difficulty = v_difficulty,
    target_value = v_preset.time_target_minutes,
    updated_at = NOW()
  WHERE daily_goals.goal_difficulty != v_difficulty;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. FIX UPDATE_STREAK FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID) 
RETURNS TABLE (current_streak INTEGER, longest_streak INTEGER) AS $$
DECLARE
    last_activity DATE;
    curr_streak INTEGER;
    max_streak INTEGER;
BEGIN
    -- First ensure user_gamification record exists
    INSERT INTO user_gamification (user_id, current_streak, longest_streak)
    VALUES (p_user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get last activity date and current streak
    SELECT ug.last_activity_date, ug.current_streak, ug.longest_streak 
    INTO last_activity, curr_streak, max_streak
    FROM user_gamification ug
    WHERE ug.user_id = p_user_id;
    
    -- If no previous activity, start new streak
    IF last_activity IS NULL THEN
        UPDATE user_gamification ug
        SET 
            current_streak = 1,
            longest_streak = GREATEST(COALESCE(ug.longest_streak, 0), 1),
            last_activity_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE ug.user_id = p_user_id
        RETURNING ug.current_streak, ug.longest_streak INTO curr_streak, max_streak;
        
        RETURN QUERY SELECT curr_streak, max_streak;
        RETURN;
    END IF;
    
    -- If already active today, return current values
    IF last_activity = CURRENT_DATE THEN
        RETURN QUERY SELECT curr_streak, max_streak;
        RETURN;
    END IF;
    
    -- If last activity was yesterday, increment streak
    IF last_activity = CURRENT_DATE - INTERVAL '1 day' THEN
        curr_streak := curr_streak + 1;
        max_streak := GREATEST(max_streak, curr_streak);
        
        UPDATE user_gamification ug
        SET 
            current_streak = curr_streak,
            longest_streak = max_streak,
            last_activity_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE ug.user_id = p_user_id;
        
        RETURN QUERY SELECT curr_streak, max_streak;
        RETURN;
    END IF;
    
    -- Streak broken, reset to 1
    UPDATE user_gamification ug
    SET 
        current_streak = 1,
        longest_streak = max_streak, -- Keep longest streak
        last_activity_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE ug.user_id = p_user_id;
    
    RETURN QUERY SELECT 1, max_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. GRANT EXECUTE PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION award_xp(UUID, INTEGER, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_goals_difficulty(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_daily_goals(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_streak(UUID) TO authenticated;

-- ============================================
-- 6. UPDATE GOAL PRESETS (ensure casual is 25 XP, not 20)
-- ============================================
UPDATE goal_presets SET xp_target = 25 WHERE difficulty = 'casual';
UPDATE goal_presets SET xp_target = 50 WHERE difficulty = 'regular';
UPDATE goal_presets SET xp_target = 75 WHERE difficulty = 'serious';
UPDATE goal_presets SET xp_target = 100 WHERE difficulty = 'intense';

-- ============================================
-- 7. ENSURE user_gamification HAS PROPER RLS
-- ============================================
-- Note: user_gamification is already part of supabase_realtime publication
