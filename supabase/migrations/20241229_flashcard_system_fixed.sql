-- ============================================
-- FLASHCARD SYSTEM SCHEMA
-- Spaced repetition learning system
-- ============================================

-- ============================================
-- 1. FLASHCARD DECKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  card_count INTEGER DEFAULT 0,
  tags TEXT[],
  cover_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user ON flashcard_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_subject ON flashcard_decks(subject_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_topic ON flashcard_decks(topic_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_public ON flashcard_decks(is_public) WHERE is_public = true;

-- ============================================
-- 2. FLASHCARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  front_content TEXT NOT NULL,
  back_content TEXT NOT NULL,
  front_image_url TEXT,
  back_image_url TEXT,
  hints TEXT[],
  tags TEXT[],
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_question ON flashcards(question_id);

-- ============================================
-- 3. FLASHCARD PROGRESS TABLE (Spaced Repetition)
-- ============================================
CREATE TABLE IF NOT EXISTS flashcard_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  ease_factor NUMERIC DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  repetitions INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ DEFAULT NOW(),
  last_rating INTEGER,
  total_reviews INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, flashcard_id)
);

CREATE INDEX IF NOT EXISTS idx_flashcard_progress_user ON flashcard_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_next_review ON flashcard_progress(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_flashcard_progress_flashcard ON flashcard_progress(flashcard_id);

-- ============================================
-- 4. STUDY SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES flashcard_decks(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  session_type TEXT DEFAULT 'review' CHECK (session_type IN ('review', 'learn', 'cram', 'custom')),
  cards_studied INTEGER DEFAULT 0,
  cards_correct INTEGER DEFAULT 0,
  cards_wrong INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_completed BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_deck ON study_sessions(deck_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(started_at);

-- ============================================
-- 5. USER STUDY STATS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_study_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_cards_studied INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_study_date DATE,
  cards_due_today INTEGER DEFAULT 0,
  cards_learned INTEGER DEFAULT 0,
  average_ease NUMERIC DEFAULT 2.5,
  retention_rate NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_study_stats_user ON user_study_stats(user_id);

-- ============================================
-- 6. ENABLE RLS
-- ============================================
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_study_stats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS POLICIES
-- ============================================

-- FLASHCARD DECKS POLICIES
DROP POLICY IF EXISTS "Users can view own and public decks" ON flashcard_decks;
CREATE POLICY "Users can view own and public decks" ON flashcard_decks
  FOR SELECT USING (user_id = auth.uid() OR is_public = true OR is_system = true);

DROP POLICY IF EXISTS "Users can create own decks" ON flashcard_decks;
CREATE POLICY "Users can create own decks" ON flashcard_decks
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own decks" ON flashcard_decks;
CREATE POLICY "Users can update own decks" ON flashcard_decks
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own decks" ON flashcard_decks;
CREATE POLICY "Users can delete own decks" ON flashcard_decks
  FOR DELETE USING (user_id = auth.uid());

-- FLASHCARDS POLICIES
DROP POLICY IF EXISTS "Users can view flashcards in accessible decks" ON flashcards;
CREATE POLICY "Users can view flashcards in accessible decks" ON flashcards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks fd
      WHERE fd.id = deck_id
      AND (fd.user_id = auth.uid() OR fd.is_public = true OR fd.is_system = true)
    )
  );

DROP POLICY IF EXISTS "Users can insert flashcards in own decks" ON flashcards;
CREATE POLICY "Users can insert flashcards in own decks" ON flashcards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM flashcard_decks fd
      WHERE fd.id = deck_id
      AND fd.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update flashcards in own decks" ON flashcards;
CREATE POLICY "Users can update flashcards in own decks" ON flashcards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks fd
      WHERE fd.id = deck_id
      AND fd.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete flashcards in own decks" ON flashcards;
CREATE POLICY "Users can delete flashcards in own decks" ON flashcards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks fd
      WHERE fd.id = deck_id
      AND fd.user_id = auth.uid()
    )
  );

-- FLASHCARD PROGRESS POLICIES
DROP POLICY IF EXISTS "Users can view own progress" ON flashcard_progress;
CREATE POLICY "Users can view own progress" ON flashcard_progress
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own progress" ON flashcard_progress;
CREATE POLICY "Users can insert own progress" ON flashcard_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own progress" ON flashcard_progress;
CREATE POLICY "Users can update own progress" ON flashcard_progress
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own progress" ON flashcard_progress;
CREATE POLICY "Users can delete own progress" ON flashcard_progress
  FOR DELETE USING (user_id = auth.uid());

-- STUDY SESSIONS POLICIES
DROP POLICY IF EXISTS "Users can view own sessions" ON study_sessions;
CREATE POLICY "Users can view own sessions" ON study_sessions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own sessions" ON study_sessions;
CREATE POLICY "Users can insert own sessions" ON study_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own sessions" ON study_sessions;
CREATE POLICY "Users can update own sessions" ON study_sessions
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own sessions" ON study_sessions;
CREATE POLICY "Users can delete own sessions" ON study_sessions
  FOR DELETE USING (user_id = auth.uid());

-- USER STUDY STATS POLICIES
DROP POLICY IF EXISTS "Users can view own stats" ON user_study_stats;
CREATE POLICY "Users can view own stats" ON user_study_stats
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own stats" ON user_study_stats;
CREATE POLICY "Users can insert own stats" ON user_study_stats
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own stats" ON user_study_stats;
CREATE POLICY "Users can update own stats" ON user_study_stats
  FOR UPDATE USING (user_id = auth.uid());

-- ============================================
-- 8. FUNCTIONS
-- ============================================

-- Function to update deck card count
CREATE OR REPLACE FUNCTION update_deck_card_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE flashcard_decks SET card_count = card_count + 1, updated_at = NOW()
    WHERE id = NEW.deck_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE flashcard_decks SET card_count = card_count - 1, updated_at = NOW()
    WHERE id = OLD.deck_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_deck_card_count ON flashcards;
CREATE TRIGGER trigger_update_deck_card_count
  AFTER INSERT OR DELETE ON flashcards
  FOR EACH ROW EXECUTE FUNCTION update_deck_card_count();

-- SM-2 Algorithm implementation for spaced repetition
CREATE OR REPLACE FUNCTION calculate_next_review(
  current_ease NUMERIC,
  current_interval INTEGER,
  current_repetitions INTEGER,
  rating INTEGER -- 0=Again, 1=Hard, 2=Good, 3=Easy
)
RETURNS TABLE(
  new_ease NUMERIC,
  new_interval INTEGER,
  new_repetitions INTEGER,
  next_review TIMESTAMPTZ
) AS $$
DECLARE
  min_ease NUMERIC := 1.3;
  ease_delta NUMERIC;
BEGIN
  ease_delta := 0.1 - (3 - rating) * (0.08 + (3 - rating) * 0.02);
  new_ease := GREATEST(min_ease, current_ease + ease_delta);
  
  IF rating < 2 THEN
    new_repetitions := 0;
    new_interval := 1;
  ELSE
    new_repetitions := current_repetitions + 1;
    
    IF current_repetitions = 0 THEN
      new_interval := 1;
    ELSIF current_repetitions = 1 THEN
      new_interval := 6;
    ELSE
      new_interval := CEIL(current_interval * new_ease)::INTEGER;
    END IF;
    
    IF rating = 1 THEN
      new_interval := CEIL(new_interval * 0.8)::INTEGER;
    ELSIF rating = 3 THEN
      new_interval := CEIL(new_interval * 1.3)::INTEGER;
    END IF;
  END IF;
  
  new_interval := LEAST(new_interval, 365);
  next_review := NOW() + (new_interval || ' days')::INTERVAL;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON flashcard_decks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON flashcards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON flashcard_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON study_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON user_study_stats TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_next_review TO authenticated;
