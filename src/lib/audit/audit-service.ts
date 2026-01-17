/**
 * Audit Log Service
 * Track important user actions for security and analytics
 */

import { createClient } from '@/lib/supabase/client';

export type AuditAction =
  // Authentication
  | 'user.login'
  | 'user.logout'
  | 'user.password_change'
  | 'user.profile_update'
  // Assessments
  | 'assessment.start'
  | 'assessment.submit'
  | 'assessment.auto_submit'
  | 'assessment.grade'
  // Classes
  | 'class.create'
  | 'class.update'
  | 'class.delete'
  | 'class.student_enroll'
  | 'class.student_remove'
  // Assignments
  | 'assignment.create'
  | 'assignment.update'
  | 'assignment.delete'
  | 'assignment.release_results'
  // Content
  | 'question.create'
  | 'question.update'
  | 'question.delete'
  | 'note.create'
  | 'note.update'
  | 'note.delete'
  // Tests
  | 'test.create'
  | 'test.update'
  | 'test.delete'
  | 'test.publish';

export type ResourceType =
  | 'user'
  | 'class'
  | 'assignment'
  | 'assessment'
  | 'attempt'
  | 'question'
  | 'note'
  | 'test';

export interface AuditLogEntry {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  description: string;
  metadata?: Record<string, any>;
  userId?: string;
}

class AuditService {
  private supabase = createClient();

  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      
      const { error } = await this.supabase
        .from('audit_logs')
        .insert({
          user_id: entry.userId || user?.id,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId,
          description: entry.description,
          metadata: entry.metadata || {},
          ip_address: null, // Would need server-side to get this
          user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : null
        });

      if (error) {
        console.error('Failed to log audit event:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Audit log error:', error);
      return false;
    }
  }

  /**
   * Log user login
   */
  async logLogin(userId: string): Promise<void> {
    await this.log({
      action: 'user.login',
      resourceType: 'user',
      resourceId: userId,
      description: 'User logged in',
      userId
    });
  }

  /**
   * Log user logout
   */
  async logLogout(userId: string): Promise<void> {
    await this.log({
      action: 'user.logout',
      resourceType: 'user',
      resourceId: userId,
      description: 'User logged out',
      userId
    });
  }

  /**
   * Log assessment start
   */
  async logAssessmentStart(attemptId: string, assessmentType: string): Promise<void> {
    await this.log({
      action: 'assessment.start',
      resourceType: 'attempt',
      resourceId: attemptId,
      description: `Started ${assessmentType} assessment`,
      metadata: { assessmentType }
    });
  }

  /**
   * Log assessment submission
   */
  async logAssessmentSubmit(attemptId: string, score?: number, maxScore?: number): Promise<void> {
    await this.log({
      action: 'assessment.submit',
      resourceType: 'attempt',
      resourceId: attemptId,
      description: `Submitted assessment - Score: ${score}/${maxScore}`,
      metadata: { score, maxScore }
    });
  }

  /**
   * Log class creation
   */
  async logClassCreate(classId: string, className: string): Promise<void> {
    await this.log({
      action: 'class.create',
      resourceType: 'class',
      resourceId: classId,
      description: `Created class: ${className}`,
      metadata: { className }
    });
  }

  /**
   * Log student enrollment
   */
  async logStudentEnroll(classId: string, studentId: string): Promise<void> {
    await this.log({
      action: 'class.student_enroll',
      resourceType: 'class',
      resourceId: classId,
      description: 'Student enrolled in class',
      metadata: { studentId }
    });
  }

  /**
   * Log assignment creation
   */
  async logAssignmentCreate(assignmentId: string, title: string, classId: string): Promise<void> {
    await this.log({
      action: 'assignment.create',
      resourceType: 'assignment',
      resourceId: assignmentId,
      description: `Created assignment: ${title}`,
      metadata: { title, classId }
    });
  }

  /**
   * Log grading action
   */
  async logGrade(attemptId: string, graderId: string, score: number): Promise<void> {
    await this.log({
      action: 'assessment.grade',
      resourceType: 'attempt',
      resourceId: attemptId,
      description: `Graded attempt - Score: ${score}`,
      metadata: { graderId, score }
    });
  }

  /**
   * Get audit logs for current user
   */
  async getMyLogs(limit = 50): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  async getResourceLogs(resourceType: ResourceType, resourceId: string, limit = 50): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to fetch resource audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching resource audit logs:', error);
      return [];
    }
  }
}

export const auditService = new AuditService();
