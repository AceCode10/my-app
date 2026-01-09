import { createClient } from '@/lib/supabase/client';

export interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
  streak_freeze_count: number;
}

export interface StreakMilestone {
  days: number;
  title: string;
  description: string;
  xp_reward: number;
  badge_name: string;
}

export class StreakService {
  private supabase = createClient();

  private readonly milestones: StreakMilestone[] = [
    { days: 3, title: 'Getting Started', description: '3-day streak!', xp_reward: 10, badge_name: '3 Day Streak' },
    { days: 7, title: 'Week Warrior', description: '7-day streak!', xp_reward: 25, badge_name: 'Week Warrior' },
    { days: 14, title: 'Fortnight Fighter', description: '14-day streak!', xp_reward: 50, badge_name: 'Fortnight Fighter' },
    { days: 30, title: 'Monthly Master', description: '30-day streak!', xp_reward: 100, badge_name: 'Monthly Master' },
    { days: 60, title: 'Streak Champion', description: '60-day streak!', xp_reward: 200, badge_name: 'Streak Champion' },
    { days: 100, title: 'Streak Legend', description: '100-day streak!', xp_reward: 500, badge_name: 'Streak Legend' },
    { days: 365, title: 'Year of Learning', description: '365-day streak!', xp_reward: 1000, badge_name: 'Year of Learning' }
  ];

  /**
   * Update daily activity and maintain streak
   */
  async updateDailyActivity(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('update_streak', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error updating streak:', error);
        return false;
      }

      // Trigger real-time streak update
      await this.triggerStreakUpdate(userId);
      return true;
    } catch (error) {
      console.error('Error in updateDailyActivity:', error);
      return false;
    }
  }

  /**
   * Get user's current streak data
   */
  async getStreakData(userId: string): Promise<StreakData | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_gamification')
        .select('current_streak, longest_streak, last_activity_date, streak_freeze_count')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching streak data:', error);
        return null;
      }

      return data || {
        current_streak: 0,
        longest_streak: 0,
        last_activity_date: undefined,
        streak_freeze_count: 0
      };
    } catch (error) {
      console.error('Error in getStreakData:', error);
      return null;
    }
  }

  /**
   * Check if user is at risk of losing streak
   */
  async getStreakRisk(userId: string): Promise<'safe' | 'warning' | 'danger' | 'lost'> {
    const streakData = await this.getStreakData(userId);
    if (!streakData || !streakData.last_activity_date) return 'lost';

    const lastActivity = new Date(streakData.last_activity_date);
    const today = new Date();
    const daysSinceActivity = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceActivity === 0) return 'safe';
    if (daysSinceActivity === 1) return 'warning';
    if (daysSinceActivity === 2) return 'danger';
    return 'lost';
  }

  /**
   * Get next streak milestone
   */
  getNextMilestone(currentStreak: number): StreakMilestone | null {
    return this.milestones.find(m => m.days > currentStreak) || null;
  }

  /**
   * Get progress to next milestone
   */
  getMilestoneProgress(currentStreak: number): { milestone: StreakMilestone | null; progress: number; daysRemaining: number } {
    const nextMilestone = this.getNextMilestone(currentStreak);
    
    if (!nextMilestone) {
      return { milestone: null, progress: 100, daysRemaining: 0 };
    }

    const previousMilestone = this.milestones
      .filter(m => m.days <= currentStreak)
      .pop();

    const startDay = previousMilestone ? previousMilestone.days : 0;
    const totalDays = nextMilestone.days - startDay;
    const progressDays = currentStreak - startDay;
    const progress = Math.round((progressDays / totalDays) * 100);
    const daysRemaining = nextMilestone.days - currentStreak;

    return { milestone: nextMilestone, progress, daysRemaining };
  }

  /**
   * Check if user should receive streak reminder notification
   */
  async shouldSendStreakReminder(userId: string): Promise<boolean> {
    const risk = await this.getStreakRisk(userId);
    return risk === 'warning' || risk === 'danger';
  }

  /**
   * Send streak reminder notification
   */
  async sendStreakReminder(userId: string): Promise<boolean> {
    try {
      const streakData = await this.getStreakData(userId);
      if (!streakData) return false;

      const risk = await this.getStreakRisk(userId);
      let title: string;
      let message: string;

      if (risk === 'warning') {
        title = '⚠️ Streak at Risk!';
        message = `You haven't studied today! Your ${streakData.current_streak}-day streak is at risk.`;
      } else if (risk === 'danger') {
        title = '🚨 Streak in Danger!';
        message = `Your streak will be lost if you don't study today! Save your ${streakData.current_streak}-day streak!`;
      } else {
        return false;
      }

      const { error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'streak_reminder',
          title,
          message,
          priority: 'high',
          data: { streak: streakData.current_streak, risk }
        });

      return !error;
    } catch (error) {
      console.error('Error sending streak reminder:', error);
      return false;
    }
  }

  /**
   * Use streak freeze (if available)
   */
  async useStreakFreeze(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('user_gamification')
        .select('streak_freeze_count, current_streak')
        .eq('user_id', userId)
        .single();

      if (error || !data || data.streak_freeze_count <= 0) {
        return false;
      }

      const { error: updateError } = await this.supabase
        .from('user_gamification')
        .update({ 
          streak_freeze_count: data.streak_freeze_count - 1,
          last_activity_date: new Date().toISOString().split('T')[0]
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error using streak freeze:', updateError);
        return false;
      }

      // Create notification
      await this.supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'streak_freeze_used',
          title: '❄️ Streak Freeze Used',
          message: `Your streak freeze has been used to protect your ${data.current_streak}-day streak!`,
          priority: 'normal'
        });

      return true;
    } catch (error) {
      console.error('Error in useStreakFreeze:', error);
      return false;
    }
  }

  /**
   * Award streak freeze (premium feature)
   */
  async awardStreakFreeze(userId: string, count = 1): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_gamification')
        .update({ 
          streak_freeze_count: this.supabase.rpc('increment', { 
            column_name: 'streak_freeze_count', 
            increment_amount: count 
          })
        })
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Error awarding streak freeze:', error);
      return false;
    }
  }

  /**
   * Get streak statistics for a user
   */
  async getStreakStats(userId: string): Promise<{
    current: number;
    longest: number;
    average: number;
    totalDays: number;
    thisMonth: number;
  }> {
    try {
      const streakData = await this.getStreakData(userId);
      if (!streakData) {
        return { current: 0, longest: 0, average: 0, totalDays: 0, thisMonth: 0 };
      }

      // Get historical streak data (would need additional table for full history)
      // For now, return basic stats
      const today = new Date();
      const thisMonth = streakData.last_activity_date ? 
        (new Date(streakData.last_activity_date).getMonth() === today.getMonth() ? streakData.current_streak : 0) : 0;

      return {
        current: streakData.current_streak,
        longest: streakData.longest_streak,
        average: Math.round((streakData.current_streak + streakData.longest_streak) / 2),
        totalDays: streakData.current_streak, // Would need full history for accurate total
        thisMonth
      };
    } catch (error) {
      console.error('Error getting streak stats:', error);
      return { current: 0, longest: 0, average: 0, totalDays: 0, thisMonth: 0 };
    }
  }

  /**
   * Trigger real-time streak update
   */
  private async triggerStreakUpdate(userId: string) {
    try {
      const channel = this.supabase.channel('streak_updates');
      await channel.send({
        type: 'broadcast',
        event: 'streak_updated',
        payload: { userId, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Error triggering streak update:', error);
    }
  }

  /**
   * Get streak color based on length
   */
  getStreakColor(streakDays: number): string {
    if (streakDays === 0) return 'text-gray-500';
    if (streakDays < 3) return 'text-green-500';
    if (streakDays < 7) return 'text-blue-500';
    if (streakDays < 14) return 'text-purple-500';
    if (streakDays < 30) return 'text-orange-500';
    if (streakDays < 100) return 'text-red-500';
    return 'text-yellow-500';
  }

  /**
   * Get streak emoji based on length
   */
  getStreakEmoji(streakDays: number): string {
    if (streakDays === 0) return '💤';
    if (streakDays < 3) return '🔥';
    if (streakDays < 7) return '⚡';
    if (streakDays < 14) return '💪';
    if (streakDays < 30) return '🌟';
    if (streakDays < 100) return '👑';
    return '🏆';
  }

  /**
   * Get streak message
   */
  getStreakMessage(streakDays: number): string {
    if (streakDays === 0) return 'Start your learning streak today!';
    if (streakDays === 1) return 'Great start! Keep it going!';
    if (streakDays < 7) return `${streakDays} days - You\'re building momentum!`;
    if (streakDays < 14) return `${streakDays} days - Week warrior!`;
    if (streakDays < 30) return `${streakDays} days - Incredible consistency!`;
    if (streakDays < 100) return `${streakDays} days - Legendary dedication!`;
    return `${streakDays} days - You\'re absolutely unstoppable!`;
  }

  /**
   * Check for streak freeze availability (premium feature check)
   */
  async hasStreakFreeze(userId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('user_gamification')
        .select('streak_freeze_count')
        .eq('user_id', userId)
        .single();

      return !error && (data?.streak_freeze_count || 0) > 0;
    } catch (error) {
      console.error('Error checking streak freeze:', error);
      return false;
    }
  }
}
