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

const XP_RULES = {
  topical_question: {
    basePerQuestion: 3,
    correctAnswerBonus: 2,
    bonuses: {
      perfectScore: { xp: 15, label: 'Perfect!', icon: '💯' },
      highScore: { xp: 5, label: 'Great Score (80%+)', icon: '⭐' },
      firstToday: { xp: 5, label: 'First Question Today', icon: '🌅' },
    },
  },
  exam_paper: {
    basePerQuestion: 2,
    percentageMultiplier: 0.5, // 0.5 XP per percentage point
    bonuses: {
      perfectScore: { xp: 50, label: 'Perfect Paper!', icon: '💯' },
      highScore: { xp: 20, label: 'Excellent (80%+)', icon: '⭐' },
      goodScore: { xp: 10, label: 'Good Score (60%+)', icon: '👍' },
      completed: { xp: 15, label: 'Paper Completed', icon: '📄' },
    },
  },
  assessment: {
    basePerQuestion: 2,
    percentageMultiplier: 0.4,
    bonuses: {
      perfectScore: { xp: 40, label: 'Perfect Assessment!', icon: '💯' },
      highScore: { xp: 15, label: 'Excellent (80%+)', icon: '⭐' },
      goodScore: { xp: 8, label: 'Good Score (60%+)', icon: '👍' },
      completed: { xp: 10, label: 'Assessment Completed', icon: '✅' },
    },
  },
  note: {
    basePerMinute: 2,
    maxBase: 20,
    completionBonus: 5,
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

      // 7. Check for badges
      await this.checkBadges(data.userId, data, breakdown);

    } catch (error) {
      console.error('Error processing activity rewards:', error);
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
   * Award XP to database
   */
  private async awardXP(userId: string, amount: number, source: string, referenceId: string): Promise<void> {
    try {
      await this.supabase.rpc('award_xp', {
        p_user_id: userId,
        p_xp_amount: amount,
        p_source: source,
        p_source_id: referenceId,
        p_description: `${source} completed`,
      });
    } catch (error) {
      console.error('Error awarding XP:', error);
    }
  }

  /**
   * Update daily goals progress
   */
  private async updateDailyGoals(data: ActivityData, breakdown: RewardBreakdown): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    try {
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
      const { data } = await this.supabase.rpc('update_streak', { p_user_id: userId });

      if (data) {
        breakdown.streakUpdated = true;
        breakdown.newStreakDays = data.current_streak || 0;

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
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  }

  /**
   * Update league XP
   */
  private async updateLeagueXP(userId: string, xp: number, breakdown: RewardBreakdown): Promise<void> {
    try {
      const { data } = await this.supabase.rpc('add_league_xp', { p_user_id: userId, p_xp: xp });

      if (data && data.length > 0) {
        breakdown.leagueXPAdded = xp;
        breakdown.newLeagueRank = data[0].new_rank;
      }
    } catch (error) {
      // League might not be set up - that's okay
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
