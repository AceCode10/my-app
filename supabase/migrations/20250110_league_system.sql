-- League System Migration
-- Implements Duolingo-style leagues with weekly competitions

-- ============================================
-- LEAGUES TABLE (Division tiers)
-- ============================================
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  tier INTEGER NOT NULL UNIQUE, -- 1 = Bronze, 2 = Silver, etc.
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  min_xp_to_enter INTEGER NOT NULL DEFAULT 0,
  promotion_slots INTEGER NOT NULL DEFAULT 10, -- Top N get promoted
  demotion_slots INTEGER NOT NULL DEFAULT 5,   -- Bottom N get demoted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default leagues
INSERT INTO leagues (name, tier, icon, color, min_xp_to_enter, promotion_slots, demotion_slots) VALUES
  ('Bronze', 1, '🥉', '#CD7F32', 0, 10, 0),
  ('Silver', 2, '🥈', '#C0C0C0', 100, 10, 5),
  ('Gold', 3, '🥇', '#FFD700', 300, 10, 5),
  ('Sapphire', 4, '💎', '#0F52BA', 600, 10, 5),
  ('Ruby', 5, '❤️', '#E0115F', 1000, 10, 5),
  ('Emerald', 6, '💚', '#50C878', 1500, 10, 5),
  ('Amethyst', 7, '💜', '#9966CC', 2000, 10, 5),
  ('Pearl', 8, '🤍', '#F0EAD6', 3000, 10, 5),
  ('Obsidian', 9, '🖤', '#3D3D3D', 5000, 10, 5),
  ('Diamond', 10, '💠', '#B9F2FF', 7500, 5, 5),
  ('Legend', 11, '👑', '#FFD700', 10000, 0, 3)
ON CONFLICT (name) DO UPDATE SET
  tier = EXCLUDED.tier,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  min_xp_to_enter = EXCLUDED.min_xp_to_enter,
  promotion_slots = EXCLUDED.promotion_slots,
  demotion_slots = EXCLUDED.demotion_slots;

-- ============================================
-- LEAGUE GROUPS TABLE (Weekly competition groups)
-- ============================================
CREATE TABLE IF NOT EXISTS league_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(league_id, week_start)
);

-- ============================================
-- LEAGUE MEMBERS TABLE (User participation)
-- ============================================
CREATE TABLE IF NOT EXISTS league_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES league_groups(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  
  -- Weekly XP tracking
  weekly_xp INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique per user per week
  UNIQUE(user_id, group_id)
);

-- ============================================
-- USER LEAGUE PROFILE
-- ============================================
CREATE TABLE IF NOT EXISTS user_league_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Current league
  current_league_id UUID REFERENCES leagues(id),
  current_group_id UUID REFERENCES league_groups(id),
  
  -- Stats
  total_weeks_participated INTEGER NOT NULL DEFAULT 0,
  total_promotions INTEGER NOT NULL DEFAULT 0,
  total_demotions INTEGER NOT NULL DEFAULT 0,
  highest_league_tier INTEGER NOT NULL DEFAULT 1,
  total_first_places INTEGER NOT NULL DEFAULT 0,
  total_podium_finishes INTEGER NOT NULL DEFAULT 0, -- Top 3
  
  -- Preferences
  league_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- LEAGUE HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS league_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id),
  group_id UUID NOT NULL REFERENCES league_groups(id),
  week_start DATE NOT NULL,
  
  -- Results
  final_rank INTEGER NOT NULL,
  final_xp INTEGER NOT NULL,
  total_participants INTEGER NOT NULL,
  
  -- Outcome
  outcome TEXT NOT NULL CHECK (outcome IN ('promoted', 'stayed', 'demoted', 'champion')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Get current week bounds (Monday to Sunday)
CREATE OR REPLACE FUNCTION get_current_week_bounds()
RETURNS TABLE (week_start DATE, week_end DATE) AS $$
BEGIN
  RETURN QUERY SELECT 
    date_trunc('week', CURRENT_DATE)::DATE as week_start,
    (date_trunc('week', CURRENT_DATE) + INTERVAL '6 days')::DATE as week_end;
END;
$$ LANGUAGE plpgsql STABLE;

-- Join or create league group for user
CREATE OR REPLACE FUNCTION join_league(p_user_id UUID)
RETURNS TABLE (
  group_id UUID,
  league_id UUID,
  league_name TEXT,
  league_tier INTEGER,
  league_icon TEXT,
  league_color TEXT
) AS $$
DECLARE
  v_profile user_league_profiles;
  v_league leagues;
  v_group league_groups;
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Get week bounds
  SELECT * INTO v_week_start, v_week_end FROM get_current_week_bounds();
  
  -- Get or create user profile
  INSERT INTO user_league_profiles (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO v_profile FROM user_league_profiles WHERE user_id = p_user_id;
  
  -- Determine league (default to Bronze)
  IF v_profile.current_league_id IS NULL THEN
    SELECT * INTO v_league FROM leagues WHERE tier = 1;
  ELSE
    SELECT * INTO v_league FROM leagues WHERE id = v_profile.current_league_id;
  END IF;
  
  -- Check if already in a group this week
  SELECT lg.* INTO v_group
  FROM league_groups lg
  JOIN league_members lm ON lm.group_id = lg.id
  WHERE lm.user_id = p_user_id
    AND lg.week_start = v_week_start
    AND lg.is_active = TRUE;
  
  IF v_group.id IS NOT NULL THEN
    -- Already in a group
    RETURN QUERY SELECT 
      v_group.id,
      v_league.id,
      v_league.name,
      v_league.tier,
      v_league.icon,
      v_league.color;
    RETURN;
  END IF;
  
  -- Find or create a group with space
  SELECT * INTO v_group
  FROM league_groups lg
  WHERE lg.league_id = v_league.id
    AND lg.week_start = v_week_start
    AND lg.is_active = TRUE
    AND (SELECT COUNT(*) FROM league_members WHERE group_id = lg.id) < lg.max_members
  ORDER BY (SELECT COUNT(*) FROM league_members WHERE group_id = lg.id) DESC
  LIMIT 1;
  
  IF v_group.id IS NULL THEN
    -- Create new group
    INSERT INTO league_groups (league_id, week_start, week_end)
    VALUES (v_league.id, v_week_start, v_week_end)
    RETURNING * INTO v_group;
  END IF;
  
  -- Add user to group
  INSERT INTO league_members (user_id, group_id, league_id)
  VALUES (p_user_id, v_group.id, v_league.id)
  ON CONFLICT (user_id, group_id) DO NOTHING;
  
  -- Update profile
  UPDATE user_league_profiles
  SET 
    current_league_id = v_league.id,
    current_group_id = v_group.id,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT 
    v_group.id,
    v_league.id,
    v_league.name,
    v_league.tier,
    v_league.icon,
    v_league.color;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add XP to user's weekly total
CREATE OR REPLACE FUNCTION add_league_xp(p_user_id UUID, p_xp INTEGER)
RETURNS TABLE (
  new_weekly_xp INTEGER,
  new_rank INTEGER,
  total_in_group INTEGER
) AS $$
DECLARE
  v_member league_members;
  v_week_start DATE;
BEGIN
  SELECT * INTO v_week_start FROM get_current_week_bounds();
  
  -- Get current membership
  SELECT lm.* INTO v_member
  FROM league_members lm
  JOIN league_groups lg ON lg.id = lm.group_id
  WHERE lm.user_id = p_user_id
    AND lg.week_start = v_week_start
    AND lm.is_active = TRUE;
  
  IF v_member.id IS NULL THEN
    -- Not in a league, join one
    PERFORM join_league(p_user_id);
    
    SELECT lm.* INTO v_member
    FROM league_members lm
    JOIN league_groups lg ON lg.id = lm.group_id
    WHERE lm.user_id = p_user_id
      AND lg.week_start = v_week_start;
  END IF;
  
  IF v_member.id IS NULL THEN
    RETURN;
  END IF;
  
  -- Update XP
  UPDATE league_members
  SET weekly_xp = weekly_xp + p_xp
  WHERE id = v_member.id;
  
  -- Update all ranks in the group
  WITH ranked AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (ORDER BY weekly_xp DESC, joined_at ASC) as new_rank
    FROM league_members
    WHERE group_id = v_member.group_id
  )
  UPDATE league_members lm
  SET rank = r.new_rank
  FROM ranked r
  WHERE lm.id = r.id;
  
  -- Return updated info
  RETURN QUERY 
  SELECT 
    lm.weekly_xp,
    lm.rank,
    (SELECT COUNT(*)::INTEGER FROM league_members WHERE group_id = v_member.group_id)
  FROM league_members lm
  WHERE lm.id = v_member.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get league leaderboard
CREATE OR REPLACE FUNCTION get_league_leaderboard(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  weekly_xp INTEGER,
  rank INTEGER,
  is_current_user BOOLEAN
) AS $$
DECLARE
  v_group_id UUID;
  v_week_start DATE;
BEGIN
  SELECT * INTO v_week_start FROM get_current_week_bounds();
  
  -- Get user's current group
  SELECT lm.group_id INTO v_group_id
  FROM league_members lm
  JOIN league_groups lg ON lg.id = lm.group_id
  WHERE lm.user_id = p_user_id
    AND lg.week_start = v_week_start
    AND lm.is_active = TRUE;
  
  IF v_group_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    lm.user_id,
    COALESCE(u.display_name, u.email, 'Anonymous') as display_name,
    u.avatar_url,
    lm.weekly_xp,
    COALESCE(lm.rank, 0)::INTEGER,
    lm.user_id = p_user_id as is_current_user
  FROM league_members lm
  JOIN auth.users au ON au.id = lm.user_id
  LEFT JOIN users u ON u.id = lm.user_id
  WHERE lm.group_id = v_group_id
  ORDER BY lm.rank ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_league_groups_league_week ON league_groups(league_id, week_start);
CREATE INDEX IF NOT EXISTS idx_league_groups_active ON league_groups(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_league_members_user ON league_members(user_id);
CREATE INDEX IF NOT EXISTS idx_league_members_group ON league_members(group_id);
CREATE INDEX IF NOT EXISTS idx_league_members_rank ON league_members(group_id, rank);
CREATE INDEX IF NOT EXISTS idx_league_history_user ON league_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_league_profiles_user ON user_league_profiles(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_league_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_history ENABLE ROW LEVEL SECURITY;

-- Leagues are public
CREATE POLICY "Anyone can view leagues"
  ON leagues FOR SELECT
  USING (true);

-- League groups are viewable by members
CREATE POLICY "Users can view their league groups"
  ON league_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM league_members 
      WHERE league_members.group_id = league_groups.id 
      AND league_members.user_id = auth.uid()
    )
  );

-- League members - users can see their group
CREATE POLICY "Users can view league members in their group"
  ON league_members FOR SELECT
  USING (
    group_id IN (
      SELECT group_id FROM league_members WHERE user_id = auth.uid()
    )
  );

-- User league profiles
CREATE POLICY "Users can view own league profile"
  ON user_league_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own league profile"
  ON user_league_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own league profile"
  ON user_league_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- League history
CREATE POLICY "Users can view own league history"
  ON league_history FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps
CREATE TRIGGER update_user_league_profiles_updated_at
  BEFORE UPDATE ON user_league_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
