'use client';

/**
 * Activity Rewards Hook
 * Simplified hook for processing topical questions, papers, and assessments
 * No currency/shop - just XP, streaks, levels, and badges
 */

import { useCallback, useState } from 'react';
import { useUser } from './use-user';
import { rewardEngine, RewardBreakdown, ActivityData } from '@/lib/gamification/reward-engine';
import { useGamificationStore } from '@/lib/gamification/stores/gamification-store';
import { soundManager } from '@/lib/gamification/sound-manager';
import { triggerConfetti } from '@/components/gamification/animations/confetti-burst';

interface TopicalQuestionInput {
  questionId: string;
  subjectName?: string;
  topicName?: string;
  isCorrect: boolean;
  timeSpentMinutes: number;
}

interface ExamPaperInput {
  paperId: string;
  paperName?: string;
  score: number;
  maxScore: number;
  questionsAnswered: number;
  correctAnswers: number;
  timeSpentMinutes: number;
  isFirstPaper?: boolean;
}

interface AssessmentInput {
  assessmentId: string;
  assessmentName?: string;
  score: number;
  maxScore: number;
  questionsAnswered: number;
  correctAnswers: number;
  timeSpentMinutes: number;
  isFirstAssessment?: boolean;
}

interface NoteCompletionInput {
  noteId: string;
  noteName?: string;
  timeSpentMinutes: number;
}

export function useActivityRewards() {
  const { user } = useUser();
  const store = useGamificationStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBreakdown, setLastBreakdown] = useState<RewardBreakdown | null>(null);

  /**
   * Process a topical question answer
   */
  const processTopicalQuestion = useCallback(async (data: TopicalQuestionInput): Promise<RewardBreakdown> => {
    if (!user?.id) return createEmptyBreakdown();

    setIsProcessing(true);

    try {
      const activityData: ActivityData = {
        userId: user.id,
        activityType: 'topical_question',
        questionsAnswered: 1,
        correctAnswers: data.isCorrect ? 1 : 0,
        percentage: data.isCorrect ? 100 : 0,
        isPerfectScore: data.isCorrect,
        timeSpentMinutes: data.timeSpentMinutes,
        referenceId: data.questionId,
        subjectName: data.subjectName,
        topicName: data.topicName,
      };

      const breakdown = await rewardEngine.processActivity(activityData);
      triggerRewardAnimations(breakdown, store);
      setLastBreakdown(breakdown);
      return breakdown;
    } catch (error) {
      console.error('Error processing topical question:', error);
      return createEmptyBreakdown();
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id, store]);

  /**
   * Process exam paper completion
   */
  const processExamPaper = useCallback(async (data: ExamPaperInput): Promise<RewardBreakdown> => {
    if (!user?.id) return createEmptyBreakdown();

    setIsProcessing(true);

    try {
      const percentage = Math.round((data.score / data.maxScore) * 100);
      
      const activityData: ActivityData = {
        userId: user.id,
        activityType: 'exam_paper',
        score: data.score,
        maxScore: data.maxScore,
        percentage,
        questionsAnswered: data.questionsAnswered,
        correctAnswers: data.correctAnswers,
        isPerfectScore: percentage === 100,
        isFirstOfType: data.isFirstPaper,
        timeSpentMinutes: data.timeSpentMinutes,
        referenceId: data.paperId,
        referenceName: data.paperName,
      };

      const breakdown = await rewardEngine.processActivity(activityData);
      triggerRewardAnimations(breakdown, store);
      setLastBreakdown(breakdown);
      return breakdown;
    } catch (error) {
      console.error('Error processing exam paper:', error);
      return createEmptyBreakdown();
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id, store]);

  /**
   * Process assessment completion
   */
  const processAssessment = useCallback(async (data: AssessmentInput): Promise<RewardBreakdown> => {
    if (!user?.id) return createEmptyBreakdown();

    setIsProcessing(true);

    try {
      const percentage = Math.round((data.score / data.maxScore) * 100);
      
      const activityData: ActivityData = {
        userId: user.id,
        activityType: 'assessment',
        score: data.score,
        maxScore: data.maxScore,
        percentage,
        questionsAnswered: data.questionsAnswered,
        correctAnswers: data.correctAnswers,
        isPerfectScore: percentage === 100,
        isFirstOfType: data.isFirstAssessment,
        timeSpentMinutes: data.timeSpentMinutes,
        referenceId: data.assessmentId,
        referenceName: data.assessmentName,
      };

      const breakdown = await rewardEngine.processActivity(activityData);
      triggerRewardAnimations(breakdown, store);
      setLastBreakdown(breakdown);
      return breakdown;
    } catch (error) {
      console.error('Error processing assessment:', error);
      return createEmptyBreakdown();
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id, store]);

  /**
   * Process note reading completion
   */
  const processNoteCompletion = useCallback(async (data: NoteCompletionInput): Promise<RewardBreakdown> => {
    if (!user?.id) return createEmptyBreakdown();

    setIsProcessing(true);

    try {
      const activityData: ActivityData = {
        userId: user.id,
        activityType: 'note',
        timeSpentMinutes: data.timeSpentMinutes,
        referenceId: data.noteId,
        referenceName: data.noteName,
      };

      const breakdown = await rewardEngine.processActivity(activityData);
      triggerRewardAnimations(breakdown, store);
      setLastBreakdown(breakdown);
      return breakdown;
    } catch (error) {
      console.error('Error processing note completion:', error);
      return createEmptyBreakdown();
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id, store]);

  const clearLastBreakdown = useCallback(() => {
    setLastBreakdown(null);
  }, []);

  return {
    processTopicalQuestion,
    processExamPaper,
    processAssessment,
    processNoteCompletion,
    isProcessing,
    lastBreakdown,
    clearLastBreakdown,
  };
}

type GamificationStore = ReturnType<typeof useGamificationStore>;

/**
 * Trigger appropriate animations based on rewards
 */
function triggerRewardAnimations(breakdown: RewardBreakdown, store: GamificationStore): void {
  // XP animation
  if (breakdown.totalXP > 0) {
    store.addXPGain(breakdown.totalXP, 'Activity completed');
    soundManager.playXPGain(breakdown.totalXP);
  }

  // Level up
  if (breakdown.leveledUp && breakdown.newLevel && breakdown.newTitle) {
    setTimeout(() => {
      store.triggerLevelUp(breakdown.newLevel! - 1, breakdown.newLevel!, breakdown.newTitle!);
    }, 1500);
  }

  // Badge unlocks
  if (breakdown.badgesUnlocked.length > 0) {
    breakdown.badgesUnlocked.forEach((badge, index) => {
      setTimeout(() => {
        store.triggerBadgeUnlock(badge);
      }, 2000 + index * 1500);
    });
  }

  // Streak milestone
  if (breakdown.streakMilestone) {
    setTimeout(() => {
      store.triggerStreakMilestone(
        breakdown.streakMilestone!.days,
        breakdown.streakMilestone!.title,
        breakdown.streakMilestone!.xpReward
      );
    }, 2500);
  }

  // Perfect score celebration
  const hasPerfectBonus = breakdown.bonuses.some(b => b.type === 'perfectScore');
  if (hasPerfectBonus) {
    soundManager.play('perfect_score');
    triggerConfetti.perfectScore();
  } else if (breakdown.totalXP >= 30) {
    triggerConfetti.celebration();
  }

  // Daily goal completion celebration
  const completedGoals = breakdown.dailyGoalProgress.filter(g => g.justCompleted);
  if (completedGoals.length > 0) {
    setTimeout(() => {
      soundManager.play('goal_complete');
      triggerConfetti.goalComplete();
    }, 1000);
  }
}

/**
 * Create empty breakdown for error cases
 */
function createEmptyBreakdown(): RewardBreakdown {
  return {
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
}
