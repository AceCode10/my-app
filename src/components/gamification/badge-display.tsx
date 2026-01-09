'use client';

import { useEffect, useState } from 'react';
import { Award, Lock, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BadgeService, type Badge as BadgeType, type UserBadge } from '@/lib/gamification/badge-service';
import { useUser } from '@/hooks/use-user';

interface BadgeDisplayProps {
  userId?: string;
  showProgress?: boolean;
  compact?: boolean;
}

export function BadgeDisplay({ userId, showProgress = true, compact = false }: BadgeDisplayProps) {
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const badgeService = new BadgeService();

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (!targetUserId) return;

    loadBadgeData();

    // Listen for badge updates
    const handleBadgeEarned = () => {
      loadBadgeData();
    };

    window.addEventListener('badge_earned', handleBadgeEarned);

    return () => {
      window.removeEventListener('badge_earned', handleBadgeEarned);
    };
  }, [targetUserId]);

  const loadBadgeData = async () => {
    if (!targetUserId) return;

    try {
      const [badges, categoriesData, statsData] = await Promise.all([
        badgeService.getUserBadges(targetUserId),
        badgeService.getBadgesByCategory(targetUserId),
        badgeService.getBadgeStats(targetUserId)
      ]);

      setUserBadges(badges);
      setCategories(categoriesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading badge data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadgeRarityColor = (points: number) => {
    const rarity = badgeService.getBadgeRarity(points);
    return badgeService.getBadgeColor(rarity);
  };

  const renderBadge = (badge: BadgeType & { earned?: boolean }, earned = false) => {
    const isEarned = earned || badge.earned;
    
    return (
      <div
        key={badge.id}
        className={`p-4 rounded-lg border-2 transition-all ${
          isEarned
            ? `${getBadgeRarityColor(badge.points)} hover:shadow-md`
            : 'bg-muted/30 border-muted opacity-50'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`text-3xl ${isEarned ? '' : 'grayscale opacity-50'}`}>
            {badge.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">{badge.name}</h4>
              {!isEarned && <Lock className="h-3 w-3 text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {badge.description}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {badge.points} pts
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {badge.category}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-4 rounded-lg bg-muted animate-pulse h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {userBadges.slice(0, 5).map((userBadge) => (
          <div
            key={userBadge.id}
            className={`p-2 rounded-lg border ${getBadgeRarityColor(userBadge.badge.points)}`}
            title={userBadge.badge.name}
          >
            <span className="text-2xl">{userBadge.badge.icon}</span>
          </div>
        ))}
        {userBadges.length > 5 && (
          <Badge variant="secondary">+{userBadges.length - 5} more</Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Badge Collection
            </CardTitle>
            <CardDescription>
              {stats?.totalEarned} of {stats?.totalAvailable} badges earned
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-lg">
            {stats?.completionPercentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Overview */}
        {showProgress && stats && (
          <div className="mb-6 space-y-3">
            <Progress value={stats.completionPercentage} className="h-2" />
            
            {/* Category Breakdown */}
            <div className="grid grid-cols-5 gap-2 text-center">
              {Object.entries(stats.categoryBreakdown).map(([category, count]) => (
                <div key={category} className="p-2 rounded-lg bg-muted/50">
                  <p className="text-lg font-bold">{count as number}</p>
                  <p className="text-xs text-muted-foreground capitalize">{category}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Badge Tabs */}
        <Tabs defaultValue="earned" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="earned">
              Earned ({stats?.totalEarned})
            </TabsTrigger>
            <TabsTrigger value="all">
              All Badges ({stats?.totalAvailable})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earned" className="mt-4">
            {userBadges.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Award className="mx-auto h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">No badges earned yet</p>
                <p className="text-sm mt-1">Complete activities to earn your first badge!</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {userBadges.map((userBadge) => renderBadge(userBadge.badge, true))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4">
            <Tabs defaultValue={categories[0]?.name || 'xp'} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                {categories.map((category) => (
                  <TabsTrigger key={category.name} value={category.name}>
                    {category.icon} {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map((category) => (
                <TabsContent key={category.name} value={category.name} className="mt-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-sm mb-1">{category.name}</h3>
                    <p className="text-xs text-muted-foreground">{category.description}</p>
                  </div>
                  <ScrollArea className="h-[350px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {category.badges.map((badge: BadgeType & { earned?: boolean }) => 
                        renderBadge(badge, badge.earned)
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Rarest Badges */}
        {stats?.rarestBadges && stats.rarestBadges.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Rarest Badges
            </h3>
            <div className="flex gap-2 flex-wrap">
              {stats.rarestBadges.map((userBadge: UserBadge) => (
                <div
                  key={userBadge.id}
                  className={`p-3 rounded-lg border ${getBadgeRarityColor(userBadge.badge.points)}`}
                  title={userBadge.badge.name}
                >
                  <span className="text-3xl">{userBadge.badge.icon}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
