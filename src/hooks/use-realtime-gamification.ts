'use client';

/**
 * Real-time Gamification Hook
 * Subscribes to database changes for instant reward updates
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useGamificationStore } from '@/lib/gamification/stores/gamification-store';
import { soundManager } from '@/lib/gamification/sound-manager';
import { toast } from '@/components/gamification/animations/achievement-toast';
import { triggerConfetti } from '@/components/gamification/animations/confetti-burst';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
// Singleton supabase client — stable reference, safe outside component
const supabase = createClient();

interface RealtimeGamificationOptions {
  userId: string | null;
  onXPChange?: (newXP: number, change: number) => void;
  onLevelUp?: (newLevel: number, title: string) => void;
  onBadgeUnlock?: (badge: { name: string; icon: string }) => void;
  onStreakUpdate?: (newStreak: number) => void;
  onLeagueRankChange?: (newRank: number, direction: 'up' | 'down') => void;
}

export function useRealtimeGamification(options: RealtimeGamificationOptions) {
  const { userId } = options;
  const [isInitialized, setIsInitialized] = useState(false);
  const mountedRef = useRef(true);
  // Store callbacks and options in refs so they don't trigger effect re-runs
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  // Track previous values for change detection
  const prevValues = useRef({
    xp: 0,
    level: 0,
    streak: 0,
    leagueRank: 0,
  });

  // Subscribe to user_gamification changes
  // IMPORTANT: Only depend on `userId`. Using `store` here caused an infinite loop
  // because useGamificationStore() returns a new object on every state change.
  // We use useGamificationStore.getState() inside the effect instead.
  useEffect(() => {
    if (!userId) return;
    mountedRef.current = true;

    // Initial fetch with retry logic (creates record if doesn't exist)
    const fetchInitialData = async (retryCount = 0): Promise<void> => {
      if (!mountedRef.current) return;
      
      // Check if user is still authenticated before fetching
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        // User is logged out, don't attempt to fetch/create records
        return;
      }
      
      try {
        let { data, error } = await supabase
          .from('user_gamification')
          .select('*')
          .eq('user_id', userId)
          .single();

        // If record doesn't exist, create it
        if (error && (error.code === 'PGRST116' || error.code === '406')) {
          console.log('Creating gamification record for user:', userId);
          const { data: newData, error: insertError } = await supabase
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
          
          if (insertError) {
            // If insert fails due to unique constraint, try fetching again
            if (insertError.code === '23505') {
              const { data: existingData } = await supabase
                .from('user_gamification')
                .select('*')
                .eq('user_id', userId)
                .single();
              data = existingData;
            } else {
              // Silently handle all gamification insert errors
              // Empty object {} errors are typically RLS or auth issues during logout
              // Don't retry - just fail silently
              return;
            }
          } else {
            data = newData;
          }
        } else if (error) {
          // Silently handle auth-related errors during logout
          if (!error.message?.includes('JWT') && !error.message?.includes('auth')) {
            console.error('Error fetching gamification data:', error);
          }
          // Retry on failure only if not auth-related
          if (retryCount < MAX_RETRIES && mountedRef.current && 
              !error.message?.includes('JWT') && !error.message?.includes('auth')) {
            setTimeout(() => fetchInitialData(retryCount + 1), RETRY_DELAY * (retryCount + 1));
            return;
          }
        }

        if (data && mountedRef.current) {
          prevValues.current = {
            xp: data.total_xp || 0,
            level: data.xp_level || 1,
            streak: data.current_streak || 0,
            leagueRank: 0,
          };
          
          // Use getState() to avoid making `store` a dependency
          useGamificationStore.getState().setStats({
            totalXP: data.total_xp || 0,
            level: data.xp_level || 1,
            currentStreak: data.current_streak || 0,
            longestStreak: data.longest_streak || 0,
          });
          
          setIsInitialized(true);
        }
      } catch (err) {
        // Silently handle auth-related errors during logout
        if (err && !(err as any).message?.includes('JWT') && !(err as any).message?.includes('auth')) {
          console.error('Error in fetchInitialData:', err);
        }
        // Retry on failure only if not auth-related
        if (retryCount < MAX_RETRIES && mountedRef.current && 
            err && !(err as any).message?.includes('JWT') && !(err as any).message?.includes('auth')) {
          setTimeout(() => fetchInitialData(retryCount + 1), RETRY_DELAY * (retryCount + 1));
        }
      }
    };

    fetchInitialData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`gamification:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_gamification',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const newData = payload.new as {
            total_xp: number;
            xp_level: number;
            current_streak: number;
            longest_streak: number;
          };
          const opts = optionsRef.current;
          const storeActions = useGamificationStore.getState();

          // Check for XP change
          const xpChange = newData.total_xp - prevValues.current.xp;
          if (xpChange > 0) {
            // XP increased - show animation
            storeActions.addXPGain(xpChange, 'Activity completed');
            soundManager.playXPGain(xpChange);
            opts.onXPChange?.(newData.total_xp, xpChange);
          }

          // Check for level up
          if (newData.xp_level > prevValues.current.level) {
            const title = getLevelTitle(newData.xp_level);
            storeActions.triggerLevelUp(prevValues.current.level, newData.xp_level, title);
            opts.onLevelUp?.(newData.xp_level, title);
          }

          // Check for streak change
          if (newData.current_streak !== prevValues.current.streak) {
            if (newData.current_streak > prevValues.current.streak) {
              // Streak increased
              soundManager.play('streak_continue');
              
              // Check milestones
              const milestones = [3, 7, 14, 30, 60, 100, 365];
              if (milestones.includes(newData.current_streak)) {
                storeActions.triggerStreakMilestone(
                  newData.current_streak,
                  getStreakMilestoneTitle(newData.current_streak),
                  getStreakMilestoneXP(newData.current_streak)
                );
              }
            } else if (newData.current_streak === 0 && prevValues.current.streak > 0) {
              // Streak lost
              soundManager.play('streak_lost');
              toast.achievement(
                'Streak Lost 😢',
                `Your ${prevValues.current.streak}-day streak has ended`,
                '💔'
              );
            }
            opts.onStreakUpdate?.(newData.current_streak);
          }

          // Update store
          storeActions.setStats({
            totalXP: newData.total_xp,
            level: newData.xp_level,
            currentStreak: newData.current_streak,
            longestStreak: newData.longest_streak,
          });

          // Update previous values
          prevValues.current = {
            ...prevValues.current,
            xp: newData.total_xp,
            level: newData.xp_level,
            streak: newData.current_streak,
          };
        }
      )
      .subscribe();

    // Subscribe to badge unlocks
    const badgeChannel = supabase
      .channel(`badges:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_badges',
          filter: `user_id=eq.${userId}`,
        },
        async (payload: { new: Record<string, unknown> }) => {
          // Fetch badge details
          const { data: badge } = await supabase
            .from('badges')
            .select('*')
            .eq('id', payload.new.badge_id as string)
            .single();

          if (badge) {
            useGamificationStore.getState().triggerBadgeUnlock({
              id: badge.id,
              name: badge.name,
              description: badge.description,
              icon: badge.icon,
              rarity: badge.rarity || 'common',
            });
            optionsRef.current.onBadgeUnlock?.({ name: badge.name, icon: badge.icon });
          }
        }
      )
      .subscribe();

    // Subscribe to league rank changes
    const leagueChannel = supabase
      .channel(`league:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'league_members',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const newRank = (payload.new as { rank: number }).rank;
          const oldRank = prevValues.current.leagueRank;

          if (oldRank > 0 && newRank !== oldRank) {
            const direction = newRank < oldRank ? 'up' : 'down';
            
            if (direction === 'up') {
              soundManager.play('notification');
              
              // Entering podium
              if (newRank <= 3 && oldRank > 3) {
                triggerConfetti.celebration();
                toast.achievement(
                  'Podium Position! 🏆',
                  `You're now #${newRank} in your league!`,
                  '🎉'
                );
              } else if (newRank === 1) {
                triggerConfetti.fireworks();
                toast.achievement(
                  'League Leader! 👑',
                  'You\'re #1 in your league!',
                  '🥇'
                );
              }
            }

            optionsRef.current.onLeagueRankChange?.(newRank, direction);
          }

          prevValues.current.leagueRank = newRank;
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
      supabase.removeChannel(badgeChannel);
      supabase.removeChannel(leagueChannel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Manual refresh function with retry logic
  const refresh = useCallback(async () => {
    if (!userId) return;

    try {
      let { data, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .single();

      // If record doesn't exist, create it
      if (error && (error.code === 'PGRST116' || error.code === '406')) {
        const { data: newData } = await supabase
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
        data = newData;
      }

      if (data) {
        useGamificationStore.getState().setStats({
          totalXP: data.total_xp || 0,
          level: data.xp_level || 1,
          currentStreak: data.current_streak || 0,
          longestStreak: data.longest_streak || 0,
        });
      }
    } catch (err) {
      console.error('Error refreshing gamification data:', err);
    }
  }, [userId]);

  return { refresh, isInitialized };
}

// Helper functions
function getLevelTitle(level: number): string {
  if (level < 5) return 'Beginner';
  if (level < 10) return 'Learner';
  if (level < 20) return 'Student';
  if (level < 30) return 'Scholar';
  if (level < 40) return 'Expert';
  if (level < 50) return 'Master';
  return 'Legend';
}

function getStreakMilestoneTitle(days: number): string {
  const titles: Record<number, string> = {
    3: 'Getting Started!',
    7: 'Week Warrior!',
    14: 'Two Week Champion!',
    30: 'Monthly Master!',
    60: 'Two Month Hero!',
    100: 'Century Legend!',
    365: 'Year of Excellence!',
  };
  return titles[days] || `${days} Day Streak!`;
}

function getStreakMilestoneXP(days: number): number {
  const xp: Record<number, number> = {
    3: 15,
    7: 50,
    14: 100,
    30: 200,
    60: 400,
    100: 1000,
    365: 5000,
  };
  return xp[days] || 25;
}
