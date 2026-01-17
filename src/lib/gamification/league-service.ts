/**
 * League Service
 * Handles league/division system with weekly competitions
 */

import { createClient } from '@/lib/supabase/client';

export interface League {
  id: string;
  name: string;
  tier: number;
  icon: string;
  color: string;
  min_xp_to_enter: number;
  promotion_slots: number;
  demotion_slots: number;
}

export interface LeagueGroup {
  id: string;
  league_id: string;
  week_start: string;
  week_end: string;
  max_members: number;
  is_active: boolean;
}

export interface LeagueMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  weekly_xp: number;
  rank: number;
  is_current_user: boolean;
}

export interface UserLeagueProfile {
  id: string;
  user_id: string;
  current_league_id: string | null;
  current_group_id: string | null;
  total_weeks_participated: number;
  total_promotions: number;
  total_demotions: number;
  highest_league_tier: number;
  total_first_places: number;
  total_podium_finishes: number;
  league_notifications: boolean;
}

export interface LeagueInfo {
  group_id: string;
  league_id: string;
  league_name: string;
  league_tier: number;
  league_icon: string;
  league_color: string;
}

export interface LeagueXPResult {
  new_weekly_xp: number;
  new_rank: number;
  total_in_group: number;
}

export class LeagueService {
  private supabase = createClient();

  /**
   * Get all leagues
   */
  async getLeagues(): Promise<League[]> {
    const { data, error } = await this.supabase
      .from('leagues')
      .select('*')
      .order('tier');

    if (error) {
      console.error('Error fetching leagues:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get league by tier
   */
  async getLeagueByTier(tier: number): Promise<League | null> {
    const { data, error } = await this.supabase
      .from('leagues')
      .select('*')
      .eq('tier', tier)
      .single();

    if (error) {
      console.error('Error fetching league:', error);
      return null;
    }

    return data;
  }

  /**
   * Join or get current league
   */
  async joinLeague(userId: string): Promise<LeagueInfo | null> {
    const { data, error } = await this.supabase.rpc('join_league', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error joining league:', error);
      return null;
    }

    if (data && data.length > 0) {
      return data[0];
    }

    return null;
  }

  /**
   * Add XP to weekly total
   */
  async addWeeklyXP(userId: string, xp: number): Promise<LeagueXPResult | null> {
    const { data, error } = await this.supabase.rpc('add_league_xp', {
      p_user_id: userId,
      p_xp: xp,
    });

    if (error) {
      console.error('Error adding league XP:', error);
      return null;
    }

    if (data && data.length > 0) {
      return data[0];
    }

    return null;
  }

  /**
   * Get league leaderboard for user's current group
   */
  async getLeaderboard(userId: string): Promise<LeagueMember[]> {
    const { data, error } = await this.supabase.rpc('get_league_leaderboard', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get user's league profile
   */
  async getUserProfile(userId: string): Promise<UserLeagueProfile | null> {
    const { data, error } = await this.supabase
      .from('user_league_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user profile:', error);
    }

    return data;
  }

  /**
   * Get current week info
   */
  getWeekInfo(): { weekStart: Date; weekEnd: Date; daysRemaining: number; hoursRemaining: number } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const msRemaining = weekEnd.getTime() - now.getTime();
    const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
    const daysRemaining = Math.floor(hoursRemaining / 24);
    
    return { weekStart, weekEnd, daysRemaining, hoursRemaining: hoursRemaining % 24 };
  }

  /**
   * Get promotion/demotion zone info
   */
  getZoneInfo(
    rank: number,
    totalMembers: number,
    league: League
  ): {
    zone: 'promotion' | 'safe' | 'demotion';
    label: string;
    color: string;
  } {
    if (league.tier === 11) {
      // Legend league - no promotion
      if (rank <= 3) {
        return { zone: 'promotion', label: 'Top 3', color: '#FFD700' };
      }
      if (rank > totalMembers - league.demotion_slots) {
        return { zone: 'demotion', label: 'Demotion Zone', color: '#EF4444' };
      }
      return { zone: 'safe', label: 'Safe', color: '#22C55E' };
    }

    if (rank <= league.promotion_slots) {
      return { zone: 'promotion', label: 'Promotion Zone', color: '#22C55E' };
    }
    
    if (league.tier > 1 && rank > totalMembers - league.demotion_slots) {
      return { zone: 'demotion', label: 'Demotion Zone', color: '#EF4444' };
    }
    
    return { zone: 'safe', label: 'Safe Zone', color: '#3B82F6' };
  }

  /**
   * Get rank badge info
   */
  getRankBadge(rank: number): { icon: string; color: string } | null {
    switch (rank) {
      case 1:
        return { icon: '🥇', color: '#FFD700' };
      case 2:
        return { icon: '🥈', color: '#C0C0C0' };
      case 3:
        return { icon: '🥉', color: '#CD7F32' };
      default:
        return null;
    }
  }

  /**
   * Format XP for display
   */
  formatXP(xp: number): string {
    if (xp >= 1000) {
      return `${(xp / 1000).toFixed(1)}k`;
    }
    return xp.toString();
  }
}

// Export singleton
export const leagueService = new LeagueService();
