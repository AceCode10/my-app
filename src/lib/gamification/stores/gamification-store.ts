/**
 * Zustand store for gamification state management
 * Handles XP, streaks, badges, and celebration triggers
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface XPGainEvent {
  id: string;
  amount: number;
  source: string;
  position?: { x: number; y: number };
  timestamp: number;
}

export interface LevelUpEvent {
  oldLevel: number;
  newLevel: number;
  newTitle: string;
  timestamp: number;
}

export interface BadgeUnlockEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  timestamp: number;
}

export interface StreakMilestoneEvent {
  days: number;
  title: string;
  xpReward: number;
  timestamp: number;
}

interface GamificationState {
  // Current user stats
  totalXP: number;
  level: number;
  levelTitle: string;
  currentStreak: number;
  longestStreak: number;
  
  // Celebration queue
  xpGains: XPGainEvent[];
  levelUpEvent: LevelUpEvent | null;
  badgeUnlockEvent: BadgeUnlockEvent | null;
  streakMilestoneEvent: StreakMilestoneEvent | null;
  
  // Settings
  soundEnabled: boolean;
  animationsEnabled: boolean;
  celebrationIntensity: 'minimal' | 'normal' | 'maximum';
  
  // Actions
  setStats: (stats: Partial<Pick<GamificationState, 'totalXP' | 'level' | 'levelTitle' | 'currentStreak' | 'longestStreak'>>) => void;
  
  // XP actions
  addXPGain: (amount: number, source: string, position?: { x: number; y: number }) => void;
  removeXPGain: (id: string) => void;
  clearXPGains: () => void;
  
  // Celebration actions
  triggerLevelUp: (oldLevel: number, newLevel: number, newTitle: string) => void;
  dismissLevelUp: () => void;
  
  triggerBadgeUnlock: (badge: Omit<BadgeUnlockEvent, 'timestamp'>) => void;
  dismissBadgeUnlock: () => void;
  
  triggerStreakMilestone: (days: number, title: string, xpReward: number) => void;
  dismissStreakMilestone: () => void;
  
  // Settings actions
  setSoundEnabled: (enabled: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setCelebrationIntensity: (intensity: 'minimal' | 'normal' | 'maximum') => void;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      totalXP: 0,
      level: 1,
      levelTitle: 'Beginner',
      currentStreak: 0,
      longestStreak: 0,
      
      xpGains: [],
      levelUpEvent: null,
      badgeUnlockEvent: null,
      streakMilestoneEvent: null,
      
      soundEnabled: true,
      animationsEnabled: true,
      celebrationIntensity: 'normal',
      
      // Set stats from server
      setStats: (stats) => set((state) => ({ ...state, ...stats })),
      
      // XP gain management
      addXPGain: (amount, source, position) => {
        const id = `xp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const event: XPGainEvent = {
          id,
          amount,
          source,
          position,
          timestamp: Date.now(),
        };
        
        set((state) => ({
          xpGains: [...state.xpGains, event],
          totalXP: state.totalXP + amount,
        }));
        
        // Auto-remove after animation completes
        setTimeout(() => {
          get().removeXPGain(id);
        }, 2000);
      },
      
      removeXPGain: (id) => set((state) => ({
        xpGains: state.xpGains.filter((gain) => gain.id !== id),
      })),
      
      clearXPGains: () => set({ xpGains: [] }),
      
      // Level up
      triggerLevelUp: (oldLevel, newLevel, newTitle) => {
        set({
          levelUpEvent: {
            oldLevel,
            newLevel,
            newTitle,
            timestamp: Date.now(),
          },
          level: newLevel,
          levelTitle: newTitle,
        });
      },
      
      dismissLevelUp: () => set({ levelUpEvent: null }),
      
      // Badge unlock
      triggerBadgeUnlock: (badge) => {
        set({
          badgeUnlockEvent: {
            ...badge,
            timestamp: Date.now(),
          },
        });
      },
      
      dismissBadgeUnlock: () => set({ badgeUnlockEvent: null }),
      
      // Streak milestone
      triggerStreakMilestone: (days, title, xpReward) => {
        set({
          streakMilestoneEvent: {
            days,
            title,
            xpReward,
            timestamp: Date.now(),
          },
          currentStreak: days,
        });
      },
      
      dismissStreakMilestone: () => set({ streakMilestoneEvent: null }),
      
      // Settings
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setAnimationsEnabled: (enabled) => set({ animationsEnabled: enabled }),
      setCelebrationIntensity: (intensity) => set({ celebrationIntensity: intensity }),
    }),
    {
      name: 'gamification-settings',
      partialize: (state) => ({
        soundEnabled: state.soundEnabled,
        animationsEnabled: state.animationsEnabled,
        celebrationIntensity: state.celebrationIntensity,
      }),
    }
  )
);

// Selectors for common use cases
export const selectXPGains = (state: GamificationState) => state.xpGains;
export const selectLevelUpEvent = (state: GamificationState) => state.levelUpEvent;
export const selectBadgeUnlockEvent = (state: GamificationState) => state.badgeUnlockEvent;
export const selectStreakMilestoneEvent = (state: GamificationState) => state.streakMilestoneEvent;
export const selectSoundEnabled = (state: GamificationState) => state.soundEnabled;
export const selectAnimationsEnabled = (state: GamificationState) => state.animationsEnabled;
