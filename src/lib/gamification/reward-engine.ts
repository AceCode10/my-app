/**
 * Simplified Reward Engine
 * Focuses on topical questions, exam papers, and assessments
 * No currency/shop - just XP, streaks, levels, and badges
 */

import { createClient } from '@/lib/supabase/client';

// ============================================
// TYPES
// ============================================

export interface RewardBreakdown {
  baseXP: number;
  bonuses: RewardBonus[];
  totalXP: number;
  
  dailyGoalProgress: DailyGoalProgressUpdate[];
  badgesUnlocked: BadgeUnlock[];
  
  streakUpdated: boolean;
  newStreakDays: number;
  streakMilestone?: { days: number; title: string; xpReward: number };
  
  leagueXPAdded: number;
  newLeagueRank?: number;
  
  leveledUp: boolean;
  newLevel?: number;
  newTitle?: string;
}

export interface RewardBonus {
  type: string;
  label: string;
  amount: number;
  icon: string;
}

export interface DailyGoalProgressUpdate {
  goalType: 'xp' | 'questions' | 'time';
  previousValue: number;
  newValue: number;
  targetValue: number;
  completed: boolean;
  justCompleted: boolean;
}

export interface BadgeUnlock {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
}

export interface ActivityData {
  userId: string;
  activityType: 'topical_question' | 'exam_paper' | 'assessment' | 'note';
  
  // For questions/papers/assessments
  score?: number;
  maxScore?: number;
  percentage?: number;
  questionsAnswered?: number;
  correctAnswers?: number;
  
  // Time spent
  timeSpentMinutes: number;
  
  // Flags
  isPerfectScore?: boolean;
  isFirstOfType?: boolean;
  
  // Reference
  referenceId: string;
  referenceName?: string;
  
  // Additional context
  subjectName?: string;
  topicName?: string;
}

// ============================================
// XP CALCULATION RULES
// ============================================

/**
 * BALANCED XP REWARD PLAN
 * ========================
 * Philosophy: XP should be EARNED, not given freely. Make XP feel valuable.
 * 
 * Daily Target: ~50-100 XP for active study (1-2 hours)
 * Weekly Target: ~300-500 XP for consistent study
 * 
 * Topical Questions: 1-3 XP per question (main grind activity)
 * Past Papers: 5-15 XP per paper (significant effort required)
 * Assessments: 3-10 XP per assessment
 * Notes: 1-5 XP per note (passive learning)
 * 
 * Bonuses are RARE and require genuine achievement:
 * - Perfect score: Requires 100% - truly exceptional
 * - High score: Requires 80%+ - good performance
 * - Speed bonus: Only for genuinely fast completion
 */
const XP_RULES = {
  topical_question: {
    basePerQuestion: 1, // Reduced from 3 - questions are the main grind
    correctAnswerBonus: 1, // Reduced from 2 - reward correct answers modestly
    bonuses: {
      perfectScore: { xp: 5, label: 'Perfect!', icon: '💯' }, // Reduced from 15
      highScore: { xp: 2, label: 'Great Score (80%+)', icon: '⭐' }, // Reduced from 5
      firstToday: { xp: 2, label: 'First Question Today', icon: '🌅' }, // Reduced from 5
    },
  },
  exam_paper: {
    basePerQuestion: 0.5, // Reduced from 2 - papers have many questions
    percentageMultiplier: 0.1, // Reduced from 0.5 - 100% = 10 XP, not 50
    bonuses: {
      perfectScore: { xp: 10, label: 'Perfect Paper!', icon: '💯' }, // Reduced from 50
      highScore: { xp: 5, label: 'Excellent (80%+)', icon: '⭐' }, // Reduced from 20
      goodScore: { xp: 2, label: 'Good Score (60%+)', icon: '👍' }, // Reduced from 10
      completed: { xp: 3, label: 'Paper Completed', icon: '📄' }, // Reduced from 15
    },
  },
  assessment: {
    basePerQuestion: 0.5, // Reduced from 2
    percentageMultiplier: 0.1, // Reduced from 0.4
    bonuses: {
      perfectScore: { xp: 8, label: 'Perfect Assessment!', icon: '💯' }, // Reduced from 40
      highScore: { xp: 3, label: 'Excellent (80%+)', icon: '⭐' }, // Reduced from 15
      goodScore: { xp: 1, label: 'Good Score (60%+)', icon: '👍' }, // Reduced from 8
      completed: { xp: 2, label: 'Assessment Completed', icon: '✅' }, // Reduced from 10
    },
  },
  note: {
    basePerMinute: 0.5, // Reduced from 2
    maxBase: 5, // Reduced from 20
    completionBonus: 2, // Reduced from 5
  },
};

// ============================================
// REWARD ENGINE CLASS
// ============================================

export class RewardEngine {
  private supabase = createClient();

  /**
   * Process an activity and calculate all rewards
   */
  async processActivity(data: ActivityData): Promise<RewardBreakdown> {
    console.log('[RewardEngine] Processing activity:', data.activityType, 'for user:', data.userId);
    
    const breakdown: RewardBreakdown = {
      baseXP: 0,
      bonuses: [],
      totalXP: 0,
      dailyGoalProgress: [],
      badgesUnlocked: [],
      streakUpdated: false,
      newStreakDays: 0,
      leagueXPAdded: 0,
      leveledUp: false,
    };

    try {
      // 1. Calculate XP based on activity type
      this.calculateXP(data, breakdown);
      console.log('[RewardEngine] Calculated XP:', breakdown.totalXP, 'Base:', breakdown.baseXP, 'Bonuses:', breakdown.bonuses);

      // 2. Award XP to database
      await this.awardXP(data.userId, breakdown.totalXP, data.activityType, data.referenceId);

      // 3. Update daily goals
      await this.updateDailyGoals(data, breakdown);

      // 4. Update streak
      await this.updateStreak(data.userId, breakdown);

      // 5. Update league XP
      await this.updateLeagueXP(data.userId, breakdown.totalXP, breakdown);

      // 6. Check for level up
      await this.checkLevelUp(data.userId, breakdown);

      // 7. Check for badges (skip for now - can be added later)
      // await this.checkBadges(data.userId, data, breakdown);
      
      console.log('[RewardEngine] Activity processed successfully. Total XP awarded:', breakdown.totalXP);

    } catch (error) {
      console.error('[RewardEngine] Error processing activity rewards:', error);
    }

    return breakdown;
  }

  /**
   * Calculate XP based on activity type
   */
  private calculateXP(data: ActivityData, breakdown: RewardBreakdown): void {
    switch (data.activityType) {
      case 'topical_question':
        this.calculateTopicalQuestionXP(data, breakdown);
        break;
      case 'exam_paper':
        this.calculateExamPaperXP(data, breakdown);
        break;
      case 'assessment':
        this.calculateAssessmentXP(data, breakdown);
        break;
      case 'note':
        this.calculateNoteXP(data, breakdown);
        break;
    }
  }

  private calculateTopicalQuestionXP(data: ActivityData, breakdown: RewardBreakdown): void {
    const rules = XP_RULES.topical_question;
    
    // Base XP per question answered
    breakdown.baseXP = (data.questionsAnswered || 1) * rules.basePerQuestion;

    // Bonus for correct answers
    if (data.correctAnswers && data.correctAnswers > 0) {
      const correctBonus = data.correctAnswers * rules.correctAnswerBonus;
      breakdown.bonuses.push({
        type: 'correctAnswers',
        label: `${data.correctAnswers} Correct`,
        amount: correctBonus,
        icon: '✓',
      });
    }

    // Perfect score bonus
    if (data.isPerfectScore) {
      breakdown.bonuses.push({
        type: 'perfectScore',
        label: rules.bonuses.perfectScore.label,
        amount: rules.bonuses.perfectScore.xp,
        icon: rules.bonuses.perfectScore.icon,
      });
    } else if ((data.percentage || 0) >= 80) {
      breakdown.bonuses.push({
        type: 'highScore',
        label: rules.bonuses.highScore.label,
        amount: rules.bonuses.highScore.xp,
        icon: rules.bonuses.highScore.icon,
      });
    }

    breakdown.totalXP = breakdown.baseXP + breakdown.bonuses.reduce((sum, b) => sum + b.amount, 0);
  }

  private calculateExamPaperXP(data: ActivityData, breakdown: RewardBreakdown): void {
    const rules = XP_RULES.exam_paper;
    
    // Base XP from questions
    breakdown.baseXP = (data.questionsAnswered || 0) * rules.basePerQuestion;

    // Percentage-based bonus
    const percentage = data.percentage || 0;
    const percentageXP = Math.round(percentage * rules.percentageMultiplier);
    if (percentageXP > 0) {
      breakdown.bonuses.push({
        type: 'percentage',
        label: `${percentage}% Score`,
        amount: percentageXP,
        icon: '📊',
      });
    }

    // Completion bonus
    breakdown.bonuses.push({
      type: 'completed',
      label: rules.bonuses.completed.label,
      amount: rules.bonuses.completed.xp,
      icon: rules.bonuses.completed.icon,
    });

    // Performance bonuses
    if (data.isPerfectScore) {
      breakdown.bonuses.push({
        type: 'perfectScore',
        label: rules.bonuses.perfectScore.label,
        amount: rules.bonuses.perfectScore.xp,
        icon: rules.bonuses.perfectScore.icon,
      });
    } else if (percentage >= 80) {
      breakdown.bonuses.push({
        type: 'highScore',
        label: rules.bonuses.highScore.label,
        amount: rules.bonuses.highScore.xp,
        icon: rules.bonuses.highScore.icon,
      });
    } else if (percentage >= 60) {
      breakdown.bonuses.push({
        type: 'goodScore',
        label: rules.bonuses.goodScore.label,
        amount: rules.bonuses.goodScore.xp,
        icon: rules.bonuses.goodScore.icon,
      });
    }

    breakdown.totalXP = breakdown.baseXP + breakdown.bonuses.reduce((sum, b) => sum + b.amount, 0);
  }

  private calculateAssessmentXP(data: ActivityData, breakdown: RewardBreakdown): void {
    const rules = XP_RULES.assessment;
    
    breakdown.baseXP = (data.questionsAnswered || 0) * rules.basePerQuestion;

    const percentage = data.percentage || 0;
    const percentageXP = Math.round(percentage * rules.percentageMultiplier);
    if (percentageXP > 0) {
      breakdown.bonuses.push({
        type: 'percentage',
        label: `${percentage}% Score`,
        amount: percentageXP,
        icon: '📊',
      });
    }

    // Completion bonus
    breakdown.bonuses.push({
      type: 'completed',
      label: rules.bonuses.completed.label,
      amount: rules.bonuses.completed.xp,
      icon: rules.bonuses.completed.icon,
    });

    // Performance bonuses
    if (data.isPerfectScore) {
      breakdown.bonuses.push({
        type: 'perfectScore',
        label: rules.bonuses.perfectScore.label,
        amount: rules.bonuses.perfectScore.xp,
        icon: rules.bonuses.perfectScore.icon,
      });
    } else if (percentage >= 80) {
      breakdown.bonuses.push({
        type: 'highScore',
        label: rules.bonuses.highScore.label,
        amount: rules.bonuses.highScore.xp,
        icon: rules.bonuses.highScore.icon,
      });
    } else if (percentage >= 60) {
      breakdown.bonuses.push({
        type: 'goodScore',
        label: rules.bonuses.goodScore.label,
        amount: rules.bonuses.goodScore.xp,
        icon: rules.bonuses.goodScore.icon,
      });
    }

    breakdown.totalXP = breakdown.baseXP + breakdown.bonuses.reduce((sum, b) => sum + b.amount, 0);
  }

  private calculateNoteXP(data: ActivityData, breakdown: RewardBreakdown): void {
    const rules = XP_RULES.note;
    
    breakdown.baseXP = Math.min(data.timeSpentMinutes * rules.basePerMinute, rules.maxBase);
    
    if (data.timeSpentMinutes >= 5) {
      breakdown.bonuses.push({
        type: 'completion',
        label: 'Thorough Reading',
        amount: rules.completionBonus,
        icon: '📖',
      });
    }

    breakdown.totalXP = breakdown.baseXP + breakdown.bonuses.reduce((sum, b) => sum + b.amount, 0);
  }

  /**
   * Award XP to database (with fallback to direct update)
   */
  private async awardXP(userId: string, amount: number, source: string, referenceId: string): Promise<void> {
    if (amount <= 0) return;
    
    console.log(`[RewardEngine] Awarding ${amount} XP to user ${userId} for ${source}`);
    
    try {
      // Try RPC first - note: p_source_id can be null if referenceId is not a valid UUID
      const sourceId = this.isValidUUID(referenceId) ? referenceId : null;
      
      const { data, error } = await this.supabase.rpc('award_xp', {
        p_user_id: userId,
        p_xp_amount: amount,
        p_source_type: source,
        p_source_id: sourceId,
        p_description: `${source} completed`,
      });

      if (error) {
        console.error('[RewardEngine] RPC error:', error);
        // If RPC doesn't exist or fails, fall back to direct update
        if (error.code === '42883' || error.message?.includes('404') || error.message?.includes('does not exist')) {
          console.log('[RewardEngine] RPC not found, using direct update');
          await this.awardXPDirect(userId, amount);
        } else {
          // Other error - still try direct update
          console.log('[RewardEngine] RPC failed, trying direct update');
          await this.awardXPDirect(userId, amount);
        }
      } else {
        console.log('[RewardEngine] XP awarded successfully via RPC:', data);
      }
      
      // Dispatch event to notify UI components that XP was earned
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('xp_earned', { 
          detail: { amount, source, userId } 
        }));
      }
    } catch (error) {
      console.error('[RewardEngine] Error awarding XP:', error);
      // Fallback to direct update
      await this.awardXPDirect(userId, amount);
      
      // Still dispatch event even on fallback
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('xp_earned', { 
          detail: { amount, source, userId } 
        }));
      }
    }
  }
  
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Direct XP update fallback when RPC doesn't exist
   */
  private async awardXPDirect(userId: string, amount: number): Promise<void> {
    console.log(`[RewardEngine] Direct XP update for user ${userId}: +${amount}`);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // First ensure user_gamification record exists
      const { error: upsertError } = await this.supabase
        .from('user_gamification')
        .upsert({
          user_id: userId,
          total_xp: 0,
          xp_this_week: 0,
          xp_today: 0,
          xp_level: 1,
          xp_progress_to_next_level: 0,
          xp_needed_for_next_level: 100,
          current_streak: 0,
          longest_streak: 0,
        }, { onConflict: 'user_id', ignoreDuplicates: true });

      if (upsertError) {
        console.error('[RewardEngine] Error upserting user_gamification:', upsertError);
      }

      // Get current XP
      const { data: current, error: fetchError } = await this.supabase
        .from('user_gamification')
        .select('total_xp, xp_this_week, xp_today, xp_level, xp_progress_to_next_level, xp_needed_for_next_level, last_xp_date')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('[RewardEngine] Error fetching user_gamification:', fetchError);
        return;
      }

      if (!current) {
        console.error('[RewardEngine] No user_gamification record found');
        return;
      }

      const newTotalXP = (current.total_xp || 0) + amount;
      const newWeeklyXP = (current.xp_this_week || 0) + amount;
      
      // Reset daily XP if it's a new day
      const lastXPDate = current.last_xp_date;
      const currentDailyXP = (lastXPDate === today) ? (current.xp_today || 0) : 0;
      const newDailyXP = currentDailyXP + amount;
      
      let newProgress = (current.xp_progress_to_next_level || 0) + amount;
      let newLevel = current.xp_level || 1;
      let xpNeeded = current.xp_needed_for_next_level || 100;

      while (newProgress >= xpNeeded) {
        newProgress -= xpNeeded;
        newLevel++;
        xpNeeded = Math.round(xpNeeded * 1.2);
      }

      const { error: updateError } = await this.supabase
        .from('user_gamification')
        .update({
          total_xp: newTotalXP,
          xp_this_week: newWeeklyXP,
          xp_today: newDailyXP,
          xp_level: newLevel,
          xp_progress_to_next_level: newProgress,
          xp_needed_for_next_level: xpNeeded,
          last_xp_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('[RewardEngine] Error updating XP:', updateError);
      } else {
        console.log(`[RewardEngine] Direct XP update successful: ${current.total_xp} -> ${newTotalXP} (daily: ${newDailyXP})`);
      }
    } catch (e) {
      console.error('[RewardEngine] Exception in awardXPDirect:', e);
    }
  }

  /**
   * Update daily goals progress
   */
  private async updateDailyGoals(data: ActivityData, breakdown: RewardBreakdown): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      // First ensure daily goals exist for today
      await this.supabase.rpc('create_daily_goals', { p_user_id: data.userId });
      
      const { data: goals } = await this.supabase
        .from('daily_goals')
        .select('*')
        .eq('user_id', data.userId)
        .eq('goal_date', today);

      if (!goals || goals.length === 0) return;

      for (const goal of goals) {
        let increment = 0;
        
        switch (goal.goal_type) {
          case 'xp':
            increment = breakdown.totalXP;
            break;
          case 'questions':
            increment = data.questionsAnswered || 0;
            break;
          case 'time':
            increment = data.timeSpentMinutes;
            break;
        }

        if (increment > 0) {
          const previousValue = goal.current_value;
          const newValue = Math.min(previousValue + increment, goal.target_value);
          const wasCompleted = goal.is_completed;
          const nowCompleted = newValue >= goal.target_value;

          await this.supabase
            .from('daily_goals')
            .update({
              current_value: newValue,
              is_completed: nowCompleted,
              completed_at: nowCompleted && !wasCompleted ? new Date().toISOString() : goal.completed_at,
            })
            .eq('id', goal.id);

          breakdown.dailyGoalProgress.push({
            goalType: goal.goal_type,
            previousValue,
            newValue,
            targetValue: goal.target_value,
            completed: nowCompleted,
            justCompleted: nowCompleted && !wasCompleted,
          });
        }
      }
    } catch (error) {
      console.error('Error updating daily goals:', error);
    }
  }

  /**
   * Update streak
   */
  private async updateStreak(userId: string, breakdown: RewardBreakdown): Promise<void> {
    try {
      // Try RPC first
      const { data, error } = await this.supabase.rpc('update_streak', { p_user_id: userId });

      if (error) {
        console.log('[RewardEngine] Streak RPC error, using direct update:', error.message);
        await this.updateStreakDirect(userId, breakdown);
        return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const streakData = data[0];
        breakdown.streakUpdated = true;
        breakdown.newStreakDays = streakData.current_streak || 0;
        console.log('[RewardEngine] Streak updated:', breakdown.newStreakDays, 'days');

        // Check for streak milestones
        const milestones = [
          { days: 7, title: 'Week Warrior!', xpReward: 50 },
          { days: 14, title: 'Two Week Champ!', xpReward: 100 },
          { days: 30, title: 'Monthly Master!', xpReward: 200 },
          { days: 100, title: 'Century Legend!', xpReward: 1000 },
        ];

        const milestone = milestones.find(m => m.days === breakdown.newStreakDays);
        if (milestone) {
          breakdown.streakMilestone = milestone;
          breakdown.totalXP += milestone.xpReward;
          breakdown.bonuses.push({
            type: 'streakMilestone',
            label: milestone.title,
            amount: milestone.xpReward,
            icon: '🔥',
          });
        }
      } else if (data && !Array.isArray(data)) {
        // Handle case where data is returned as object instead of array
        breakdown.streakUpdated = true;
        breakdown.newStreakDays = data.current_streak || 0;
      }
    } catch (error) {
      console.error('[RewardEngine] Error updating streak:', error);
      await this.updateStreakDirect(userId, breakdown);
    }
  }

  /**
   * Direct streak update fallback
   */
  private async updateStreakDirect(userId: string, breakdown: RewardBreakdown): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current streak data
      const { data: current } = await this.supabase
        .from('user_gamification')
        .select('current_streak, longest_streak, last_activity_date')
        .eq('user_id', userId)
        .single();

      if (!current) return;

      const lastActivity = current.last_activity_date;
      let newStreak = current.current_streak || 0;
      let longestStreak = current.longest_streak || 0;

      if (!lastActivity) {
        // First activity
        newStreak = 1;
      } else if (lastActivity === today) {
        // Already active today, keep streak
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastActivity === yesterdayStr) {
          // Consecutive day - increment streak
          newStreak = newStreak + 1;
        } else {
          // Streak broken - reset to 1
          newStreak = 1;
        }
      }

      longestStreak = Math.max(longestStreak, newStreak);

      // Update database
      await this.supabase
        .from('user_gamification')
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_activity_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      breakdown.streakUpdated = true;
      breakdown.newStreakDays = newStreak;
      console.log('[RewardEngine] Streak updated directly:', newStreak, 'days');
    } catch (error) {
      console.error('[RewardEngine] Error in direct streak update:', error);
    }
  }

  /**
   * Update league XP
   */
  private async updateLeagueXP(userId: string, xp: number, breakdown: RewardBreakdown): Promise<void> {
    try {
      const { data, error } = await this.supabase.rpc('add_league_xp', { p_user_id: userId, p_xp: xp });

      // Silently handle RPC not existing or other errors
      if (error) {
        // Try direct update as fallback
        await this.updateLeagueXPDirect(userId, xp);
        breakdown.leagueXPAdded = xp;
        return;
      }

      if (data && data.length > 0) {
        breakdown.leagueXPAdded = xp;
        breakdown.newLeagueRank = data[0].new_rank;
      }
    } catch (error) {
      // League might not be set up - try direct update
      await this.updateLeagueXPDirect(userId, xp);
      breakdown.leagueXPAdded = xp;
    }
  }

  /**
   * Direct league XP update fallback
   */
  private async updateLeagueXPDirect(userId: string, xp: number): Promise<void> {
    try {
      // Try to update weekly_league_participants directly
      const { data: current } = await this.supabase
        .from('weekly_league_participants')
        .select('weekly_xp')
        .eq('user_id', userId)
        .single();

      if (current) {
        await this.supabase
          .from('weekly_league_participants')
          .update({ weekly_xp: (current.weekly_xp || 0) + xp })
          .eq('user_id', userId);
      }
    } catch (e) {
      // Silently fail - league is optional
    }
  }

  /**
   * Check for level up
   */
  private async checkLevelUp(userId: string, breakdown: RewardBreakdown): Promise<void> {
    try {
      const { data: gamData } = await this.supabase
        .from('user_gamification')
        .select('total_xp, xp_level')
        .eq('user_id', userId)
        .single();

      if (!gamData) return;

      const newLevel = this.calculateLevel(gamData.total_xp);
      
      if (newLevel.level > (gamData.xp_level || 1)) {
        breakdown.leveledUp = true;
        breakdown.newLevel = newLevel.level;
        breakdown.newTitle = newLevel.title;

        await this.supabase
          .from('user_gamification')
          .update({ xp_level: newLevel.level })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Error checking level up:', error);
    }
  }

  private calculateLevel(totalXP: number): { level: number; title: string } {
    if (totalXP < 100) return { level: 1, title: 'Beginner' };
    if (totalXP < 300) return { level: 2, title: 'Beginner' };
    if (totalXP < 600) return { level: 3, title: 'Learner' };
    if (totalXP < 1000) return { level: 4, title: 'Learner' };
    if (totalXP < 1500) return { level: 5, title: 'Student' };
    if (totalXP < 2500) return { level: 6, title: 'Student' };
    if (totalXP < 4000) return { level: 7, title: 'Scholar' };
    if (totalXP < 6000) return { level: 8, title: 'Scholar' };
    if (totalXP < 10000) return { level: 9, title: 'Expert' };
    if (totalXP < 15000) return { level: 10, title: 'Expert' };
    return { level: Math.floor(totalXP / 2000) + 5, title: 'Master' };
  }

  /**
   * Check for badge eligibility
   */
  private async checkBadges(userId: string, data: ActivityData, breakdown: RewardBreakdown): Promise<void> {
    try {
      // Perfect score badge
      if (data.isPerfectScore) {
        const badge = await this.tryAwardBadge(userId, 'perfect_score', {
          id: 'perfect_score',
          name: 'Perfectionist',
          description: 'Score 100% on any activity',
          icon: '💯',
          rarity: 'rare',
        });
        if (badge) breakdown.badgesUnlocked.push(badge);
      }

      // First paper completed
      if (data.activityType === 'exam_paper' && data.isFirstOfType) {
        const badge = await this.tryAwardBadge(userId, 'first_paper', {
          id: 'first_paper',
          name: 'Paper Pioneer',
          description: 'Complete your first exam paper',
          icon: '📄',
          rarity: 'common',
        });
        if (badge) breakdown.badgesUnlocked.push(badge);
      }

      // First assessment
      if (data.activityType === 'assessment' && data.isFirstOfType) {
        const badge = await this.tryAwardBadge(userId, 'first_assessment', {
          id: 'first_assessment',
          name: 'Assessment Ready',
          description: 'Complete your first assessment',
          icon: '✅',
          rarity: 'common',
        });
        if (badge) breakdown.badgesUnlocked.push(badge);
      }
    } catch (error) {
      console.error('Error checking badges:', error);
    }
  }

  private async tryAwardBadge(userId: string, badgeKey: string, badgeData: BadgeUnlock): Promise<BadgeUnlock | null> {
    try {
      const { data: existing } = await this.supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_id', badgeKey)
        .single();

      if (existing) return null;

      await this.supabase
        .from('user_badges')
        .insert({ user_id: userId, badge_id: badgeKey });

      return badgeData;
    } catch {
      return null;
    }
  }
}

// Export singleton
export const rewardEngine = new RewardEngine();
