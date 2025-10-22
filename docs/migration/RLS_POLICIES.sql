-- ============================================
-- IGCSE Simplified - Row-Level Security Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- USERS POLICIES
-- ============================================
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (get_user_role() IN ('super_admin', 'content_moderator'));

CREATE POLICY "Super admins can update user roles"
  ON users FOR UPDATE
  USING (get_user_role() = 'super_admin');

-- ============================================
-- SUBJECTS & TOPICS (Public read)
-- ============================================
CREATE POLICY "Anyone can view subjects"
  ON subjects FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage subjects"
  ON subjects FOR ALL
  USING (get_user_role() IN ('super_admin', 'content_moderator'));

CREATE POLICY "Anyone can view topics"
  ON topics FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage topics"
  ON topics FOR ALL
  USING (get_user_role() IN ('super_admin', 'content_moderator'));

-- ============================================
-- NOTES POLICIES
-- ============================================
CREATE POLICY "Anyone can view public notes"
  ON notes FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Authenticated users can view registered notes"
  ON notes FOR SELECT
  USING (auth.uid() IS NOT NULL AND visibility IN ('registered', 'premium'));

CREATE POLICY "Admins can view all notes"
  ON notes FOR SELECT
  USING (get_user_role() IN ('super_admin', 'content_moderator'));

CREATE POLICY "Admins can manage notes"
  ON notes FOR ALL
  USING (get_user_role() IN ('super_admin', 'content_moderator'));

-- ============================================
-- QUESTIONS POLICIES
-- ============================================
CREATE POLICY "Teachers can view published questions"
  ON questions FOR SELECT
  USING (
    visibility = 'published' AND 
    get_user_role() IN ('teacher', 'content_moderator', 'super_admin')
  );

CREATE POLICY "Students can view questions in active attempts"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM attempts a
      WHERE a.user_id = auth.uid()
      AND a.status = 'in_progress'
    )
  );

CREATE POLICY "Admins can manage questions"
  ON questions FOR ALL
  USING (get_user_role() IN ('super_admin', 'content_moderator'));

-- ============================================
-- PAPERS POLICIES
-- ============================================
CREATE POLICY "Teachers can view published papers"
  ON papers FOR SELECT
  USING (
    visibility = 'published' AND
    get_user_role() IN ('teacher', 'content_moderator', 'super_admin')
  );

CREATE POLICY "Admins can manage papers"
  ON papers FOR ALL
  USING (get_user_role() IN ('super_admin', 'content_moderator'));

-- ============================================
-- CLASSES POLICIES
-- ============================================
CREATE POLICY "Teachers can view own classes"
  ON classes FOR SELECT
  USING (teacher_id = auth.uid());

CREATE POLICY "Students can view enrolled classes"
  ON classes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.class_id = classes.id
      AND enrollments.user_id = auth.uid()
      AND enrollments.status = 'active'
    )
  );

CREATE POLICY "Teachers can create classes"
  ON classes FOR INSERT
  WITH CHECK (
    teacher_id = auth.uid() AND
    get_user_role() = 'teacher'
  );

CREATE POLICY "Teachers can manage own classes"
  ON classes FOR UPDATE
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers can delete own classes"
  ON classes FOR DELETE
  USING (teacher_id = auth.uid());

-- ============================================
-- ENROLLMENTS POLICIES
-- ============================================
CREATE POLICY "Students can view own enrollments"
  ON enrollments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Teachers can view class enrollments"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = enrollments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can request enrollment"
  ON enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can manage class enrollments"
  ON enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = enrollments.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- ============================================
-- TESTS POLICIES
-- ============================================
CREATE POLICY "Teachers can view own tests"
  ON tests FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Teachers can create tests"
  ON tests FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    get_user_role() = 'teacher'
  );

CREATE POLICY "Teachers can manage own tests"
  ON tests FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Teachers can delete own tests"
  ON tests FOR DELETE
  USING (created_by = auth.uid());

-- ============================================
-- ASSIGNMENTS POLICIES
-- ============================================
CREATE POLICY "Teachers can view own assignments"
  ON assignments FOR SELECT
  USING (assigned_by = auth.uid());

CREATE POLICY "Students can view assigned assignments"
  ON assignments FOR SELECT
  USING (
    auth.uid() = ANY(target_user_ids) OR
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.class_id = assignments.target_class_id
      AND enrollments.user_id = auth.uid()
      AND enrollments.status = 'active'
    )
  );

CREATE POLICY "Teachers can create assignments"
  ON assignments FOR INSERT
  WITH CHECK (
    assigned_by = auth.uid() AND
    get_user_role() = 'teacher'
  );

CREATE POLICY "Teachers can manage own assignments"
  ON assignments FOR ALL
  USING (assigned_by = auth.uid());

-- ============================================
-- ATTEMPTS POLICIES
-- ============================================
CREATE POLICY "Students can view own attempts"
  ON attempts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Teachers can view class attempts"
  ON attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = attempts.assignment_id
      AND a.assigned_by = auth.uid()
    )
  );

CREATE POLICY "Students can create attempts"
  ON attempts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update own in-progress attempts"
  ON attempts FOR UPDATE
  USING (user_id = auth.uid() AND status = 'in_progress');

CREATE POLICY "Teachers can grade attempts"
  ON attempts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = attempts.assignment_id
      AND a.assigned_by = auth.uid()
    )
  );

-- ============================================
-- FLASHCARDS POLICIES
-- ============================================
CREATE POLICY "Anyone can view published flashcard decks"
  ON flashcard_decks FOR SELECT
  USING (visibility = 'published');

CREATE POLICY "Admins can manage flashcard decks"
  ON flashcard_decks FOR ALL
  USING (get_user_role() IN ('super_admin', 'content_moderator'));

CREATE POLICY "Anyone can view flashcards in published decks"
  ON flashcards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM flashcard_decks
      WHERE flashcard_decks.id = flashcards.deck_id
      AND flashcard_decks.visibility = 'published'
    )
  );

CREATE POLICY "Admins can manage flashcards"
  ON flashcards FOR ALL
  USING (get_user_role() IN ('super_admin', 'content_moderator'));

-- ============================================
-- MESSAGES POLICIES
-- ============================================
CREATE POLICY "Users can view sent messages"
  ON messages FOR SELECT
  USING (sender_id = auth.uid());

CREATE POLICY "Users can view received messages"
  ON messages FOR SELECT
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Recipients can mark messages as read"
  ON messages FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- ============================================
-- ANNOUNCEMENTS POLICIES
-- ============================================
CREATE POLICY "Teachers can view own class announcements"
  ON announcements FOR SELECT
  USING (author_id = auth.uid());

CREATE POLICY "Students can view class announcements"
  ON announcements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments
      WHERE enrollments.class_id = announcements.class_id
      AND enrollments.user_id = auth.uid()
      AND enrollments.status = 'active'
    )
  );

CREATE POLICY "Teachers can create announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================
-- USER BADGES POLICIES
-- ============================================
CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can view public badges"
  ON user_badges FOR SELECT
  USING (
    NOT EXISTS (
      SELECT 1 FROM users
      WHERE users.id = user_badges.user_id
      AND users.leaderboard_opt_out = true
    )
  );

CREATE POLICY "System can award badges"
  ON user_badges FOR INSERT
  WITH CHECK (true);

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (get_user_role() IN ('super_admin', 'content_moderator'));

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- MEDIA POLICIES
-- ============================================
CREATE POLICY "Authenticated users can view media"
  ON media FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload media"
  ON media FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can delete own media"
  ON media FOR DELETE
  USING (uploaded_by = auth.uid());

CREATE POLICY "Admins can manage all media"
  ON media FOR ALL
  USING (get_user_role() IN ('super_admin', 'content_moderator'));
