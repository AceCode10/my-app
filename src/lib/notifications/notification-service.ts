import { createClient } from '@/lib/supabase/client';

export type NotificationType = 
  | 'quiz_completed'
  | 'streak_milestone'
  | 'badge_earned'
  | 'level_up'
  | 'assignment_due'
  | 'assignment_graded'
  | 'class_announcement'
  | 'grade_released'
  | 'streak_reminder'
  | 'class_invitation';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, any>;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  action_text?: string;
  is_read: boolean;
  is_push_sent: boolean;
  is_email_sent: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data?: Record<string, any>;
  created_at: string;
  read_at?: string;
}

export class NotificationService {
  private supabase = createClient();

  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData): Promise<Notification | null> {
    try {
      const { data: notification, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          action_url: data.actionUrl,
          action_text: data.actionText,
          priority: data.priority || 'normal',
          data: data.data || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      // Trigger real-time update
      await this.triggerRealtimeNotification(data.userId, notification);
      
      return notification;
    } catch (error) {
      console.error('Error in createNotification:', error);
      return null;
    }
  }

  /**
   * Get user notifications with optional filters
   */
  async getUserNotifications(
    userId: string, 
    unreadOnly = false, 
    limit = 20
  ): Promise<Notification[]> {
    try {
      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserNotifications:', error);
      return [];
    }
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      return !error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteReadNotifications(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('is_read', true);

      return !error;
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      return false;
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(
    userId: string, 
    callback: (notification: Notification) => void
  ): () => void {
    const channel = this.supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      this.supabase.removeChannel(channel);
    };
  }

  /**
   * Trigger real-time notification update
   */
  private async triggerRealtimeNotification(userId: string, notification: Notification) {
    try {
      const channel = this.supabase.channel(`user:${userId}`);
      await channel.send({
        type: 'broadcast',
        event: 'new_notification',
        payload: notification
      });
    } catch (error) {
      console.error('Error triggering realtime notification:', error);
    }
  }

  /**
   * Get notification icon based on type
   */
  getNotificationIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      quiz_completed: '📝',
      streak_milestone: '🔥',
      badge_earned: '🏆',
      level_up: '⬆️',
      assignment_due: '📅',
      assignment_graded: '✅',
      class_announcement: '📢',
      grade_released: '📊',
      streak_reminder: '⏰',
      class_invitation: '✉️'
    };
    return icons[type] || '📌';
  }

  /**
   * Get notification color based on priority
   */
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'normal': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  }

  /**
   * Batch create notifications for multiple users
   */
  async createBatchNotifications(
    userIds: string[],
    notificationData: Omit<CreateNotificationData, 'userId'>
  ): Promise<boolean> {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        action_url: notificationData.actionUrl,
        action_text: notificationData.actionText,
        priority: notificationData.priority || 'normal',
        data: notificationData.data || {}
      }));

      const { error } = await this.supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('Error creating batch notifications:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in createBatchNotifications:', error);
      return false;
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getNotificationPreferences(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching notification preferences:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getNotificationPreferences:', error);
      return null;
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<Record<string, boolean>>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      return !error;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }
}
