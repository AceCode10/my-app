import { createClient } from '@/lib/supabase/client';

export interface XPTransaction {
  id: string;
  user_id: string;
  xp_amount: number;
  source: string;
  source_id?: string;
  description?: string;
  created_at: string;
}

export interface UserGamification {
  id: string;
  user_id: string;
  total_xp: number;
  xp_this_week: number;
  xp_level: number;
  xp_progress_to_next_level: number;
  xp_needed_for_next_level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date?: string;
  leaderboard_rank?: number;
  leaderboard_opt_out: boolean;
  total_quizzes_completed: number;
  total_notes_viewed: number;
  total_questions_answered: number;
  total_time_spent_minutes: number;
  created_at: string;
  updated_at: string;
}

export class XPService {
  private supabase = createClient();

  /**
   * Award XP to a user for various activities
   */
  async awardXP(
    userId: string, 
    amount: number, 
    source: string, 
    sourceId?: string,
    description?: string
  ): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('award_xp', {
        p_user_id: userId,
        p_xp_amount: amount,
        p_source: source,
        p_source_id: sourceId || null,
        p_description: description || this.getXPDescription(source, amount)
      });

      if (error) {
        console.error('Error awarding XP:', error);
        return false;
      }

      // Trigger real-time update
      await this.triggerXPUpdate(userId, amount, source);
      return true;
    } catch (error) {
      console.error('Error in awardXP:', error);
      return false;
    }
  }

  /**
   * Get user's current gamification profile (creates one if it doesn't exist)
   */
  async getUserGamification(userId: string): Promise<UserGamification | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If record doesn't exist, create it
        if (error.code === 'PGRST116' || error.code === '406') {
          return await this.initializeUserGamification(userId);
        }
        console.error('Error fetching gamification data:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserGamification:', error);
      return null;
    }
  }

  /**
   * Initialize gamification record for a new user
   */
  async initializeUserGamification(userId: string): Promise<UserGamification | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_gamification')
        .insert({
          user_id: userId,
          total_xp: 0,
          xp_this_week: 0,
          xp_level: 1,
          xp_progress_to_next_level: 0,
          xp_needed_for_next_level: 100,
          current_streak: 0,
          longest_streak: 0,
          total_quizzes_completed: 0,
          total_notes_viewed: 0,
          total_time_spent_minutes: 0
        })
        .select()
        .single();

      if (error) {
        // If already exists (race condition), fetch it
        if (error.code === '23505') {
          const { data: existingData } = await this.supabase
            .from('user_gamification')
            .select('*')
            .eq('user_id', userId)
            .single();
          return existingData;
        }
        console.error('Error initializing gamification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in initializeUserGamification:', error);
      return null;
    }
  }

  /**
   * Get user's XP transaction history
   */
  async getXPTransactions(userId: string, limit = 10): Promise<XPTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching XP transactions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getXPTransactions:', error);
      return [];
    }
  }

  /**
   * Calculate XP for quiz completion
   */
  calculateQuizXP(score: number, maxScore: number, timeSpentMinutes: number): number {
    const percentage = (score / maxScore) * 100;
    let baseXP = Math.round(percentage * 0.5); // 0.5 XP per percentage point

    // Time bonus (faster completion = more XP)
    if (timeSpentMinutes < 5) {
      baseXP += 10; // Quick completion bonus
    } else if (timeSpentMinutes < 10) {
      baseXP += 5;
    }

    // Perfect score bonus
    if (percentage === 100) {
      baseXP += 20;
    }

    // High score bonus
    if (percentage >= 90) {
      baseXP += 10;
    }

    return Math.max(baseXP, 5); // Minimum 5 XP for attempting
  }

  /**
   * Calculate XP for note viewing
   */
  calculateNoteXP(timeSpentMinutes: number, completionPercentage: number): number {
    let baseXP = 5; // Base XP for viewing notes

    // Time-based XP
    if (timeSpentMinutes > 5) {
      baseXP += Math.min(Math.round(timeSpentMinutes / 5), 10); // Max 10 XP from time
    }

    // Completion bonus
    if (completionPercentage >= 80) {
      baseXP += 5;
    }

    return baseXP;
  }

  /**
   * Get XP description based on source
   */
  private getXPDescription(source: string, amount: number): string {
    const descriptions: Record<string, string> = {
      'quiz_completion': `Completed quiz - ${amount} XP`,
      'perfect_quiz': `Perfect quiz score - ${amount} XP bonus`,
      'quick_quiz': `Quick quiz completion - ${amount} XP bonus`,
      'note_view': `Read notes - ${amount} XP`,
      'note_completed': `Completed notes - ${amount} XP`,
      'streak_bonus': `Daily streak bonus - ${amount} XP`,
      'badge_bonus': `Badge achievement bonus - ${amount} XP`,
      'first_quiz': `First quiz completed - ${amount} XP`,
      'first_note': `First note read - ${amount} XP`,
      'level_up': `Level up achievement - ${amount} XP`,
      'weekly_top_performer': `Weekly top performer - ${amount} XP`
    };

    return descriptions[source] || `${amount} XP earned`;
  }

  /**
   * Trigger real-time XP update via Supabase Realtime
   */
  private async triggerXPUpdate(userId: string, amount: number, source: string) {
    try {
      const channel = this.supabase.channel('xp_updates');
      await channel.send({
        type: 'broadcast',
        event: 'xp_earned',
        payload: { userId, amount, source, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Error triggering XP update:', error);
    }
  }

  /**
   * Get user's level progress percentage
   */
  getLevelProgress(gamification: UserGamification): number {
    if (!gamification) return 0;
    return Math.round((gamification.xp_progress_to_next_level / gamification.xp_needed_for_next_level) * 100);
  }

  /**
   * Get XP needed for next level
   */
  getXPToNextLevel(gamification: UserGamification): number {
    if (!gamification) return 100;
    return gamification.xp_needed_for_next_level - gamification.xp_progress_to_next_level;
  }

  /**
   * Get level title based on XP level
   */
  getLevelTitle(level: number): string {
    if (level < 5) return 'Beginner';
    if (level < 10) return 'Learner';
    if (level < 20) return 'Student';
    if (level < 30) return 'Scholar';
    if (level < 50) return 'Expert';
    if (level < 75) return 'Master';
    if (level < 100) return 'Grandmaster';
    return 'Legend';
  }

  /**
   * Get weekly XP reset status
   */
  async resetWeeklyXP(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_gamification')
        .update({ xp_this_week: 0 })
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Error resetting weekly XP:', error);
      return false;
    }
  }

  /**
   * Get leaderboard position
   */
  async getLeaderboardPosition(userId: string): Promise<number | null> {
    try {
      const { data, error } = await this.supabase
        .from('leaderboard_cache')
        .select('rank')
        .eq('user_id', userId)
        .single();

      if (error) return null;
      return data?.rank || null;
    } catch (error) {
      console.error('Error getting leaderboard position:', error);
      return null;
    }
  }

  /**
   * Update leaderboard opt-out status
   */
  async updateLeaderboardOptOut(userId: string, optOut: boolean): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_gamification')
        .update({ leaderboard_opt_out: optOut })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating leaderboard opt-out:', error);
        return false;
      }

      // Update leaderboard cache
      await this.supabase.rpc('update_leaderboard_cache');
      return true;
    } catch (error) {
      console.error('Error in updateLeaderboardOptOut:', error);
      return false;
    }
  }
}
