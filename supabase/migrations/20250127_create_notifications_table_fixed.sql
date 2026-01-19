-- Drop existing notifications table and policies if they exist
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table for teacher and student dashboards
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'assignment_created',
    'assignment_due_soon',
    'assignment_graded',
    'announcement_posted',
    'message_received',
    'student_joined_class',
    'student_submitted_assignment',
    'class_invitation',
    'achievement_unlocked',
    'streak_milestone',
    'system'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Optional link to navigate to when clicked
  metadata JSONB DEFAULT '{}', -- Additional data like class_id, assignment_id, etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Create indexes for efficient querying
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Service role and authenticated users can insert notifications
CREATE POLICY "Authenticated users can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Create function to send notification
CREATE OR REPLACE FUNCTION send_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE id = p_notification_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- Create function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = TRUE, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_assignment_created ON assignments;
DROP TRIGGER IF EXISTS trigger_notify_announcement_posted ON class_announcements;
DROP TRIGGER IF EXISTS trigger_notify_student_submitted ON test_attempts;
DROP TRIGGER IF EXISTS trigger_notify_student_joined ON enrollments;
DROP TRIGGER IF EXISTS trigger_notify_message_received ON class_messages;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS notify_assignment_created();
DROP FUNCTION IF EXISTS notify_announcement_posted();
DROP FUNCTION IF EXISTS notify_student_submitted();
DROP FUNCTION IF EXISTS notify_student_joined();
DROP FUNCTION IF EXISTS notify_message_received();

-- Create trigger to send notification when assignment is created
CREATE FUNCTION notify_assignment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student RECORD;
  v_class_name TEXT;
BEGIN
  -- Get class name
  SELECT name INTO v_class_name FROM classes WHERE id = NEW.target_class_id;
  
  -- Notify all students in the class
  FOR v_student IN
    SELECT e.user_id
    FROM enrollments e
    WHERE e.class_id = NEW.target_class_id AND e.status = 'active'
  LOOP
    PERFORM send_notification(
      v_student.user_id,
      'assignment_created',
      'New Assignment',
      'New assignment "' || NEW.title || '" in ' || COALESCE(v_class_name, 'your class'),
      '/student/assessments/' || NEW.id,
      jsonb_build_object('assignment_id', NEW.id, 'class_id', NEW.target_class_id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_assignment_created
  AFTER INSERT ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION notify_assignment_created();

-- Create trigger to send notification when announcement is posted
CREATE FUNCTION notify_announcement_posted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student RECORD;
  v_class_name TEXT;
BEGIN
  -- Get class name
  SELECT name INTO v_class_name FROM classes WHERE id = NEW.class_id;
  
  -- Notify all students in the class
  FOR v_student IN
    SELECT e.user_id
    FROM enrollments e
    WHERE e.class_id = NEW.class_id AND e.status = 'active'
  LOOP
    PERFORM send_notification(
      v_student.user_id,
      'announcement_posted',
      'New Announcement',
      COALESCE(NEW.title, 'New announcement') || ' in ' || COALESCE(v_class_name, 'your class'),
      '/student/classes/' || NEW.class_id,
      jsonb_build_object('announcement_id', NEW.id, 'class_id', NEW.class_id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_announcement_posted
  AFTER INSERT ON class_announcements
  FOR EACH ROW
  EXECUTE FUNCTION notify_announcement_posted();

-- Create trigger to notify teacher when student submits assignment
CREATE FUNCTION notify_student_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_student_name TEXT;
  v_assignment_title TEXT;
  v_class_id UUID;
BEGIN
  -- Only trigger on submission
  IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
    -- Get assignment and class info
    SELECT a.title, a.target_class_id INTO v_assignment_title, v_class_id
    FROM assignments a WHERE a.id = NEW.assignment_id;
    
    -- Get teacher id
    SELECT c.teacher_id INTO v_teacher_id FROM classes c WHERE c.id = v_class_id;
    
    -- Get student name
    SELECT display_name INTO v_student_name FROM users WHERE id = NEW.user_id;
    
    IF v_teacher_id IS NOT NULL THEN
      PERFORM send_notification(
        v_teacher_id,
        'student_submitted_assignment',
        'Assignment Submitted',
        COALESCE(v_student_name, 'A student') || ' submitted "' || COALESCE(v_assignment_title, 'an assignment') || '"',
        '/teacher/classes/' || v_class_id,
        jsonb_build_object('attempt_id', NEW.id, 'assignment_id', NEW.assignment_id, 'student_id', NEW.user_id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_student_submitted
  AFTER INSERT OR UPDATE ON test_attempts
  FOR EACH ROW
  EXECUTE FUNCTION notify_student_submitted();

-- Create trigger to notify student when assignment is graded
CREATE FUNCTION notify_assignment_graded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_title TEXT;
BEGIN
  -- Only trigger when status changes to graded
  IF NEW.status = 'graded' AND (OLD.status IS NULL OR OLD.status != 'graded') THEN
    -- Get assignment title
    SELECT title INTO v_assignment_title FROM assignments WHERE id = NEW.assignment_id;
    
    PERFORM send_notification(
      NEW.user_id,
      'assignment_graded',
      'Assignment Graded',
      'Your submission for "' || COALESCE(v_assignment_title, 'an assignment') || '" has been graded',
      '/student/assessments/' || NEW.assignment_id || '/results',
      jsonb_build_object('attempt_id', NEW.id, 'assignment_id', NEW.assignment_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_assignment_graded
  AFTER UPDATE ON test_attempts
  FOR EACH ROW
  EXECUTE FUNCTION notify_assignment_graded();

-- Create trigger to notify teacher when student joins class
CREATE FUNCTION notify_student_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teacher_id UUID;
  v_student_name TEXT;
  v_class_name TEXT;
BEGIN
  IF NEW.status = 'active' THEN
    -- Get class info
    SELECT c.teacher_id, c.name INTO v_teacher_id, v_class_name
    FROM classes c WHERE c.id = NEW.class_id;
    
    -- Get student name
    SELECT display_name INTO v_student_name FROM users WHERE id = NEW.user_id;
    
    IF v_teacher_id IS NOT NULL THEN
      PERFORM send_notification(
        v_teacher_id,
        'student_joined_class',
        'New Student',
        COALESCE(v_student_name, 'A student') || ' joined ' || COALESCE(v_class_name, 'your class'),
        '/teacher/classes/' || NEW.class_id,
        jsonb_build_object('enrollment_id', NEW.id, 'class_id', NEW.class_id, 'student_id', NEW.user_id)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_student_joined
  AFTER INSERT ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION notify_student_joined();

-- Create trigger to notify on new message
CREATE FUNCTION notify_message_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_name TEXT;
  v_class_name TEXT;
BEGIN
  -- Get sender name
  SELECT display_name INTO v_sender_name FROM users WHERE id = NEW.sender_id;
  
  -- Get class name
  SELECT name INTO v_class_name FROM classes WHERE id = NEW.class_id;
  
  PERFORM send_notification(
    NEW.recipient_id,
    'message_received',
    'New Message',
    'Message from ' || COALESCE(v_sender_name, 'someone') || ' in ' || COALESCE(v_class_name, 'a class'),
    '/student/classes/' || NEW.class_id,
    jsonb_build_object('message_id', NEW.id, 'class_id', NEW.class_id, 'sender_id', NEW.sender_id)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_message_received
  AFTER INSERT ON class_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_received();
