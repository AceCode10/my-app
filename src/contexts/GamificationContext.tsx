'use client';

/**
 * Gamification Context Provider
 * Wraps the app with gamification state and celebration components
 * Enhanced with real-time subscriptions for instant reward feedback
 */

import { createContext, useContext, useEffect, useCallback, ReactNode, useState } from 'react';
import { useGamificationStore } from '@/lib/gamification/stores/gamification-store';
import { soundManager } from '@/lib/gamification/sound-manager';
import { XPGainOverlay } from '@/components/gamification/animations/xp-gain-overlay';
import { LevelUpModal } from '@/components/gamification/animations/level-up-modal';
import { BadgeUnlockModal } from '@/components/gamification/animations/badge-unlock-modal';
import { StreakCelebration } from '@/components/gamification/animations/streak-celebration';
import { AchievementToastContainer, addToast } from '@/components/gamification/animations/achievement-toast';
import { XPPopupContainer, showXPPopup, xpPopup, type XPBonus } from '@/components/gamification/animations/xp-popup';
import { RewardBreakdownModal } from '@/components/gamification/reward-breakdown-modal';
import { useUser } from '@/hooks/use-user';
import { XPService } from '@/lib/gamification/xp-service';
import { StreakService } from '@/lib/gamification/streak-service';
import { BadgeService } from '@/lib/gamification/badge-service';
import { useRealtimeGamification } from '@/hooks/use-realtime-gamification';
import { RewardBreakdown } from '@/lib/gamification/reward-engine';

interface GamificationContextValue {
  // XP actions
  awardXP: (amount: number, source: string, position?: { x: number; y: number }) => void;
  
  // XP popup actions (Duolingo-style)
  showXPPopup: (baseXP: number, bonuses: XPBonus[], source: string, message?: string) => void;
  showSimpleXPPopup: (amount: number, source: string) => void;
  
  // Level actions
  checkLevelUp: (newXP: number) => void;
  
  // Badge actions
  unlockBadge: (badge: { id: string; name: string; description: string; icon: string; rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' }) => void;
  
  // Streak actions
  celebrateStreak: (days: number, title: string, xpReward: number) => void;
  
  // Sound controls
  toggleSound: (enabled?: boolean) => void;
  isSoundEnabled: () => boolean;
  
  // Animation controls
  toggleAnimations: (enabled?: boolean) => void;
  
  // Toast notifications
  showToast: typeof addToast;
  
  // Reward breakdown
  showRewardBreakdown: (breakdown: RewardBreakdown, activityName?: string) => void;
  
  // Real-time refresh
  refreshGamificationData: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

// XP thresholds for levels
function calculateLevel(totalXP: number): { level: number; title: string } {
  if (totalXP < 100) return { level: 1, title: 'Beginner' };
  if (totalXP < 250) return { level: 2, title: 'Beginner' };
  if (totalXP < 500) return { level: 3, title: 'Beginner' };
  if (totalXP < 750) return { level: 4, title: 'Beginner' };
  if (totalXP < 1000) return { level: 5, title: 'Learner' };
  if (totalXP < 1500) return { level: 6, title: 'Learner' };
  if (totalXP < 2000) return { level: 7, title: 'Learner' };
  if (totalXP < 2500) return { level: 8, title: 'Learner' };
  if (totalXP < 3000) return { level: 9, title: 'Learner' };
  if (totalXP < 4000) return { level: 10, title: 'Student' };
  if (totalXP < 5000) return { level: Math.floor(totalXP / 500), title: 'Student' };
  if (totalXP < 10000) return { level: Math.floor(totalXP / 500), title: 'Scholar' };
  if (totalXP < 20000) return { level: Math.floor(totalXP / 500), title: 'Expert' };
  if (totalXP < 50000) return { level: Math.floor(totalXP / 750), title: 'Master' };
  return { level: Math.floor(totalXP / 1000), title: 'Legend' };
}

interface GamificationProviderProps {
  children: ReactNode;
}

export function GamificationProvider({ children }: GamificationProviderProps) {
  const { user } = useUser();
  const store = useGamificationStore();
  
  // Reward breakdown state
  const [rewardBreakdown, setRewardBreakdown] = useState<RewardBreakdown | null>(null);
  const [rewardActivityName, setRewardActivityName] = useState('Activity');
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  // Initialize services
  const xpService = new XPService();
  const streakService = new StreakService();
  const badgeService = new BadgeService();

  // Real-time subscriptions for instant updates
  const { refresh, isInitialized } = useRealtimeGamification({
    userId: user?.id || null,
  });

  // Sync user data with store on mount - with fallback if realtime doesn't initialize
  useEffect(() => {
    if (!user?.id) return;

    // Give realtime hook time to initialize, then fallback to direct fetch
    const timeoutId = setTimeout(async () => {
      if (!isInitialized) {
        console.log('Realtime not initialized, fetching gamification data directly');
        const gamData = await xpService.getUserGamification(user.id);
        if (gamData) {
          const { level, title } = calculateLevel(gamData.total_xp);
          store.setStats({
            totalXP: gamData.total_xp,
            level,
            levelTitle: title,
            currentStreak: gamData.current_streak,
            longestStreak: gamData.longest_streak,
          });
        }
      }
    }, 3000); // Wait 3 seconds for realtime to initialize

    return () => clearTimeout(timeoutId);
  }, [user?.id, isInitialized]);

  // Initialize sound manager
  useEffect(() => {
    soundManager.init();
    soundManager.setEnabled(store.soundEnabled);
  }, [store.soundEnabled]);

  // Award XP with animation
  const awardXP = useCallback((amount: number, source: string, position?: { x: number; y: number }) => {
    if (!user?.id) return;
    
    // Add visual XP gain
    store.addXPGain(amount, source, position);
    
    // Calculate if level up occurred
    const oldLevel = store.level;
    const newXP = store.totalXP + amount;
    const { level: newLevel, title: newTitle } = calculateLevel(newXP);
    
    if (newLevel > oldLevel) {
      // Delay level up to let XP animation play first
      setTimeout(() => {
        store.triggerLevelUp(oldLevel, newLevel, newTitle);
      }, 1000);
    }
    
    // Award XP on server
    xpService.awardXP(user.id, amount, source);
  }, [user?.id, store.level, store.totalXP]);

  // Check for level up
  const checkLevelUp = useCallback((newXP: number) => {
    const oldLevel = store.level;
    const { level: newLevel, title: newTitle } = calculateLevel(newXP);
    
    if (newLevel > oldLevel) {
      store.triggerLevelUp(oldLevel, newLevel, newTitle);
    }
  }, [store.level]);

  // Unlock badge with animation
  const unlockBadge = useCallback((badge: { id: string; name: string; description: string; icon: string; rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' }) => {
    store.triggerBadgeUnlock(badge);
    
    // Award on server
    if (user?.id) {
      badgeService.awardBadge(user.id, badge.id);
    }
  }, [user?.id]);

  // Celebrate streak milestone
  const celebrateStreak = useCallback((days: number, title: string, xpReward: number) => {
    store.triggerStreakMilestone(days, title, xpReward);
    
    // Award XP for streak (with delay to not overlap celebrations)
    if (user?.id && xpReward > 0) {
      setTimeout(() => {
        awardXP(xpReward, 'streak_milestone');
      }, 2000);
    }
  }, [user?.id, awardXP]);

  // Sound controls
  const toggleSound = useCallback((enabled?: boolean) => {
    const newValue = enabled ?? !store.soundEnabled;
    store.setSoundEnabled(newValue);
    soundManager.setEnabled(newValue);
  }, [store.soundEnabled]);

  const isSoundEnabled = useCallback(() => {
    return store.soundEnabled;
  }, [store.soundEnabled]);

  // Animation controls
  const toggleAnimations = useCallback((enabled?: boolean) => {
    const newValue = enabled ?? !store.animationsEnabled;
    store.setAnimationsEnabled(newValue);
  }, [store.animationsEnabled]);

  // Show reward breakdown modal
  const showRewardBreakdown = useCallback((breakdown: RewardBreakdown, activityName?: string) => {
    setRewardBreakdown(breakdown);
    setRewardActivityName(activityName || 'Activity');
    setShowBreakdown(true);
  }, []);

  // Show Duolingo-style XP popup with breakdown
  const showXPPopupWithBreakdown = useCallback((baseXP: number, bonuses: XPBonus[], source: string, message?: string) => {
    xpPopup.withBreakdown(baseXP, bonuses, source, message);
  }, []);

  // Show simple XP popup without breakdown
  const showSimpleXPPopup = useCallback((amount: number, source: string) => {
    xpPopup.simple(amount, source);
  }, []);

  // Refresh gamification data
  const refreshGamificationData = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const value: GamificationContextValue = {
    awardXP,
    showXPPopup: showXPPopupWithBreakdown,
    showSimpleXPPopup,
    checkLevelUp,
    unlockBadge,
    celebrateStreak,
    toggleSound,
    isSoundEnabled,
    toggleAnimations,
    showToast: addToast,
    showRewardBreakdown,
    refreshGamificationData,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
      
      {/* Global celebration components */}
      <XPGainOverlay />
      <XPPopupContainer />
      <LevelUpModal />
      <BadgeUnlockModal />
      <StreakCelebration />
      <AchievementToastContainer position="top-right" />
      
      {/* Reward breakdown modal */}
      <RewardBreakdownModal
        isOpen={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        breakdown={rewardBreakdown}
        activityName={rewardActivityName}
      />
    </GamificationContext.Provider>
  );
}

/**
 * Hook to access gamification context
 */
export function useGamificationContext() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamificationContext must be used within a GamificationProvider');
  }
  return context;
}

/**
 * Convenience hook for awarding XP
 */
export function useAwardXP() {
  const { awardXP } = useGamificationContext();
  return awardXP;
}
