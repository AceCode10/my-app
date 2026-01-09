import { createClient } from '@/lib/supabase/client';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'xp' | 'streak' | 'quiz' | 'note' | 'special';
  requirement_type: string;
  requirement_value: number;
  points: number;
  is_active: boolean;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  is_displayed: boolean;
  badge: Badge;
}

export interface BadgeCategory {
  name: string;
  icon: string;
  description: string;
  badges: Badge[];
}

export class BadgeService {
  private supabase = createClient();

  async getAllBadges(): Promise<Badge[]> {
    try {
      const { data, error } = await this.supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)
        .order('points', { ascending: true });

      if (error) {
        console.error('Error fetching badges:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAllBadges:', error);
      return [];
    }
  }

  async getUserBadges(userId: string, displayedOnly = false): Promise<UserBadge[]> {
    try {
      let query = this.supabase
        .from('user_badges')
        .select(`
          *,
          badge:badges(*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (displayedOnly) {
        query = query.eq('is_displayed', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user badges:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserBadges:', error);
      return [];
    }
  }

  async getBadgesByCategory(userId: string): Promise<BadgeCategory[]> {
    const allBadges = await this.getAllBadges();
    const userBadges = await this.getUserBadges(userId);
    const earnedBadgeIds = new Set(userBadges.map(ub => ub.badge_id));

    const categories: Record<string, BadgeCategory> = {
      xp: {
        name: 'XP Achievements',
        icon: '⭐',
        description: 'Badges earned through XP milestones',
        badges: []
      },
      streak: {
        name: 'Streak Master',
        icon: '🔥',
        description: 'Badges for maintaining learning streaks',
        badges: []
      },
      quiz: {
        name: 'Quiz Champion',
        icon: '📝',
        description: 'Badges earned through quiz performance',
        badges: []
      },
      note: {
        name: 'Note Scholar',
        icon: '📚',
        description: 'Badges for reading and studying notes',
        badges: []
      },
      special: {
        name: 'Special Achievements',
        icon: '🏆',
        description: 'Unique badges for special accomplishments',
        badges: []
      }
    };

    allBadges.forEach(badge => {
      const category = categories[badge.category];
      if (category) {
        category.badges.push({
          ...badge,
          earned: earnedBadgeIds.has(badge.id)
        } as any);
      }
    });

    return Object.values(categories);
  }

  async awardBadge(userId: string, badgeId: string): Promise<boolean> {
    try {
      const { data: existing } = await this.supabase
        .from('user_badges')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_id', badgeId)
        .single();

      if (existing) {
        return false;
      }

      const { error } = await this.supabase
        .from('user_badges')
        .insert({
          user_id: userId,
          badge_id: badgeId,
          is_displayed: true
        });

      if (error) {
        console.error('Error awarding badge:', error);
        return false;
      }

      const { data: badge } = await this.supabase
        .from('badges')
        .select('name, icon, description')
        .eq('id', badgeId)
        .single();

      if (badge) {
        await this.supabase
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'badge_earned',
            title: '🏆 Badge Earned!',
            message: `You earned the "${badge.name}" badge! ${badge.description}`,
            priority: 'normal',
            data: { badgeId, badgeName: badge.name, icon: badge.icon }
          });

        await this.triggerBadgeUpdate(userId, badge);
      }

      return true;
    } catch (error) {
      console.error('Error in awardBadge:', error);
      return false;
    }
  }

  async getBadgeStats(userId: string): Promise<{
    totalEarned: number;
    totalAvailable: number;
    completionPercentage: number;
    categoryBreakdown: Record<string, number>;
    rarestBadges: UserBadge[];
  }> {
    try {
      const [allBadges, userBadges] = await Promise.all([
        this.getAllBadges(),
        this.getUserBadges(userId)
      ]);

      const totalEarned = userBadges.length;
      const totalAvailable = allBadges.length;
      const completionPercentage = totalAvailable > 0 ? Math.round((totalEarned / totalAvailable) * 100) : 0;

      const categoryBreakdown: Record<string, number> = {};
      userBadges.forEach(ub => {
        const category = ub.badge.category;
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
      });

      const rarestBadges = userBadges
        .sort((a, b) => b.badge.points - a.badge.points)
        .slice(0, 5);

      return {
        totalEarned,
        totalAvailable,
        completionPercentage,
        categoryBreakdown,
        rarestBadges
      };
    } catch (error) {
      console.error('Error getting badge stats:', error);
      return {
        totalEarned: 0,
        totalAvailable: 0,
        completionPercentage: 0,
        categoryBreakdown: {},
        rarestBadges: []
      };
    }
  }

  async checkAndAwardEligibleBadges(userId: string): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.rpc('check_and_award_badges', {
        p_user_id: userId
      });

      if (error) {
        console.error('Error checking badge eligibility:', error);
        return [];
      }

      return [];
    } catch (error) {
      console.error('Error in checkAndAwardEligibleBadges:', error);
      return [];
    }
  }

  getBadgeRarity(points: number): 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' {
    if (points <= 10) return 'common';
    if (points <= 25) return 'uncommon';
    if (points <= 50) return 'rare';
    if (points <= 100) return 'epic';
    return 'legendary';
  }

  getBadgeColor(rarity: string): string {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'uncommon': return 'bg-green-100 text-green-800 border-green-300';
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  }

  private async triggerBadgeUpdate(userId: string, badge: Partial<Badge>) {
    try {
      const channel = this.supabase.channel('badge_updates');
      await channel.send({
        type: 'broadcast',
        event: 'badge_earned',
        payload: { userId, badge, timestamp: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Error triggering badge update:', error);
    }
  }
}
