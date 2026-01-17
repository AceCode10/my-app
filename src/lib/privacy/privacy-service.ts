/**
 * Privacy Service
 * Handle data export and deletion requests
 */

import { createClient } from '@/lib/supabase/client';

export interface DataExportResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface DeletionResult {
  success: boolean;
  deletedItems?: {
    attempts: number;
    progress: number;
    notifications: number;
  };
  error?: string;
}

class PrivacyService {
  private supabase = createClient();

  /**
   * Export all user data (GDPR compliant)
   */
  async exportUserData(): Promise<DataExportResult> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Fetch all user data in parallel
      const [
        profileResult,
        attemptsResult,
        progressResult,
        notificationsResult,
        enrollmentsResult,
        xpTransactionsResult
      ] = await Promise.all([
        this.supabase.from('users').select('*').eq('id', user.id).single(),
        this.supabase.from('assessment_attempts').select('*').eq('user_id', user.id),
        this.supabase.from('user_progress').select('*').eq('user_id', user.id),
        this.supabase.from('notifications').select('*').eq('user_id', user.id),
        this.supabase.from('enrollments').select('*, classes(name)').eq('user_id', user.id),
        this.supabase.from('xp_transactions').select('*').eq('user_id', user.id)
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        profile: profileResult.data,
        assessmentAttempts: attemptsResult.data || [],
        progress: progressResult.data || [],
        notifications: notificationsResult.data || [],
        enrollments: enrollmentsResult.data || [],
        xpTransactions: xpTransactionsResult.data || []
      };

      return { success: true, data: exportData };
    } catch (error) {
      console.error('Error exporting user data:', error);
      return { success: false, error: 'Failed to export data' };
    }
  }

  /**
   * Download user data as JSON file
   */
  async downloadUserData(): Promise<boolean> {
    const result = await this.exportUserData();
    
    if (!result.success || !result.data) {
      return false;
    }

    try {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iga-prep-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Error downloading data:', error);
      return false;
    }
  }

  /**
   * Delete user learning data (keeps account)
   */
  async deleteLearningData(): Promise<DeletionResult> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Delete learning-related data
      const [attemptsResult, progressResult, notificationsResult] = await Promise.all([
        this.supabase.from('assessment_attempts').delete().eq('user_id', user.id),
        this.supabase.from('user_progress').delete().eq('user_id', user.id),
        this.supabase.from('notifications').delete().eq('user_id', user.id)
      ]);

      // Reset XP and streak
      await this.supabase
        .from('users')
        .update({ xp: 0, streak_days: 0 })
        .eq('id', user.id);

      return {
        success: true,
        deletedItems: {
          attempts: attemptsResult.count || 0,
          progress: progressResult.count || 0,
          notifications: notificationsResult.count || 0
        }
      };
    } catch (error) {
      console.error('Error deleting learning data:', error);
      return { success: false, error: 'Failed to delete data' };
    }
  }

  /**
   * Request full account deletion
   * This marks the account for deletion - actual deletion happens via admin process
   */
  async requestAccountDeletion(reason?: string): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return false;

      // Mark account for deletion
      const { error } = await this.supabase
        .from('users')
        .update({
          deletion_requested_at: new Date().toISOString(),
          deletion_reason: reason || null
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error requesting deletion:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      return false;
    }
  }

  /**
   * Cancel account deletion request
   */
  async cancelDeletionRequest(): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return false;

      const { error } = await this.supabase
        .from('users')
        .update({
          deletion_requested_at: null,
          deletion_reason: null
        })
        .eq('id', user.id);

      return !error;
    } catch (error) {
      console.error('Error canceling deletion request:', error);
      return false;
    }
  }

  /**
   * Get privacy settings
   */
  async getPrivacySettings(): Promise<any> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return null;

      const { data } = await this.supabase
        .from('users')
        .select('show_profile_publicly, show_progress_to_teachers, email_notifications_enabled, deletion_requested_at')
        .eq('id', user.id)
        .single();

      return data;
    } catch (error) {
      console.error('Error fetching privacy settings:', error);
      return null;
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(settings: {
    show_profile_publicly?: boolean;
    show_progress_to_teachers?: boolean;
    email_notifications_enabled?: boolean;
  }): Promise<boolean> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return false;

      const { error } = await this.supabase
        .from('users')
        .update(settings)
        .eq('id', user.id);

      return !error;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      return false;
    }
  }
}

export const privacyService = new PrivacyService();
