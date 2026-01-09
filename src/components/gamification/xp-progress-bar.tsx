'use client';

import { useEffect, useState } from 'react';
import { Zap, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { XPService, type UserGamification } from '@/lib/gamification/xp-service';
import { useUser } from '@/hooks/use-user';

interface XPProgressBarProps {
  compact?: boolean;
  showLevel?: boolean;
  showXPAmount?: boolean;
}

export function XPProgressBar({ 
  compact = false, 
  showLevel = true,
  showXPAmount = true 
}: XPProgressBarProps) {
  const [gamification, setGamification] = useState<UserGamification | null>(null);
  const [loading, setLoading] = useState(true);
  const [xpGain, setXpGain] = useState<number | null>(null);
  const { user } = useUser();
  const xpService = new XPService();

  useEffect(() => {
    if (!user) return;

    loadGamificationData();

    // Listen for XP updates
    const handleXPEarned = (event: CustomEvent) => {
      const { amount } = event.detail;
      setXpGain(amount);
      
      // Animate and clear after 2 seconds
      setTimeout(() => setXpGain(null), 2000);
      
      // Reload data
      loadGamificationData();
    };

    window.addEventListener('xp_earned', handleXPEarned as EventListener);

    return () => {
      window.removeEventListener('xp_earned', handleXPEarned as EventListener);
    };
  }, [user]);

  const loadGamificationData = async () => {
    if (!user) return;

    try {
      const data = await xpService.getUserGamification(user.id);
      setGamification(data);
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !gamification) {
    return (
      <div className={compact ? 'h-2 w-full bg-muted rounded-full animate-pulse' : 'p-4'}>
        {!compact && (
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
            <div className="h-2 bg-muted rounded w-full animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  const progress = xpService.getLevelProgress(gamification);
  const levelTitle = xpService.getLevelTitle(gamification.xp_level);
  const xpToNext = xpService.getXPToNextLevel(gamification);

  if (compact) {
    return (
      <div className="relative">
        <Progress value={progress} className="h-2" />
        {xpGain && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <Badge className="bg-green-500 text-white">
              +{xpGain} XP
            </Badge>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                {showLevel && (
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">
                      Level {gamification.xp_level}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {levelTitle}
                    </Badge>
                  </div>
                )}
                {showXPAmount && (
                  <p className="text-sm text-muted-foreground">
                    {gamification.total_xp.toLocaleString()} XP
                  </p>
                )}
              </div>
            </div>
            
            {xpGain && (
              <div className="animate-bounce">
                <Badge className="bg-green-500 text-white text-sm">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{xpGain} XP
                </Badge>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Progress value={progress} className="h-3" />
              {xpGain && (
                <div 
                  className="absolute top-0 h-3 bg-green-500/50 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              )}
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {gamification.xp_progress_to_next_level} / {gamification.xp_needed_for_next_level} XP
              </span>
              <span className="font-medium">
                {xpToNext} XP to Level {gamification.xp_level + 1}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div className="text-center">
              <p className="text-lg font-bold text-primary">
                {gamification.total_quizzes_completed}
              </p>
              <p className="text-xs text-muted-foreground">Quizzes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">
                {gamification.total_notes_viewed}
              </p>
              <p className="text-xs text-muted-foreground">Notes</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary">
                {Math.round(gamification.total_time_spent_minutes / 60)}h
              </p>
              <p className="text-xs text-muted-foreground">Study Time</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
