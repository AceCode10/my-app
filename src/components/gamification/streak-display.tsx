'use client';

import { useEffect, useState } from 'react';
import { Flame, Award, Calendar, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { StreakService, type StreakData } from '@/lib/gamification/streak-service';
import { useUser } from '@/hooks/use-user';

interface StreakDisplayProps {
  compact?: boolean;
}

export function StreakDisplay({ compact = false }: StreakDisplayProps) {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [risk, setRisk] = useState<'safe' | 'warning' | 'danger' | 'lost'>('safe');
  const { user } = useUser();
  const streakService = new StreakService();

  useEffect(() => {
    if (!user) return;

    loadStreakData();

    // Listen for streak updates
    const handleStreakUpdate = () => {
      loadStreakData();
    };

    window.addEventListener('streak_updated', handleStreakUpdate);

    return () => {
      window.removeEventListener('streak_updated', handleStreakUpdate);
    };
  }, [user]);

  const loadStreakData = async () => {
    if (!user) return;

    try {
      const [data, riskLevel] = await Promise.all([
        streakService.getStreakData(user.id),
        streakService.getStreakRisk(user.id)
      ]);

      setStreakData(data);
      setRisk(riskLevel);
    } catch (error) {
      console.error('Error loading streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !streakData) {
    return (
      <div className={compact ? 'flex items-center gap-2' : 'p-4'}>
        <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
        {!compact && (
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            <div className="h-2 bg-muted rounded w-full animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  const streakColor = streakService.getStreakColor(streakData.current_streak);
  const streakEmoji = streakService.getStreakEmoji(streakData.current_streak);
  const streakMessage = streakService.getStreakMessage(streakData.current_streak);
  const { milestone, progress, daysRemaining } = streakService.getMilestoneProgress(streakData.current_streak);

  const getRiskBadge = () => {
    switch (risk) {
      case 'warning':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-700">⚠️ At Risk</Badge>;
      case 'danger':
        return <Badge variant="destructive">🚨 In Danger</Badge>;
      case 'lost':
        return <Badge variant="secondary">💤 Streak Lost</Badge>;
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
        <div className={`text-2xl ${streakColor}`}>
          {streakEmoji}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">
            {streakData.current_streak} Day Streak
          </p>
          {risk !== 'safe' && getRiskBadge()}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className={`h-5 w-5 ${streakColor}`} />
            <span>Learning Streak</span>
          </div>
          {getRiskBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Streak */}
        <div className="text-center p-6 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950">
          <div className="text-6xl mb-2">{streakEmoji}</div>
          <p className="text-4xl font-bold mb-1">
            {streakData.current_streak}
          </p>
          <p className="text-sm text-muted-foreground">
            {streakData.current_streak === 1 ? 'Day' : 'Days'} Streak
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {streakMessage}
          </p>
        </div>

        {/* Next Milestone */}
        {milestone && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Next Milestone</span>
              <span className="font-medium">
                {milestone.title} ({milestone.days} days)
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} to go • {milestone.xp_reward} XP reward
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Award className="h-4 w-4 text-yellow-500" />
              <p className="text-2xl font-bold">
                {streakData.longest_streak}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Longest Streak</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="h-4 w-4 text-blue-500" />
              <p className="text-2xl font-bold">
                {streakData.streak_freeze_count}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Streak Freezes</p>
          </div>
        </div>

        {/* Risk Warning */}
        {(risk === 'warning' || risk === 'danger') && (
          <div className={`p-3 rounded-lg ${
            risk === 'danger' 
              ? 'bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800' 
              : 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800'
          }`}>
            <p className="text-sm font-medium mb-2">
              {risk === 'danger' ? '🚨 Streak in Danger!' : '⚠️ Streak at Risk!'}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {risk === 'danger' 
                ? 'Your streak will be lost if you don\'t study today!' 
                : 'You haven\'t studied today. Keep your streak alive!'}
            </p>
            <Button size="sm" className="w-full" onClick={() => window.location.href = '/dashboard'}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Start Learning Now
            </Button>
          </div>
        )}

        {/* Lost Streak Message */}
        {risk === 'lost' && streakData.current_streak === 0 && (
          <div className="p-3 rounded-lg bg-muted">
            <p className="text-sm font-medium mb-2">💤 Start a New Streak</p>
            <p className="text-xs text-muted-foreground mb-3">
              Begin your learning journey today and build a new streak!
            </p>
            <Button size="sm" className="w-full" onClick={() => window.location.href = '/dashboard'}>
              Start Today
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
