/**
 * Daily Goals Service
 * Handles daily XP goals, quests, and progress tracking
 */

import { createClient } from '@/lib/supabase/client';

export interface GoalPreset {
  id: string;
  difficulty: 'casual' | 'regular' | 'serious' | 'intense';
  display_name: string;
  description: string;
  xp_target: number;
  questions_target: number;
  time_target_minutes: number;
  xp_bonus: number;
  icon: string;
  sort_order: number;
}

export interface DailyGoal {
  id: string;
  user_id: string;
  goal_type: 'xp' | 'questions' | 'time';
  goal_difficulty: 'casual' | 'regular' | 'serious' | 'intense';
  target_value: number;
  current_value: number;
  is_completed: boolean;
  completed_at: string | null;
  goal_date: string;
  created_at: string;
  updated_at: string;
}

export interface UserGoalPreferences {
  id: string;
  user_id: string;
  preferred_difficulty: 'casual' | 'regular' | 'serious' | 'intense';
  primary_goal_type: 'xp' | 'questions' | 'time';
  reminder_enabled: boolean;
  reminder_time: string;
  total_goals_completed: number;
  current_goal_streak: number;
  longest_goal_streak: number;
  created_at: string;
  updated_at: string;
}

export interface DailyQuest {
  id: string;
  user_id: string;
  quest_type: string;
  title: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_value: number;
  current_progress: number;
  is_completed: boolean;
  completed_at: string | null;
  xp_reward: number;
  quest_date: string;
  created_at: string;
}

export interface GoalProgressResult {
  goal_id: string;
  new_value: number;
  target: number;
  just_completed: boolean;
  xp_bonus: number;
}

export class DailyGoalsService {
  private supabase = createClient();

  /**
   * Get all goal presets
   */
  async getGoalPresets(): Promise<GoalPreset[]> {
    const { data, error } = await this.supabase
      .from('goal_presets')
      .select('*')
      .order('sort_order');

    if (error) {
      console.error('Error fetching goal presets:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get user's goal preferences
   */
  async getUserPreferences(userId: string): Promise<UserGoalPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_goal_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Silently handle missing table (406) or no rows (PGRST116)
      if (error && error.code !== 'PGRST116') {
        // Don't log 406 errors (table doesn't exist) to avoid console spam
        if (!error.message?.includes('406') && !error.message?.includes('relation')) {
          console.error('Error fetching user preferences:', error);
        }
        return null;
      }

      return data;
    } catch (e) {
      // Silently handle any errors - table may not exist
      return null;
    }
  }

  /**
   * Create or update user goal preferences
   */
  async setUserPreferences(
    userId: string,
    preferences: Partial<Pick<UserGoalPreferences, 'preferred_difficulty' | 'primary_goal_type' | 'reminder_enabled' | 'reminder_time'>>
  ): Promise<UserGoalPreferences | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_goal_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) {
        // Silently handle missing table errors
        if (!error.message?.includes('406') && !error.message?.includes('relation')) {
          console.error('Error setting user preferences:', error);
        }
        return null;
      }

      // If difficulty changed, update today's goals with new targets
      if (preferences.preferred_difficulty) {
        await this.updateTodayGoalsDifficulty(userId, preferences.preferred_difficulty);
      }

      return data;
    } catch (e) {
      // Silently handle any errors - table may not exist
      return null;
    }
  }

  /**
   * Update today's goals when difficulty changes
   */
  async updateTodayGoalsDifficulty(userId: string, newDifficulty: string): Promise<void> {
    try {
      // Try RPC first
      const { error: rpcError } = await this.supabase.rpc('update_daily_goals_difficulty', {
        p_user_id: userId,
        p_new_difficulty: newDifficulty,
      });

      if (rpcError) {
        // Fallback to direct update if RPC doesn't exist
        const { data: preset } = await this.supabase
          .from('goal_presets')
          .select('*')
          .eq('difficulty', newDifficulty)
          .single();

        if (preset) {
          const today = new Date().toISOString().split('T')[0];
          
          // Update XP goal
          await this.supabase
            .from('daily_goals')
            .update({ 
              goal_difficulty: newDifficulty, 
              target_value: preset.xp_target,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('goal_type', 'xp')
            .eq('goal_date', today);

          // Update questions goal
          await this.supabase
            .from('daily_goals')
            .update({ 
              goal_difficulty: newDifficulty, 
              target_value: preset.questions_target,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('goal_type', 'questions')
            .eq('goal_date', today);

          // Update time goal
          await this.supabase
            .from('daily_goals')
            .update({ 
              goal_difficulty: newDifficulty, 
              target_value: preset.time_target_minutes,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('goal_type', 'time')
            .eq('goal_date', today);
        }
      }
    } catch (e) {
      console.error('Error updating daily goals difficulty:', e);
    }
  }

  /**
   * Get today's goals for a user
   */
  async getTodayGoals(userId: string): Promise<DailyGoal[]> {
    // First ensure goals exist for today
    await this.supabase.rpc('create_daily_goals', { p_user_id: userId });

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from('daily_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('goal_date', today);

    if (error) {
      console.error('Error fetching today goals:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get a specific goal type for today
   */
  async getTodayGoal(userId: string, goalType: 'xp' | 'questions' | 'time'): Promise<DailyGoal | null> {
    const goals = await this.getTodayGoals(userId);
    return goals.find(g => g.goal_type === goalType) || null;
  }

  /**
   * Update goal progress
   */
  async updateProgress(
    userId: string,
    goalType: 'xp' | 'questions' | 'time',
    increment: number
  ): Promise<GoalProgressResult | null> {
    const { data, error } = await this.supabase.rpc('update_goal_progress', {
      p_user_id: userId,
      p_goal_type: goalType,
      p_increment: increment,
    });

    if (error) {
      console.error('Error updating goal progress:', error);
      return null;
    }

    if (data && data.length > 0) {
      return data[0];
    }

    return null;
  }

  /**
   * Get today's quests for a user
   */
  async getTodayQuests(userId: string): Promise<DailyQuest[]> {
    // First ensure quests exist for today
    await this.supabase.rpc('generate_daily_quests', { p_user_id: userId });

    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await this.supabase
      .from('daily_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('quest_date', today);

    if (error) {
      console.error('Error fetching today quests:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Update quest progress
   */
  async updateQuestProgress(
    userId: string,
    questType: string,
    progress: number
  ): Promise<{ completed: boolean; xpReward: number } | null> {
    const today = new Date().toISOString().split('T')[0];

    // Get current quest
    const { data: quest, error: fetchError } = await this.supabase
      .from('daily_quests')
      .select('*')
      .eq('user_id', userId)
      .eq('quest_type', questType)
      .eq('quest_date', today)
      .single();

    if (fetchError || !quest) {
      return null;
    }

    // Already completed
    if (quest.is_completed) {
      return { completed: false, xpReward: 0 };
    }

    const newProgress = Math.min(quest.current_progress + progress, quest.requirement_value);
    const justCompleted = newProgress >= quest.requirement_value;

    const { error: updateError } = await this.supabase
      .from('daily_quests')
      .update({
        current_progress: newProgress,
        is_completed: justCompleted,
        completed_at: justCompleted ? new Date().toISOString() : null,
      })
      .eq('id', quest.id);

    if (updateError) {
      console.error('Error updating quest progress:', updateError);
      return null;
    }

    return {
      completed: justCompleted,
      xpReward: justCompleted ? quest.xp_reward : 0,
    };
  }

  /**
   * Check if all goals are completed for today
   */
  async areAllGoalsCompleted(userId: string): Promise<boolean> {
    const goals = await this.getTodayGoals(userId);
    return goals.length > 0 && goals.every(g => g.is_completed);
  }

  /**
   * Get goal completion statistics
   */
  async getGoalStats(userId: string): Promise<{
    todayCompleted: number;
    todayTotal: number;
    weekCompleted: number;
    totalCompleted: number;
    currentStreak: number;
    longestStreak: number;
  }> {
    const goals = await this.getTodayGoals(userId);
    const preferences = await this.getUserPreferences(userId);

    // Count today's completed goals
    const todayCompleted = goals.filter(g => g.is_completed).length;

    // Get week's data
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: weekGoals } = await this.supabase
      .from('daily_goals')
      .select('is_completed')
      .eq('user_id', userId)
      .gte('goal_date', weekAgo.toISOString().split('T')[0]);

    const weekCompleted = weekGoals?.filter((g: { is_completed: boolean }) => g.is_completed).length || 0;

    return {
      todayCompleted,
      todayTotal: goals.length,
      weekCompleted,
      totalCompleted: preferences?.total_goals_completed || 0,
      currentStreak: preferences?.current_goal_streak || 0,
      longestStreak: preferences?.longest_goal_streak || 0,
    };
  }

  /**
   * Calculate progress percentage for a goal
   */
  calculateProgress(current: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min(Math.round((current / target) * 100), 100);
  }

  /**
   * Get display info for goal type
   */
  getGoalTypeInfo(goalType: 'xp' | 'questions' | 'time'): {
    label: string;
    unit: string;
    icon: string;
    color: string;
  } {
    switch (goalType) {
      case 'xp':
        return { label: 'XP Goal', unit: 'XP', icon: '⚡', color: 'text-yellow-500' };
      case 'questions':
        return { label: 'Questions Goal', unit: 'questions', icon: '📝', color: 'text-blue-500' };
      case 'time':
        return { label: 'Study Time', unit: 'minutes', icon: '⏱️', color: 'text-green-500' };
    }
  }
}

// Export singleton instance
export const dailyGoalsService = new DailyGoalsService();
