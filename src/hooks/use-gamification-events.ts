'use client';

/**
 * Hook for triggering gamification events with UI animations
 * Bridges backend gamification logic with frontend celebration components
 */

import { useCallback } from 'react';
import { useGamificationStore } from '@/lib/gamification/stores/gamification-store';
import { soundManager } from '@/lib/gamification/sound-manager';
import { triggerConfetti } from '@/components/gamification/animations/confetti-burst';
import { toast } from '@/components/gamification/animations/achievement-toast';
import { xpPopup, type XPBonus } from '@/components/gamification/animations/xp-popup';
import { gamificationIntegration, QuizCompletionData, NoteViewData } from '@/lib/gamification/integration';

// Level thresholds
const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, title: 'Beginner' },
  { level: 2, xp: 100, title: 'Beginner' },
  { level: 3, xp: 250, title: 'Beginner' },
  { level: 4, xp: 500, title: 'Beginner' },
  { level: 5, xp: 750, title: 'Learner' },
  { level: 6, xp: 1000, title: 'Learner' },
  { level: 7, xp: 1500, title: 'Learner' },
  { level: 8, xp: 2000, title: 'Student' },
  { level: 9, xp: 2500, title: 'Student' },
  { level: 10, xp: 3000, title: 'Scholar' },
  { level: 15, xp: 5000, title: 'Scholar' },
  { level: 20, xp: 8000, title: 'Expert' },
  { level: 25, xp: 12000, title: 'Expert' },
  { level: 30, xp: 18000, title: 'Master' },
  { level: 40, xp: 30000, title: 'Master' },
  { level: 50, xp: 50000, title: 'Legend' },
];

function calculateLevelFromXP(totalXP: number): { level: number; title: string } {
  let result = LEVEL_THRESHOLDS[0];
  for (const threshold of LEVEL_THRESHOLDS) {
    if (totalXP >= threshold.xp) {
      result = threshold;
    } else {
      break;
    }
  }
  return result;
}

// Streak milestones
const STREAK_MILESTONES = [
  { days: 3, title: 'Getting Started!', xpReward: 15 },
  { days: 7, title: 'One Week Strong!', xpReward: 50 },
  { days: 14, title: 'Two Week Champion!', xpReward: 100 },
  { days: 30, title: 'Monthly Master!', xpReward: 200 },
  { days: 60, title: 'Two Month Hero!', xpReward: 400 },
  { days: 100, title: 'Century Legend!', xpReward: 1000 },
  { days: 365, title: 'Year of Excellence!', xpReward: 5000 },
];

/**
 * Hook for handling gamification events with animations
 */
export function useGamificationEvents() {
  const store = useGamificationStore();

  /**
   * Handle quiz completion with full animations
   */
  const handleQuizComplete = useCallback(async (
    data: QuizCompletionData,
    options?: {
      showToast?: boolean;
      showPopup?: boolean;
      position?: { x: number; y: number };
    }
  ) => {
    const { showToast = false, showPopup = true, position } = options || {};
    
    // Calculate XP earned
    const baseXP = Math.round(data.percentage * 0.5); // 0.5 XP per percentage point
    let totalXP = baseXP;
    
    // Build bonuses array for popup
    const bonuses: XPBonus[] = [];
    
    // Bonuses
    if (data.isPerfectScore) {
      totalXP += 20;
      bonuses.push({ type: 'perfectScore', label: 'Perfect Score!', amount: 20, icon: '🏆' });
    }
    if (data.timeSpentMinutes < 5) {
      totalXP += 10;
      bonuses.push({ type: 'speed', label: 'Speed Bonus', amount: 10, icon: '⚡' });
    }
    if (data.isFirstQuiz) {
      totalXP += 25;
      bonuses.push({ type: 'firstQuiz', label: 'First Quiz!', amount: 25, icon: '🎉' });
    }

    // Get current state before update
    const currentXP = store.totalXP;
    const currentLevel = store.level;

    // Trigger XP animation (floating +XP)
    store.addXPGain(totalXP, 'Quiz completed', position);

    // Show Duolingo-style XP popup
    if (showPopup) {
      xpPopup.withBreakdown(
        baseXP,
        bonuses,
        'Quiz Completed',
        `You scored ${data.percentage}%!`
      );
    }

    // Check for level up
    const newTotalXP = currentXP + totalXP;
    const { level: newLevel, title: newTitle } = calculateLevelFromXP(newTotalXP);
    
    if (newLevel > currentLevel) {
      // Delay level up to let XP popup dismiss first
      setTimeout(() => {
        store.triggerLevelUp(currentLevel, newLevel, newTitle);
      }, 5500);
    }

    // Perfect score celebration
    if (data.isPerfectScore) {
      soundManager.play('perfect_score');
      triggerConfetti.perfectScore();
      
      if (showToast) {
        setTimeout(() => {
          toast.achievement('Perfect Score! 💯', 'You answered every question correctly!', '🏆');
        }, 5500);
      }
    } else {
      soundManager.play('quiz_complete');
      
      // Good score celebration
      if (data.percentage >= 80) {
        triggerConfetti.celebration();
      }
    }

    // Show toast (only if popup is disabled)
    if (showToast && !showPopup && !data.isPerfectScore) {
      toast.xp(totalXP, `Quiz completed with ${data.percentage}% score`);
    }

    // Call backend integration
    await gamificationIntegration.handleQuizCompletion(data);

    return { xpEarned: totalXP, newLevel, newTitle };
  }, [store]);

  /**
   * Handle correct answer during quiz
   */
  const handleCorrectAnswer = useCallback((position?: { x: number; y: number }) => {
    soundManager.play('answer_correct');
    
    // Small XP gain for correct answer
    store.addXPGain(5, 'Correct answer', position);
  }, [store]);

  /**
   * Handle incorrect answer during quiz
   */
  const handleIncorrectAnswer = useCallback(() => {
    soundManager.play('answer_incorrect');
  }, []);

  /**
   * Handle note view completion
   */
  const handleNoteComplete = useCallback(async (
    data: NoteViewData,
    options?: { showToast?: boolean; showPopup?: boolean }
  ) => {
    const { showToast = false, showPopup = true } = options || {};
    
    // Calculate base XP
    const baseXP = Math.round(data.timeSpentMinutes * 2);
    let totalXP = baseXP;
    
    // Build bonuses array
    const bonuses: XPBonus[] = [];
    
    if (data.completionPercentage >= 80) {
      totalXP += 10;
      bonuses.push({ type: 'completion', label: 'Completed Reading', amount: 10, icon: '📖' });
    }
    if (data.isFirstNote) {
      totalXP += 15;
      bonuses.push({ type: 'firstNote', label: 'First Note!', amount: 15, icon: '🎉' });
    }

    // Trigger floating XP animation
    store.addXPGain(totalXP, 'Notes completed');

    // Show Duolingo-style XP popup
    if (showPopup) {
      xpPopup.withBreakdown(
        baseXP,
        bonuses,
        'Notes Completed',
        'Great job studying!'
      );
    }

    if (showToast && !showPopup) {
      toast.xp(totalXP, 'Finished reading notes');
    }

    // Call backend
    await gamificationIntegration.handleNoteView(data);

    return { xpEarned: totalXP };
  }, [store]);

  /**
   * Handle streak update with celebrations
   */
  const handleStreakUpdate = useCallback((newStreakDays: number, previousStreak: number) => {
    // Check if this is a new streak day
    if (newStreakDays > previousStreak) {
      soundManager.play('streak_continue');
      
      // Check for milestone
      const milestone = STREAK_MILESTONES.find(m => m.days === newStreakDays);
      if (milestone) {
        setTimeout(() => {
          store.triggerStreakMilestone(milestone.days, milestone.title, milestone.xpReward);
        }, 1000);
      } else {
        toast.streak(newStreakDays);
      }
    }

    store.setStats({ currentStreak: newStreakDays });
  }, [store]);

  /**
   * Handle streak lost
   */
  const handleStreakLost = useCallback((previousStreak: number) => {
    soundManager.play('streak_lost');
    
    toast.achievement(
      'Streak Lost 😢',
      `Your ${previousStreak}-day streak has ended. Start a new one today!`,
      '💔'
    );

    store.setStats({ currentStreak: 0 });
  }, [store]);

  /**
   * Handle badge unlock
   */
  const handleBadgeUnlock = useCallback((badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  }) => {
    store.triggerBadgeUnlock(badge);
  }, [store]);

  /**
   * Handle daily goal completion
   */
  const handleGoalComplete = useCallback((goalName: string, xpBonus: number, showPopup: boolean = true) => {
    soundManager.play('goal_complete');
    triggerConfetti.goalComplete();
    
    store.addXPGain(xpBonus, 'Daily goal completed');
    
    if (showPopup) {
      xpPopup.withBreakdown(
        xpBonus,
        [],
        'Goal Completed!',
        goalName
      );
    } else {
      toast.goal(goalName);
    }
  }, [store]);

  /**
   * Generic XP award with animation
   * @param showPopup - If true, shows Duolingo-style popup. If false, just shows floating +XP
   */
  const awardXP = useCallback((
    amount: number,
    source: string,
    options?: {
      position?: { x: number; y: number };
      showPopup?: boolean;
      message?: string;
      bonuses?: XPBonus[];
    }
  ) => {
    const { position, showPopup = false, message, bonuses = [] } = options || {};
    
    store.addXPGain(amount, source, position);
    soundManager.playXPGain(amount);
    
    if (showPopup) {
      const baseXP = amount - bonuses.reduce((sum, b) => sum + b.amount, 0);
      xpPopup.withBreakdown(baseXP, bonuses, source, message);
    }
  }, [store]);

  /**
   * Play celebration for special achievements
   */
  const celebrate = useCallback((type: 'small' | 'medium' | 'large' | 'epic') => {
    switch (type) {
      case 'small':
        triggerConfetti.celebration();
        break;
      case 'medium':
        triggerConfetti.badge();
        break;
      case 'large':
        triggerConfetti.levelUp();
        break;
      case 'epic':
        triggerConfetti.fireworks();
        break;
    }
  }, []);

  return {
    // Quiz events
    handleQuizComplete,
    handleCorrectAnswer,
    handleIncorrectAnswer,
    
    // Note events
    handleNoteComplete,
    
    // Streak events
    handleStreakUpdate,
    handleStreakLost,
    
    // Badge events
    handleBadgeUnlock,
    
    // Goal events
    handleGoalComplete,
    
    // Generic actions
    awardXP,
    celebrate,
    
    // Direct store access
    store,
  };
}

export type GamificationEvents = ReturnType<typeof useGamificationEvents>;
