'use client';

/**
 * Hook for managing league participation
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from './use-user';
import {
  leagueService,
  League,
  LeagueMember,
  LeagueInfo,
  UserLeagueProfile,
} from '@/lib/gamification/league-service';
import { soundManager } from '@/lib/gamification/sound-manager';
import { triggerConfetti } from '@/components/gamification/animations/confetti-burst';
import { toast } from '@/components/gamification/animations/achievement-toast';

interface UseLeagueReturn {
  // Data
  leagues: League[];
  currentLeague: LeagueInfo | null;
  leaderboard: LeagueMember[];
  userProfile: UserLeagueProfile | null;
  userRank: LeagueMember | null;
  
  // Loading states
  isLoading: boolean;
  isJoining: boolean;
  
  // Week info
  weekInfo: {
    weekStart: Date;
    weekEnd: Date;
    daysRemaining: number;
    hoursRemaining: number;
  };
  
  // Zone info for current user
  zoneInfo: {
    zone: 'promotion' | 'safe' | 'demotion';
    label: string;
    color: string;
  } | null;
  
  // Actions
  joinLeague: () => Promise<void>;
  addXP: (xp: number) => Promise<void>;
  refreshLeaderboard: () => Promise<void>;
  
  // Helpers
  getRankBadge: typeof leagueService.getRankBadge;
  formatXP: typeof leagueService.formatXP;
  getZoneInfo: typeof leagueService.getZoneInfo;
}

export function useLeague(): UseLeagueReturn {
  const { user } = useUser();
  
  const [leagues, setLeagues] = useState<League[]>([]);
  const [currentLeague, setCurrentLeague] = useState<LeagueInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeagueMember[]>([]);
  const [userProfile, setUserProfile] = useState<UserLeagueProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [previousRank, setPreviousRank] = useState<number | null>(null);

  const weekInfo = leagueService.getWeekInfo();

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const leaguesData = await leagueService.getLeagues();
        setLeagues(leaguesData);

        if (user?.id) {
          const [profile, leagueInfo] = await Promise.all([
            leagueService.getUserProfile(user.id),
            leagueService.joinLeague(user.id),
          ]);

          setUserProfile(profile);
          setCurrentLeague(leagueInfo);

          if (leagueInfo) {
            const lb = await leagueService.getLeaderboard(user.id);
            setLeaderboard(lb);
          }
        }
      } catch (error) {
        console.error('Error loading league data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user?.id]);

  // Get current user's rank info
  const userRank = leaderboard.find(m => m.is_current_user) || null;

  // Get zone info for current user
  const currentLeagueData = leagues.find(l => l.id === currentLeague?.league_id);
  const zoneInfo = userRank && currentLeagueData
    ? leagueService.getZoneInfo(userRank.rank, leaderboard.length, currentLeagueData)
    : null;

  // Join league
  const joinLeague = useCallback(async () => {
    if (!user?.id || isJoining) return;

    setIsJoining(true);
    try {
      const leagueInfo = await leagueService.joinLeague(user.id);
      if (leagueInfo) {
        setCurrentLeague(leagueInfo);
        
        const lb = await leagueService.getLeaderboard(user.id);
        setLeaderboard(lb);
        
        soundManager.play('notification');
        toast.achievement('League Joined!', `Welcome to ${leagueInfo.league_name}!`, leagueInfo.league_icon);
      }
    } catch (error) {
      console.error('Error joining league:', error);
    } finally {
      setIsJoining(false);
    }
  }, [user?.id, isJoining]);

  // Add XP and check for rank changes
  const addXP = useCallback(async (xp: number) => {
    if (!user?.id) return;

    try {
      const result = await leagueService.addWeeklyXP(user.id, xp);
      
      if (result) {
        // Refresh leaderboard
        const lb = await leagueService.getLeaderboard(user.id);
        setLeaderboard(lb);

        // Check for rank changes
        if (previousRank !== null && result.new_rank < previousRank) {
          // Rank improved
          soundManager.play('notification');
          
          if (result.new_rank <= 3 && previousRank > 3) {
            // Entered podium
            triggerConfetti.celebration();
            toast.achievement('Podium Position!', `You're now #${result.new_rank} in your league!`, '🏆');
          } else if (result.new_rank === 1) {
            // First place
            triggerConfetti.fireworks();
            toast.achievement('League Leader!', 'You\'re #1 in your league!', '👑');
          }
        }
        
        setPreviousRank(result.new_rank);
      }
    } catch (error) {
      console.error('Error adding league XP:', error);
    }
  }, [user?.id, previousRank]);

  // Refresh leaderboard
  const refreshLeaderboard = useCallback(async () => {
    if (!user?.id) return;

    try {
      const lb = await leagueService.getLeaderboard(user.id);
      setLeaderboard(lb);
    } catch (error) {
      console.error('Error refreshing leaderboard:', error);
    }
  }, [user?.id]);

  return {
    leagues,
    currentLeague,
    leaderboard,
    userProfile,
    userRank,
    isLoading,
    isJoining,
    weekInfo,
    zoneInfo,
    joinLeague,
    addXP,
    refreshLeaderboard,
    getRankBadge: leagueService.getRankBadge,
    formatXP: leagueService.formatXP,
    getZoneInfo: leagueService.getZoneInfo,
  };
}
