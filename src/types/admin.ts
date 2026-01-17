// ============================================
// ADMIN TYPES
// TypeScript types for admin functionality
// ============================================

export type AdminRoleCode = 'super_admin' | 'content_moderator';

export type AdminPermission =
  | 'all'
  | 'manage_content'
  | 'upload_questions'
  | 'manage_past_papers'
  | 'create_flashcards'
  | 'manage_quizzes'
  | 'view_analytics'
  | 'manage_subjects'
  | 'manage_users'
  | 'manage_settings'
  | 'view_audit_logs';

export interface AdminRole {
  id: string;
  code: AdminRoleCode;
  name: string;
  description: string | null;
  permissions: AdminPermission[];
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'reject' | 'promote' | 'demote';
  resource_type: 'user' | 'question' | 'past_paper' | 'flashcard' | 'setting' | 'exam_board' | 'subject' | 'topic';
  resource_id: string | null;
  description: string;
  metadata: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_admin: boolean;
  admin_role_id: string | null;
  admin_role?: AdminRole;
  admin_approved_at: string | null;
  admin_approved_by: string | null;
  last_admin_activity_at: string | null;
  created_at: string;
}

// Permission check utilities
export const SUPER_ADMIN_PERMISSIONS: AdminPermission[] = ['all'];

export const CONTENT_MODERATOR_PERMISSIONS: AdminPermission[] = [
  'manage_content',
  'upload_questions',
  'manage_past_papers',
  'create_flashcards',
  'manage_quizzes',
  'view_analytics',
  'manage_subjects',
];

export function hasPermission(user: AdminUser | null, permission: AdminPermission): boolean {
  if (!user || !user.is_admin || !user.admin_role) {
    return false;
  }

  const permissions = user.admin_role.permissions;

  // Super admin has all permissions
  if (permissions.includes('all')) {
    return true;
  }

  // Check specific permission
  return permissions.includes(permission);
}

export function isSuperAdmin(user: AdminUser | null): boolean {
  return user?.is_admin === true && user?.admin_role?.code === 'super_admin';
}

export function isContentModerator(user: AdminUser | null): boolean {
  return user?.is_admin === true && user?.admin_role?.code === 'content_moderator';
}

export function isAnyAdmin(user: AdminUser | null): boolean {
  return user?.is_admin === true;
}

export function getAdminRoleName(user: AdminUser | null): string {
  if (!user?.is_admin || !user?.admin_role) {
    return 'User';
  }
  return user.admin_role.name;
}

// Admin route permissions
export const ADMIN_ROUTE_PERMISSIONS: Record<string, AdminPermission | 'super_admin_only'> = {
  '/admin': 'view_analytics',
  '/admin/content': 'manage_content',
  '/admin/content/questions': 'upload_questions',
  '/admin/content/past-papers': 'manage_past_papers',
  '/admin/content/flashcards': 'create_flashcards',
  '/admin/content/subjects': 'manage_subjects',
  '/admin/users': 'super_admin_only',
  '/admin/settings': 'super_admin_only',
  '/admin/analytics': 'view_analytics',
  '/admin/audit-logs': 'super_admin_only',
};

export function canAccessRoute(user: AdminUser | null, route: string): boolean {
  if (!isAnyAdmin(user)) {
    return false;
  }

  const requiredPermission = ADMIN_ROUTE_PERMISSIONS[route];

  if (!requiredPermission) {
    // Route not in permissions map, allow by default for admins
    return true;
  }

  if (requiredPermission === 'super_admin_only') {
    return isSuperAdmin(user);
  }

  return hasPermission(user, requiredPermission);
}
