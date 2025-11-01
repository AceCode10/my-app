// ============================================
// AUDIT LOGGING UTILITY
// Helper functions to create audit log entries
// ============================================

import { createClient } from '@/lib/supabase/client';

export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'login' 
  | 'logout' 
  | 'approve' 
  | 'reject'
  | 'publish'
  | 'unpublish'
  | 'promote'
  | 'demote';

export type AuditResourceType = 
  | 'user' 
  | 'question' 
  | 'past_paper' 
  | 'flashcard' 
  | 'setting'
  | 'exam_board'
  | 'subject'
  | 'topic'
  | 'note'
  | 'class'
  | 'test'
  | 'system';

/**
 * Create an audit log entry
 * @param action - The action performed
 * @param resourceType - The type of resource affected
 * @param resourceId - The ID of the resource (optional)
 * @param description - Human-readable description of the action
 * @param metadata - Additional context data (optional)
 */
export async function createAuditLog(
  action: AuditAction,
  resourceType: AuditResourceType,
  resourceId: string | null,
  description: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot create audit log: No user session');
      return;
    }

    // Call the database function to create audit log
    const { error } = await supabase.rpc('create_audit_log', {
      p_user_id: user.id,
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_description: description,
      p_metadata: metadata
    });

    if (error) {
      console.error('Failed to create audit log:', error);
    }
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
}

/**
 * Convenience functions for common audit actions
 */

export async function logCreate(
  resourceType: AuditResourceType,
  resourceId: string,
  resourceName: string,
  metadata: Record<string, any> = {}
) {
  await createAuditLog(
    'create',
    resourceType,
    resourceId,
    `Created ${resourceType}: ${resourceName}`,
    metadata
  );
}

export async function logUpdate(
  resourceType: AuditResourceType,
  resourceId: string,
  resourceName: string,
  changes: Record<string, any> = {}
) {
  await createAuditLog(
    'update',
    resourceType,
    resourceId,
    `Updated ${resourceType}: ${resourceName}`,
    { changes }
  );
}

export async function logDelete(
  resourceType: AuditResourceType,
  resourceId: string,
  resourceName: string
) {
  await createAuditLog(
    'delete',
    resourceType,
    resourceId,
    `Deleted ${resourceType}: ${resourceName}`,
    {}
  );
}

export async function logPublish(
  resourceType: AuditResourceType,
  resourceId: string,
  resourceName: string
) {
  await createAuditLog(
    'publish',
    resourceType,
    resourceId,
    `Published ${resourceType}: ${resourceName}`,
    {}
  );
}

export async function logApprove(
  resourceType: AuditResourceType,
  resourceId: string,
  resourceName: string
) {
  await createAuditLog(
    'approve',
    resourceType,
    resourceId,
    `Approved ${resourceType}: ${resourceName}`,
    {}
  );
}

export async function logReject(
  resourceType: AuditResourceType,
  resourceId: string,
  resourceName: string,
  reason?: string
) {
  await createAuditLog(
    'reject',
    resourceType,
    resourceId,
    `Rejected ${resourceType}: ${resourceName}`,
    reason ? { reason } : {}
  );
}

export async function logPromote(
  userId: string,
  userName: string,
  newRole: string
) {
  await createAuditLog(
    'promote',
    'user',
    userId,
    `Promoted ${userName} to ${newRole}`,
    { new_role: newRole }
  );
}

export async function logDemote(
  userId: string,
  userName: string,
  oldRole: string
) {
  await createAuditLog(
    'demote',
    'user',
    userId,
    `Demoted ${userName} from ${oldRole}`,
    { old_role: oldRole }
  );
}
