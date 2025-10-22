-- ============================================
-- IGCSE Simplified - Complete Database Schema
-- Supabase Postgres
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- USERS & AUTH
-- ============================================
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'content_moderator', 'super_admin')),
  subscription_tier text DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'essential', 'pro')),
  leaderboard_opt_out boolean DEFAULT false,
  xp integer DEFAULT 0,
  streak_days integer DEFAULT 0,
  last_activity_at timestamptz,
  subjects_of_interest text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_xp ON users(xp DESC) WHERE leaderboard_opt_out = false;

-- ============================================
-- SUBJECTS & TOPICS
-- ============================================
CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  level text NOT NULL CHECK (level IN ('IGCSE', 'A-Level', 'GCSE', 'Other')),
  exam_board text NOT NULL,
  description text,
  icon_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_subjects_slug ON subjects(slug);
CREATE INDEX idx_subjects_level ON subjects(level);

CREATE TABLE topics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  parent_topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  ordering integer DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(subject_id, slug)
);

CREATE INDEX idx_topics_subject ON topics(subject_id);
CREATE INDEX idx_topics_parent ON topics(parent_topic_id);
CREATE INDEX idx_topics_ordering ON topics(subject_id, ordering);

-- ============================================
-- NOTES
-- ============================================
CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  subtitle text,
  slug text NOT NULL,
  content_md text NOT NULL,
  rendered_html text,
  version integer DEFAULT 1,
  author_id uuid REFERENCES users(id),
  visibility text DEFAULT 'draft' CHECK (visibility IN ('draft', 'public', 'registered', 'premium')),
  tags text[],
  is_downloadable boolean DEFAULT false,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published_at timestamptz,
  UNIQUE(subject_id, topic_id, slug)
);

CREATE INDEX idx_notes_topic ON notes(topic_id);
CREATE INDEX idx_notes_visibility ON notes(visibility);
CREATE INDEX idx_notes_tags ON notes USING gin(tags);
CREATE INDEX idx_notes_search ON notes USING gin(to_tsvector('english', title || ' ' || content_md));

-- ============================================
-- QUESTIONS & PAPERS
-- ============================================
CREATE TABLE papers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  exam_board text NOT NULL,
  year integer NOT NULL,
  paper_label text NOT NULL,
  duration_minutes integer NOT NULL,
  total_marks integer,
  pdf_url text,
  visibility text DEFAULT 'published' CHECK (visibility IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_papers_subject ON papers(subject_id);
CREATE INDEX idx_papers_year ON papers(year DESC);

CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  exam_board text,
  paper_id uuid REFERENCES papers(id) ON DELETE SET NULL,
  paper_position integer,
  question_type text NOT NULL CHECK (question_type IN ('mcq', 'tf', 'numeric', 'short_answer', 'long_answer', 'fill_blank')),
  stem_md text NOT NULL,
  options jsonb,
  correct_answer jsonb NOT NULL,
  marks numeric NOT NULL DEFAULT 1,
  examiner_comment text NOT NULL,
  difficulty text DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  tags text[],
  media_refs text[],
  version integer DEFAULT 1,
  visibility text DEFAULT 'draft' CHECK (visibility IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_questions_subject ON questions(subject_id);
CREATE INDEX idx_questions_topic ON questions(topic_id);
CREATE INDEX idx_questions_type ON questions(question_type);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_tags ON questions USING gin(tags);
CREATE INDEX idx_questions_paper ON questions(paper_id, paper_position);
CREATE INDEX idx_questions_search ON questions USING gin(to_tsvector('english', stem_md));

-- ============================================
-- CLASSES & ENROLLMENTS
-- ============================================
CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description text,
  join_code text UNIQUE NOT NULL,
  capacity integer DEFAULT 999,
  auto_approve boolean DEFAULT true,
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_classes_join_code ON classes(join_code);

CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  enrolled_at timestamptz DEFAULT now(),
  UNIQUE(class_id, user_id)
);

CREATE INDEX idx_enrollments_class ON enrollments(class_id);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- ============================================
-- TESTS & ASSIGNMENTS
-- ============================================
CREATE TABLE tests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sections jsonb NOT NULL,
  total_marks numeric,
  visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'assigned', 'public')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_tests_creator ON tests(created_by);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id uuid REFERENCES tests(id) ON DELETE CASCADE,
  paper_id uuid REFERENCES papers(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  target_user_ids uuid[],
  title text NOT NULL,
  instructions text,
  start_at timestamptz,
  due_at timestamptz,
  time_limit_minutes integer,
  allow_retakes boolean DEFAULT false,
  max_attempts integer DEFAULT 1,
  release_answers_at text DEFAULT 'after_due' CHECK (release_answers_at IN ('immediate', 'after_submit', 'after_due', 'manual')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK ((test_id IS NOT NULL AND paper_id IS NULL) OR (test_id IS NULL AND paper_id IS NOT NULL))
);

CREATE INDEX idx_assignments_test ON assignments(test_id);
CREATE INDEX idx_assignments_class ON assignments(target_class_id);
CREATE INDEX idx_assignments_due ON assignments(due_at);

-- ============================================
-- ATTEMPTS & GRADING
-- ============================================
CREATE TABLE attempts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  test_id uuid REFERENCES tests(id) ON DELETE CASCADE,
  paper_id uuid REFERENCES papers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  expires_at timestamptz,
  answers jsonb,
  score numeric,
  max_score numeric,
  percentage numeric,
  graded boolean DEFAULT false,
  grading_details jsonb,
  requires_manual_grading boolean DEFAULT false,
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded', 'expired')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_attempts_user ON attempts(user_id);
CREATE INDEX idx_attempts_assignment ON attempts(assignment_id);
CREATE INDEX idx_attempts_status ON attempts(status);

-- ============================================
-- FLASHCARDS
-- ============================================
CREATE TABLE flashcard_decks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id uuid REFERENCES topics(id) ON DELETE CASCADE,
  description text,
  visibility text DEFAULT 'published' CHECK (visibility IN ('draft', 'published', 'archived')),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_flashcard_decks_subject ON flashcard_decks(subject_id);
CREATE INDEX idx_flashcard_decks_topic ON flashcard_decks(topic_id);

CREATE TABLE flashcards (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  deck_id uuid NOT NULL REFERENCES flashcard_decks(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  ordering integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_flashcards_deck ON flashcards(deck_id, ordering);

-- ============================================
-- GAMIFICATION
-- ============================================
CREATE TABLE badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  description text,
  icon_url text,
  criteria jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE user_badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- ============================================
-- COMMUNICATION
-- ============================================
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject text,
  body text NOT NULL,
  attachment_urls text[],
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_recipient ON messages(recipient_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id, created_at DESC);

CREATE TABLE announcements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_announcements_class ON announcements(class_id, created_at DESC);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('assignment_posted', 'attempt_graded', 'class_join_request', 'message_received', 'announcement', 'badge_earned')),
  title text NOT NULL,
  body text,
  link_url text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ============================================
-- MEDIA & STORAGE
-- ============================================
CREATE TABLE media (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  storage_path text UNIQUE NOT NULL,
  bucket text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  uploaded_by uuid REFERENCES users(id),
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX idx_media_uploader ON media(uploaded_by);

-- ============================================
-- AUDIT & ANALYTICS
-- ============================================
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_table text NOT NULL,
  target_id uuid,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_table, target_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

CREATE TABLE analytics_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('note_view', 'note_download', 'quiz_start', 'quiz_complete', 'login', 'signup')),
  resource_id uuid,
  resource_type text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_analytics_user ON analytics_events(user_id, created_at DESC);
CREATE INDEX idx_analytics_type ON analytics_events(event_type, created_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_papers_updated_at BEFORE UPDATE ON papers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attempts_updated_at BEFORE UPDATE ON attempts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate unique join codes
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_class_join_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.join_code IS NULL OR NEW.join_code = '' THEN
    NEW.join_code := generate_join_code();
    WHILE EXISTS (SELECT 1 FROM classes WHERE join_code = NEW.join_code) LOOP
      NEW.join_code := generate_join_code();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_class_join_code_trigger
BEFORE INSERT ON classes
FOR EACH ROW EXECUTE FUNCTION set_class_join_code();
