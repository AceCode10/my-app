'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Flame, Heart, Zap, Gift, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_freezes: number;
  is_at_risk: boolean;
  can_recover: boolean;
  recovery_cost: number;
}

export function StreakRecoveryDialog() {
  const { user } = useUser();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [usingFreeze, setUsingFreeze] = useState(false);

  useEffect(() => {
    if (user) {
      checkStreakStatus();
    }
  }, [user]);

  async function checkStreakStatus() {
    try {
      const { data: stats } = await supabase
        .from('user_study_stats')
        .select('current_streak, longest_streak, last_study_date')
        .eq('user_id', user?.id)
        .single();

      const { data: profile } = await supabase
        .from('users')
        .select('streak_days, streak_freezes, xp')
        .eq('id', user?.id)
        .single();

      if (!stats && !profile) return;

      const lastDate = stats?.last_study_date || profile?.streak_days;
      const currentStreak = stats?.current_streak || profile?.streak_days || 0;
      
      // Check if streak is at risk (no activity yesterday)
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let isAtRisk = false;
      let canRecover = false;
      
      if (lastDate) {
        const lastActivityDate = new Date(lastDate);
        const daysSinceActivity = Math.floor(
          (today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        isAtRisk = daysSinceActivity === 1 && currentStreak > 0;
        canRecover = daysSinceActivity <= 2 && currentStreak > 0;
      }

      const data: StreakData = {
        current_streak: currentStreak,
        longest_streak: stats?.longest_streak || currentStreak,
        last_activity_date: lastDate,
        streak_freezes: profile?.streak_freezes || 0,
        is_at_risk: isAtRisk,
        can_recover: canRecover,
        recovery_cost: Math.min(500, currentStreak * 50)
      };

      setStreakData(data);

      // Auto-show dialog if streak is at risk
      if (isAtRisk && currentStreak >= 3) {
        setOpen(true);
      }
    } catch (error) {
      console.error('Error checking streak status:', error);
    }
  }

  async function useStreakFreeze() {
    if (!streakData || streakData.streak_freezes <= 0) return;

    setUsingFreeze(true);
    try {
      // Use a streak freeze
      await supabase
        .from('users')
        .update({
          streak_freezes: streakData.streak_freezes - 1,
          last_streak_freeze_used: new Date().toISOString()
        })
        .eq('id', user?.id);

      // Update last activity to today to preserve streak
      await supabase
        .from('user_study_stats')
        .update({
          last_study_date: new Date().toISOString().split('T')[0]
        })
        .eq('user_id', user?.id);

      // Celebrate!
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      setOpen(false);
      checkStreakStatus();
    } catch (error) {
      console.error('Error using streak freeze:', error);
    } finally {
      setUsingFreeze(false);
    }
  }

  async function recoverWithXP() {
    if (!streakData) return;

    setRecovering(true);
    try {
      // Deduct XP
      const { data: profile } = await supabase
        .from('users')
        .select('xp')
        .eq('id', user?.id)
        .single();

      if ((profile?.xp || 0) < streakData.recovery_cost) {
        alert('Not enough XP to recover streak');
        return;
      }

      await supabase
        .from('users')
        .update({
          xp: (profile?.xp || 0) - streakData.recovery_cost
        })
        .eq('id', user?.id);

      // Update last activity
      await supabase
        .from('user_study_stats')
        .update({
          last_study_date: new Date().toISOString().split('T')[0]
        })
        .eq('user_id', user?.id);

      // Celebrate!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      setOpen(false);
      checkStreakStatus();
    } catch (error) {
      console.error('Error recovering streak:', error);
    } finally {
      setRecovering(false);
    }
  }

  if (!streakData || !streakData.is_at_risk) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Streak at Risk!
          </DialogTitle>
          <DialogDescription>
            Your {streakData.current_streak}-day streak is about to end. Study today or use a recovery option!
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Streak Display */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="text-6xl font-bold text-orange-500 animate-pulse">
                {streakData.current_streak}
              </div>
              <Flame className="absolute -top-2 -right-4 h-8 w-8 text-orange-500 animate-bounce" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-muted-foreground">day streak</p>
              <p className="text-xs text-muted-foreground">
                Best: {streakData.longest_streak} days
              </p>
            </div>
          </div>

          {/* Recovery Options */}
          <div className="space-y-3">
            {/* Streak Freeze Option */}
            {streakData.streak_freezes > 0 && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <Heart className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Use Streak Freeze</p>
                        <p className="text-sm text-muted-foreground">
                          {streakData.streak_freezes} freeze{streakData.streak_freezes !== 1 ? 's' : ''} available
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={useStreakFreeze}
                      disabled={usingFreeze}
                    >
                      {usingFreeze ? 'Using...' : 'Use'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* XP Recovery Option */}
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-full">
                      <Zap className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium">Recover with XP</p>
                      <p className="text-sm text-muted-foreground">
                        Cost: {streakData.recovery_cost} XP
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={recoverWithXP}
                    disabled={recovering}
                  >
                    {recovering ? 'Recovering...' : 'Recover'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Study Now Option */}
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                      <Sparkles className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Study Now</p>
                      <p className="text-sm text-muted-foreground">
                        Complete any activity to keep your streak
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      window.location.href = '/student/practice';
                    }}
                  >
                    Let's Go!
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Remind Me Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Streak Display Component
 */
export function StreakDisplay({ compact = false }: { compact?: boolean }) {
  const { user } = useUser();
  const supabase = createClient();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStreak();
    }
  }, [user]);

  async function fetchStreak() {
    try {
      const { data } = await supabase
        .from('users')
        .select('streak_days')
        .eq('id', user?.id)
        .single();

      setStreak(data?.streak_days || 0);
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1 text-orange-500">
        <Flame className="h-4 w-4" />
        <span className="font-bold">{streak}</span>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-orange-500 to-red-500 text-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Current Streak</p>
            <p className="text-3xl font-bold">{streak} days</p>
          </div>
          <Flame className={cn("h-10 w-10", streak > 0 && "animate-pulse")} />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Achievement Celebration Component
 */
export function AchievementCelebration({
  title,
  description,
  icon,
  onClose
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <div className="py-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4 animate-bounce">
            {icon || <Gift className="h-10 w-10 text-white" />}
          </div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <DialogFooter className="justify-center">
          <Button onClick={onClose}>Awesome!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * XP Gain Animation Component
 */
export function XPGainAnimation({ amount, onComplete }: { amount: number; onComplete?: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
      <div className="animate-bounce text-4xl font-bold text-green-500 drop-shadow-lg">
        +{amount} XP
      </div>
    </div>
  );
}
