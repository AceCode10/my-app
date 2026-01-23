/**
 * Integration utilities for gamification system
 * Connects gamification features with quiz completion, note viewing, and other activities
 */

import { XPService } from './xp-service';
import { StreakService } from './streak-service';
import { BadgeService } from './badge-service';
import { NotificationService } from '@/lib/notifications/notification-service';

export interface QuizCompletionData {
  userId: string;
  quizId: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpentMinutes: number;
  isPerfectScore: boolean;
  isFirstQuiz: boolean;
}

export interface NoteViewData {
  userId: string;
  noteId: string;
  subjectId: string;
  topicId: string;
  timeSpentMinutes: number;
  completionPercentage: number;
  isFirstNote: boolean;
}

export interface AssignmentCompletionData {
  userId: string;
  assignmentId: string;
  score: number;
  maxScore: number;
  submittedOnTime: boolean;
}

export class GamificationIntegration {
  private xpService = new XPService();
  private streakService = new StreakService();
  private badgeService = new BadgeService();
  private notificationService = new NotificationService();

  /**
   * Handle quiz completion and award appropriate XP, badges, and notifications
   * Consolidates all XP into a single award to prevent farming via multiple calls
   */
  async handleQuizCompletion(data: QuizCompletionData): Promise<void> {
    try {
      // Calculate total XP (consolidated to prevent multiple award calls)
      let totalXP = this.xpService.calculateQuizXP(
        data.score,
        data.maxScore,
        data.timeSpentMinutes
      );

      // Build description with all bonuses
      const bonuses: string[] = [];

      // Perfect score bonus
      if (data.isPerfectScore) {
        totalXP += 20;
        bonuses.push('Perfect score +20');
      }

      // Quick completion bonus
      if (data.timeSpentMinutes < 5) {
        totalXP += 10;
        bonuses.push('Speed bonus +10');
      }

      // First quiz bonus
      if (data.isFirstQuiz) {
        totalXP += 25;
        bonuses.push('First quiz +25');
      }

      // Award all XP in a single call (prevents farming via multiple calls)
      const description = bonuses.length > 0 
        ? `Quiz ${data.percentage}% (${bonuses.join(', ')})`
        : `Completed quiz with ${data.percentage}% score`;
      
      await this.xpService.awardXP(
        data.userId,
        totalXP,
        'quiz_completion',
        data.quizId,
        description
      );

      // Update streak
      await this.streakService.updateDailyActivity(data.userId);

      // Update quiz count in gamification profile
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.rpc('increment', {
        table_name: 'user_gamification',
        column_name: 'total_quizzes_completed',
        user_id: data.userId
      });

      // Check for badge eligibility
      await this.badgeService.checkAndAwardEligibleBadges(data.userId);

      // Create completion notification
      await this.notificationService.createNotification({
        userId: data.userId,
        type: 'quiz_completed',
        title: '📝 Quiz Completed!',
        message: `You scored ${data.percentage}% and earned ${totalXP} XP!`,
        actionUrl: `/practice/results/${data.quizId}`,
        actionText: 'View Results',
        priority: data.percentage >= 80 ? 'high' : 'normal',
        data: {
          quizId: data.quizId,
          score: data.score,
          maxScore: data.maxScore,
          percentage: data.percentage,
          xpEarned: totalXP
        }
      });

      // Special achievements (badges are already deduplicated in badge service)
      if (data.isPerfectScore) {
        await this.badgeService.awardBadge(data.userId, 'perfect_score_badge_id');
      }

      if (data.timeSpentMinutes < 5) {
        await this.badgeService.awardBadge(data.userId, 'quick_learner_badge_id');
      }
    } catch (error) {
      console.error('Error handling quiz completion:', error);
    }
  }

  /**
   * Handle note viewing and award XP
   * Consolidates all XP into a single award to prevent farming
   */
  async handleNoteView(data: NoteViewData): Promise<void> {
    try {
      // Calculate total XP (consolidated)
      let totalXP = this.xpService.calculateNoteXP(
        data.timeSpentMinutes,
        data.completionPercentage
      );

      // Build description with bonuses
      const bonuses: string[] = [];

      // First note bonus
      if (data.isFirstNote) {
        totalXP += 15;
        bonuses.push('First note +15');
      }

      // Completion bonus
      if (data.completionPercentage >= 80) {
        totalXP += 5;
        bonuses.push('Completed +5');
      }

      // Award all XP in a single call
      const description = bonuses.length > 0 
        ? `Notes (${bonuses.join(', ')})`
        : 'Read study notes';

      await this.xpService.awardXP(
        data.userId,
        totalXP,
        'note_view',
        data.noteId,
        description
      );

      // Update streak
      await this.streakService.updateDailyActivity(data.userId);

      // Update note count
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      await supabase.rpc('increment', {
        table_name: 'user_gamification',
        column_name: 'total_notes_viewed',
        user_id: data.userId
      });

      // Check for badge eligibility
      await this.badgeService.checkAndAwardEligibleBadges(data.userId);
    } catch (error) {
      console.error('Error handling note view:', error);
    }
  }

  /**
   * Handle assignment completion
   */
  async handleAssignmentCompletion(data: AssignmentCompletionData): Promise<void> {
    try {
      const percentage = (data.score / data.maxScore) * 100;
      let xpEarned = Math.round(percentage * 0.8); // 0.8 XP per percentage point

      // On-time submission bonus
      if (data.submittedOnTime) {
        xpEarned += 15;
      }

      // Award XP
      await this.xpService.awardXP(
        data.userId,
        xpEarned,
        'assignment_completion',
        data.assignmentId,
        `Assignment completed with ${percentage}% score`
      );

      // Update streak
      await this.streakService.updateDailyActivity(data.userId);

      // Create notification
      await this.notificationService.createNotification({
        userId: data.userId,
        type: 'assignment_graded',
        title: '✅ Assignment Graded',
        message: `Your assignment has been graded. You earned ${xpEarned} XP!`,
        actionUrl: `/dashboard/assignments/${data.assignmentId}`,
        actionText: 'View Grade',
        priority: 'normal',
        data: {
          assignmentId: data.assignmentId,
          score: data.score,
          maxScore: data.maxScore,
          percentage,
          xpEarned
        }
      });
    } catch (error) {
      console.error('Error handling assignment completion:', error);
    }
  }

  /**
   * Send daily streak reminder to users at risk
   */
  async sendStreakReminders(): Promise<void> {
    try {
      // This would typically be called by a cron job
      // Get all users who need streak reminders
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      const { data: users } = await supabase
        .from('user_gamification')
        .select('user_id, current_streak, last_activity_date')
        .gt('current_streak', 0);

      if (!users) return;

      for (const user of users) {
        const shouldSend = await this.streakService.shouldSendStreakReminder(user.user_id);
        if (shouldSend) {
          await this.streakService.sendStreakReminder(user.user_id);
        }
      }
    } catch (error) {
      console.error('Error sending streak reminders:', error);
    }
  }

  /**
   * Update leaderboard cache (should be called periodically)
   */
  async updateLeaderboard(): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      await supabase.rpc('update_leaderboard_cache');
    } catch (error) {
      console.error('Error updating leaderboard:', error);
    }
  }

  /**
   * Reset weekly XP for all users (called weekly)
   */
  async resetWeeklyXP(): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      await supabase
        .from('user_gamification')
        .update({ xp_this_week: 0 });
    } catch (error) {
      console.error('Error resetting weekly XP:', error);
    }
  }

  /**
   * Award special time-based badges
   */
  async checkTimeBadges(userId: string): Promise<void> {
    try {
      const hour = new Date().getHours();

      // Night Owl badge (10 PM - 6 AM)
      if (hour >= 22 || hour < 6) {
        await this.badgeService.awardBadge(userId, 'night_owl_badge_id');
      }

      // Early Bird badge (5 AM - 7 AM)
      if (hour >= 5 && hour < 7) {
        await this.badgeService.awardBadge(userId, 'early_bird_badge_id');
      }

      // Weekend Warrior badge
      const day = new Date().getDay();
      if (day === 0 || day === 6) {
        await this.badgeService.awardBadge(userId, 'weekend_warrior_badge_id');
      }
    } catch (error) {
      console.error('Error checking time badges:', error);
    }
  }

  /**
   * Track study time
   */
  async trackStudyTime(userId: string, minutes: number): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      await supabase
        .from('user_gamification')
        .update({
          total_time_spent_minutes: supabase.rpc('increment', {
            column_name: 'total_time_spent_minutes',
            increment_amount: minutes
          })
        })
        .eq('user_id', userId);
    } catch (error) {
      console.error('Error tracking study time:', error);
    }
  }

  /**
   * Create class announcement notification for all students
   */
  async notifyClassAnnouncement(
    classId: string,
    title: string,
    message: string
  ): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Get all students in the class
      const { data: members } = await supabase
        .from('class_members')
        .select('user_id')
        .eq('class_id', classId);

      if (!members) return;

      const userIds = members.map(m => m.user_id);

      // Create notifications for all students
      await this.notificationService.createBatchNotifications(userIds, {
        type: 'class_announcement',
        title: `📢 ${title}`,
        message,
        actionUrl: `/dashboard/classes/${classId}`,
        actionText: 'View Class',
        priority: 'normal',
        data: { classId }
      });
    } catch (error) {
      console.error('Error notifying class announcement:', error);
    }
  }

  /**
   * Notify assignment due soon
   */
  async notifyAssignmentDue(
    userId: string,
    assignmentId: string,
    assignmentTitle: string,
    dueDate: Date
  ): Promise<void> {
    try {
      const hoursUntilDue = Math.round((dueDate.getTime() - Date.now()) / (1000 * 60 * 60));

      await this.notificationService.createNotification({
        userId,
        type: 'assignment_due',
        title: '📅 Assignment Due Soon',
        message: `"${assignmentTitle}" is due in ${hoursUntilDue} hours!`,
        actionUrl: `/dashboard/assignments/${assignmentId}`,
        actionText: 'Start Now',
        priority: hoursUntilDue <= 24 ? 'high' : 'normal',
        data: {
          assignmentId,
          dueDate: dueDate.toISOString(),
          hoursUntilDue
        }
      });
    } catch (error) {
      console.error('Error notifying assignment due:', error);
    }
  }
}

// Export singleton instance
export const gamificationIntegration = new GamificationIntegration();
