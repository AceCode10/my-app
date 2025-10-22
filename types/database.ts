// Database types for IGCSE Simplified

export type Role = 'student' | 'teacher' | 'content_moderator' | 'super_admin';
export type SubscriptionTier = 'basic' | 'essential' | 'pro';
export type QuestionType = 'mcq' | 'tf' | 'numeric' | 'short_answer' | 'long_answer' | 'fill_blank';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Visibility = 'draft' | 'published' | 'archived';
export type NoteVisibility = 'draft' | 'public' | 'registered' | 'premium';
export type EnrollmentStatus = 'pending' | 'active' | 'removed';
export type AttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'expired';
export type NotificationType = 'assignment_posted' | 'attempt_graded' | 'class_join_request' | 'message_received' | 'announcement' | 'badge_earned';
export type ReleaseAnswersAt = 'immediate' | 'after_submit' | 'after_due' | 'manual';

export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: Role;
  subscription_tier: SubscriptionTier;
  leaderboard_opt_out: boolean;
  xp: number;
  streak_days: number;
  last_activity_at: string | null;
  subjects_of_interest: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  slug: string;
  level: 'IGCSE' | 'A-Level' | 'GCSE' | 'Other';
  exam_board: string;
  description: string | null;
  icon_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  parent_topic_id: string | null;
  name: string;
  slug: string;
  ordering: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  topic_id: string;
  subject_id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  content_md: string;
  rendered_html: string | null;
  version: number;
  author_id: string | null;
  visibility: NoteVisibility;
  tags: string[] | null;
  is_downloadable: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Question {
  id: string;
  subject_id: string;
  topic_id: string;
  exam_board: string | null;
  paper_id: string | null;
  paper_position: number | null;
  question_type: QuestionType;
  stem_md: string;
  options: any | null;
  correct_answer: any;
  marks: number;
  examiner_comment: string;
  difficulty: Difficulty;
  tags: string[] | null;
  media_refs: string[] | null;
  version: number;
  visibility: Visibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Paper {
  id: string;
  subject_id: string;
  exam_board: string;
  year: number;
  paper_label: string;
  duration_minutes: number;
  total_marks: number | null;
  pdf_url: string | null;
  visibility: Visibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  name: string;
  subject_id: string | null;
  teacher_id: string;
  description: string | null;
  join_code: string;
  capacity: number;
  auto_approve: boolean;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  class_id: string;
  user_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
}

export interface Test {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  sections: TestSection[];
  total_marks: number | null;
  visibility: 'private' | 'assigned' | 'public';
  created_at: string;
  updated_at: string;
}

export interface TestSection {
  title: string;
  questions: TestQuestion[];
}

export interface TestQuestion {
  id: string;
  marks: number;
}

export interface Assignment {
  id: string;
  test_id: string | null;
  paper_id: string | null;
  assigned_by: string;
  target_class_id: string | null;
  target_user_ids: string[] | null;
  title: string;
  instructions: string | null;
  start_at: string | null;
  due_at: string | null;
  time_limit_minutes: number | null;
  allow_retakes: boolean;
  max_attempts: number;
  release_answers_at: ReleaseAnswersAt;
  created_at: string;
  updated_at: string;
}

export interface Attempt {
  id: string;
  assignment_id: string | null;
  test_id: string | null;
  paper_id: string | null;
  user_id: string;
  started_at: string;
  submitted_at: string | null;
  expires_at: string | null;
  answers: Record<string, any> | null;
  score: number | null;
  max_score: number | null;
  percentage: number | null;
  graded: boolean;
  grading_details: any | null;
  requires_manual_grading: boolean;
  status: AttemptStatus;
  created_at: string;
  updated_at: string;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  subject_id: string | null;
  topic_id: string | null;
  description: string | null;
  visibility: Visibility;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  ordering: number;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  criteria: any;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  body: string;
  attachment_urls: string[] | null;
  read_at: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  class_id: string | null;
  author_id: string;
  title: string;
  message: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Media {
  id: string;
  storage_path: string;
  bucket: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string | null;
  uploaded_at: string;
}

// Extended types with relations
export interface NoteWithRelations extends Note {
  topic?: Topic;
  subject?: Subject;
  author?: User;
}

export interface QuestionWithRelations extends Question {
  topic?: Topic;
  subject?: Subject;
  paper?: Paper;
}

export interface ClassWithRelations extends Class {
  subject?: Subject;
  teacher?: User;
  student_count?: number;
}

export interface AssignmentWithRelations extends Assignment {
  test?: Test;
  paper?: Paper;
  assigned_by_user?: User;
  class?: Class;
}

export interface AttemptWithRelations extends Attempt {
  assignment?: Assignment;
  test?: Test;
  paper?: Paper;
  user?: User;
}
