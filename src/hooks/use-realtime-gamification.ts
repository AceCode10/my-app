'use client';

/**
 * Real-time Gamification Hook
 * Subscribes to database changes for instant reward updates
 */

import { useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useGamificationStore } from '@/lib/gamification/stores/gamification-store';
import { soundManager } from '@/lib/gamification/sound-manager';
import { toast } from '@/components/gamification/animations/achievement-toast';
import { triggerConfetti } from '@/components/gamification/animations/confetti-burst';

interface RealtimeGamificationOptions {
  userId: string | null;
  onXPChange?: (newXP: number, change: number) => void;
  onLevelUp?: (newLevel: number, title: string) => void;
  onBadgeUnlock?: (badge: { name: string; icon: string }) => void;
  onStreakUpdate?: (newStreak: number) => void;
  onLeagueRankChange?: (newRank: number, direction: 'up' | 'down') => void;
}

export function useRealtimeGamification(options: RealtimeGamificationOptions) {
  const { userId, onXPChange, onLevelUp, onBadgeUnlock, onStreakUpdate, onLeagueRankChange } = options;
  const store = useGamificationStore();
  const supabase = createClient();
  
  // Track previous values for change detection
  const prevValues = useRef({
    xp: 0,
    level: 0,
    streak: 0,
    leagueRank: 0,
  });

  // Subscribe to user_gamification changes
  useEffect(() => {
    if (!userId) return;

    // Initial fetch (creates record if doesn't exist)
    const fetchInitialData = async () => {
      let { data, error } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', userId)
        .single();

      // If record doesn't exist, create it
      if (error && (error.code === 'PGRST116' || error.code === '406')) {
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
        
        if (!insertError) {
          data = newData;
        }
      }

      if (data) {
        prevValues.current = {
          xp: data.total_xp,
          level: data.xp_level,
          streak: data.current_streak,
          leagueRank: 0,
        };
        
        store.setStats({
          totalXP: data.total_xp,
          level: data.xp_level,
          currentStreak: data.current_streak,
          longestStreak: data.longest_streak,
        });
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
        (payload) => {
          const newData = payload.new as {
            total_xp: number;
            xp_level: number;
            current_streak: number;
            longest_streak: number;
          };

          // Check for XP change
          const xpChange = newData.total_xp - prevValues.current.xp;
          if (xpChange > 0) {
            // XP increased - show animation
            store.addXPGain(xpChange, 'Activity completed');
            soundManager.playXPGain(xpChange);
            onXPChange?.(newData.total_xp, xpChange);
          }

          // Check for level up
          if (newData.xp_level > prevValues.current.level) {
            const title = getLevelTitle(newData.xp_level);
            store.triggerLevelUp(prevValues.current.level, newData.xp_level, title);
            onLevelUp?.(newData.xp_level, title);
          }

          // Check for streak change
          if (newData.current_streak !== prevValues.current.streak) {
            if (newData.current_streak > prevValues.current.streak) {
              // Streak increased
              soundManager.play('streak_continue');
              
              // Check milestones
              const milestones = [3, 7, 14, 30, 60, 100, 365];
              if (milestones.includes(newData.current_streak)) {
                store.triggerStreakMilestone(
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
            onStreakUpdate?.(newData.current_streak);
          }

          // Update store
          store.setStats({
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
        async (payload) => {
          // Fetch badge details
          const { data: badge } = await supabase
            .from('badges')
            .select('*')
            .eq('id', payload.new.badge_id)
            .single();

          if (badge) {
            store.triggerBadgeUnlock({
              id: badge.id,
              name: badge.name,
              description: badge.description,
              icon: badge.icon,
              rarity: badge.rarity || 'common',
            });
            onBadgeUnlock?.({ name: badge.name, icon: badge.icon });
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
        (payload) => {
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

            onLeagueRankChange?.(newRank, direction);
          }

          prevValues.current.leagueRank = newRank;
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(badgeChannel);
      supabase.removeChannel(leagueChannel);
    };
  }, [userId, store, supabase, onXPChange, onLevelUp, onBadgeUnlock, onStreakUpdate, onLeagueRankChange]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('user_gamification')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      store.setStats({
        totalXP: data.total_xp,
        level: data.xp_level,
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
      });
    }
  }, [userId, supabase, store]);

  return { refresh };
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
