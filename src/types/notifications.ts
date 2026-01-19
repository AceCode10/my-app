export type NotificationType =
  | 'assignment_created'
  | 'assignment_due_soon'
  | 'assignment_graded'
  | 'announcement_posted'
  | 'message_received'
  | 'student_joined_class'
  | 'student_submitted_assignment'
  | 'class_invitation'
  | 'achievement_unlocked'
  | 'streak_milestone'
  | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
  read_at?: string | null;
}

export interface NotificationGroup {
  date: string;
  notifications: Notification[];
}

export const notificationIcons: Record<NotificationType, string> = {
  assignment_created: 'ClipboardList',
  assignment_due_soon: 'Clock',
  assignment_graded: 'CheckCircle',
  announcement_posted: 'Megaphone',
  message_received: 'MessageSquare',
  student_joined_class: 'UserPlus',
  student_submitted_assignment: 'FileCheck',
  class_invitation: 'Mail',
  achievement_unlocked: 'Trophy',
  streak_milestone: 'Flame',
  system: 'Bell',
};

export const notificationColors: Record<NotificationType, string> = {
  assignment_created: 'text-blue-500',
  assignment_due_soon: 'text-amber-500',
  assignment_graded: 'text-green-500',
  announcement_posted: 'text-purple-500',
  message_received: 'text-indigo-500',
  student_joined_class: 'text-emerald-500',
  student_submitted_assignment: 'text-cyan-500',
  class_invitation: 'text-pink-500',
  achievement_unlocked: 'text-yellow-500',
  streak_milestone: 'text-orange-500',
  system: 'text-muted-foreground',
};
