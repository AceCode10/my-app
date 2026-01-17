'use client';

/**
 * Hook for managing daily goals
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from './use-user';
import { 
  dailyGoalsService, 
  DailyGoal, 
  DailyQuest, 
  GoalPreset, 
  UserGoalPreferences 
} from '@/lib/gamification/daily-goals-service';
import { useGamificationStore } from '@/lib/gamification/stores/gamification-store';
import { soundManager } from '@/lib/gamification/sound-manager';
import { triggerConfetti } from '@/components/gamification/animations/confetti-burst';
import { toast } from '@/components/gamification/animations/achievement-toast';

interface UseDailyGoalsReturn {
  // Data
  goals: DailyGoal[];
  quests: DailyQuest[];
  presets: GoalPreset[];
  preferences: UserGoalPreferences | null;
  primaryGoal: DailyGoal | null;
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  
  // Stats
  stats: {
    todayCompleted: number;
    todayTotal: number;
    weekCompleted: number;
    totalCompleted: number;
    currentStreak: number;
    longestStreak: number;
  };
  
  // Actions
  refreshGoals: () => Promise<void>;
  updateGoalProgress: (goalType: 'xp' | 'questions' | 'time', increment: number) => Promise<void>;
  updateQuestProgress: (questType: string, progress: number) => Promise<void>;
  setDifficulty: (difficulty: 'casual' | 'regular' | 'serious' | 'intense') => Promise<void>;
  setPrimaryGoalType: (goalType: 'xp' | 'questions' | 'time') => Promise<void>;
  
  // Helpers
  getGoalProgress: (goal: DailyGoal) => number;
  getGoalTypeInfo: typeof dailyGoalsService.getGoalTypeInfo;
}

export function useDailyGoals(): UseDailyGoalsReturn {
  const { user } = useUser();
  const store = useGamificationStore();
  
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [presets, setPresets] = useState<GoalPreset[]>([]);
  const [preferences, setPreferences] = useState<UserGoalPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [stats, setStats] = useState({
    todayCompleted: 0,
    todayTotal: 0,
    weekCompleted: 0,
    totalCompleted: 0,
    currentStreak: 0,
    longestStreak: 0,
  });

  // Load initial data
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [goalsData, questsData, presetsData, prefsData, statsData] = await Promise.all([
          dailyGoalsService.getTodayGoals(user.id),
          dailyGoalsService.getTodayQuests(user.id),
          dailyGoalsService.getGoalPresets(),
          dailyGoalsService.getUserPreferences(user.id),
          dailyGoalsService.getGoalStats(user.id),
        ]);

        setGoals(goalsData);
        setQuests(questsData);
        setPresets(presetsData);
        setPreferences(prefsData);
        setStats(statsData);
      } catch (error) {
        console.error('Error loading daily goals:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  // Get primary goal based on preferences
  const primaryGoal = goals.find(
    g => g.goal_type === (preferences?.primary_goal_type || 'xp')
  ) || goals[0] || null;

  // Refresh goals
  const refreshGoals = useCallback(async () => {
    if (!user?.id) return;

    const [goalsData, questsData, statsData] = await Promise.all([
      dailyGoalsService.getTodayGoals(user.id),
      dailyGoalsService.getTodayQuests(user.id),
      dailyGoalsService.getGoalStats(user.id),
    ]);

    setGoals(goalsData);
    setQuests(questsData);
    setStats(statsData);
  }, [user?.id]);

  // Update goal progress
  const updateGoalProgress = useCallback(async (
    goalType: 'xp' | 'questions' | 'time',
    increment: number
  ) => {
    if (!user?.id || isUpdating) return;

    setIsUpdating(true);
    try {
      const result = await dailyGoalsService.updateProgress(user.id, goalType, increment);

      if (result) {
        // Update local state
        setGoals(prev => prev.map(g => 
          g.goal_type === goalType
            ? { ...g, current_value: result.new_value, is_completed: result.new_value >= result.target }
            : g
        ));

        // Handle completion celebration
        if (result.just_completed) {
          soundManager.play('goal_complete');
          triggerConfetti.goalComplete();
          
          const info = dailyGoalsService.getGoalTypeInfo(goalType);
          toast.goal(`${info.label} completed! +${result.xp_bonus} XP bonus`);
          
          // Award XP bonus
          if (result.xp_bonus > 0) {
            store.addXPGain(result.xp_bonus, 'Daily goal completed');
          }

          // Check if all goals completed
          const allCompleted = await dailyGoalsService.areAllGoalsCompleted(user.id);
          if (allCompleted) {
            setTimeout(() => {
              triggerConfetti.celebration();
              toast.achievement('All Goals Complete! 🎯', 'You\'ve crushed all your daily goals!', '🏆');
            }, 1500);
          }

          // Refresh stats
          const newStats = await dailyGoalsService.getGoalStats(user.id);
          setStats(newStats);
        }
      }
    } catch (error) {
      console.error('Error updating goal progress:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [user?.id, isUpdating, store]);

  // Update quest progress
  const updateQuestProgress = useCallback(async (
    questType: string,
    progress: number
  ) => {
    if (!user?.id) return;

    try {
      const result = await dailyGoalsService.updateQuestProgress(user.id, questType, progress);

      if (result?.completed) {
        // Update local state
        setQuests(prev => prev.map(q =>
          q.quest_type === questType
            ? { ...q, is_completed: true, current_progress: q.requirement_value }
            : q
        ));

        // Celebrate
        soundManager.play('notification');
        
        const quest = quests.find(q => q.quest_type === questType);
        if (quest) {
          toast.achievement('Quest Complete!', quest.title, quest.icon);
          store.addXPGain(result.xpReward, `Quest: ${quest.title}`);
        }
      }
    } catch (error) {
      console.error('Error updating quest progress:', error);
    }
  }, [user?.id, quests, store]);

  // Set difficulty preference
  const setDifficulty = useCallback(async (
    difficulty: 'casual' | 'regular' | 'serious' | 'intense'
  ) => {
    if (!user?.id) return;

    const updated = await dailyGoalsService.setUserPreferences(user.id, {
      preferred_difficulty: difficulty,
    });

    if (updated) {
      setPreferences(updated);
      // Refresh goals to apply new difficulty
      await refreshGoals();
    }
  }, [user?.id, refreshGoals]);

  // Set primary goal type
  const setPrimaryGoalType = useCallback(async (
    goalType: 'xp' | 'questions' | 'time'
  ) => {
    if (!user?.id) return;

    const updated = await dailyGoalsService.setUserPreferences(user.id, {
      primary_goal_type: goalType,
    });

    if (updated) {
      setPreferences(updated);
    }
  }, [user?.id]);

  // Calculate progress percentage
  const getGoalProgress = useCallback((goal: DailyGoal): number => {
    return dailyGoalsService.calculateProgress(goal.current_value, goal.target_value);
  }, []);

  return {
    goals,
    quests,
    presets,
    preferences,
    primaryGoal,
    isLoading,
    isUpdating,
    stats,
    refreshGoals,
    updateGoalProgress,
    updateQuestProgress,
    setDifficulty,
    setPrimaryGoalType,
    getGoalProgress,
    getGoalTypeInfo: dailyGoalsService.getGoalTypeInfo,
  };
}
