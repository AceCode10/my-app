'use client';

/**
 * Gamification Demo Page
 * Test and preview all gamification animations and effects
 */

import { useState } from 'react';
import { Zap, Trophy, Flame, Target, Star, Volume2, Sparkles, Settings, Crown, Gem } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGamificationContext } from '@/contexts/GamificationContext';
import { useGamificationStore } from '@/lib/gamification/stores/gamification-store';
import { triggerConfetti } from '@/components/gamification/animations/confetti-burst';
import { toast } from '@/components/gamification/animations/achievement-toast';
import { GamificationSettings } from '@/components/gamification/widgets/gamification-settings';
import { DailyGoalRing, DailyGoalsRow, DailyGoalWidget, GoalSelectionModal, LeagueBadge, LeagueLeaderboard, LeagueWidget, LeagueProgress, RewardBreakdownModal } from '@/components/gamification';
import { useDailyGoals } from '@/hooks/use-daily-goals';
import { DailyGoal } from '@/lib/gamification/daily-goals-service';
import { useLeague } from '@/hooks/use-league';
import { LeagueMember } from '@/lib/gamification/league-service';
import { useActivityRewards } from '@/hooks/use-activity-rewards';
import { RewardBreakdown } from '@/lib/gamification/reward-engine';

export default function GamificationDemoPage() {
  const { awardXP, unlockBadge, celebrateStreak, toggleSound, isSoundEnabled } = useGamificationContext();
  const store = useGamificationStore();
  const { goals, presets, preferences, primaryGoal, updateGoalProgress, setDifficulty, isLoading } = useDailyGoals();
  const { leagues, currentLeague, leaderboard, userRank, weekInfo } = useLeague();
  const { processExamPaper, processTopicalQuestion, isProcessing, lastBreakdown } = useActivityRewards();
  
  // Demo state
  const [xpAmount, setXpAmount] = useState(25);
  const [badgeRarity, setBadgeRarity] = useState<'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'>('rare');
  const [streakDays, setStreakDays] = useState(7);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showRewardBreakdown, setShowRewardBreakdown] = useState(false);
  const [demoBreakdown, setDemoBreakdown] = useState<RewardBreakdown | null>(null);

  // Demo leagues for display
  const demoLeagues = leagues.length > 0 ? leagues : [
    { id: '1', name: 'Bronze', tier: 1, icon: '🥉', color: '#CD7F32', min_xp_to_enter: 0, promotion_slots: 10, demotion_slots: 0 },
    { id: '2', name: 'Silver', tier: 2, icon: '🥈', color: '#C0C0C0', min_xp_to_enter: 100, promotion_slots: 10, demotion_slots: 5 },
    { id: '3', name: 'Gold', tier: 3, icon: '🥇', color: '#FFD700', min_xp_to_enter: 300, promotion_slots: 10, demotion_slots: 5 },
    { id: '4', name: 'Sapphire', tier: 4, icon: '💎', color: '#0F52BA', min_xp_to_enter: 600, promotion_slots: 10, demotion_slots: 5 },
    { id: '5', name: 'Ruby', tier: 5, icon: '❤️', color: '#E0115F', min_xp_to_enter: 1000, promotion_slots: 10, demotion_slots: 5 },
    { id: '6', name: 'Diamond', tier: 10, icon: '💠', color: '#B9F2FF', min_xp_to_enter: 7500, promotion_slots: 5, demotion_slots: 5 },
  ];

  // Demo leaderboard
  const demoLeaderboard: LeagueMember[] = leaderboard.length > 0 ? leaderboard : [
    { user_id: '1', display_name: 'StudyPro', avatar_url: null, weekly_xp: 450, rank: 1, is_current_user: false },
    { user_id: '2', display_name: 'MathWhiz', avatar_url: null, weekly_xp: 380, rank: 2, is_current_user: false },
    { user_id: '3', display_name: 'ScienceNerd', avatar_url: null, weekly_xp: 320, rank: 3, is_current_user: false },
    { user_id: '4', display_name: 'You', avatar_url: null, weekly_xp: 285, rank: 4, is_current_user: true },
    { user_id: '5', display_name: 'BookWorm', avatar_url: null, weekly_xp: 240, rank: 5, is_current_user: false },
    { user_id: '6', display_name: 'QuizKing', avatar_url: null, weekly_xp: 180, rank: 6, is_current_user: false },
    { user_id: '7', display_name: 'Learner101', avatar_url: null, weekly_xp: 95, rank: 7, is_current_user: false },
  ];

  const demoCurrentLeague = currentLeague || {
    group_id: 'demo',
    league_id: '3',
    league_name: 'Gold',
    league_tier: 3,
    league_icon: '🥇',
    league_color: '#FFD700',
  };

  // Demo goals for when not logged in
  const demoGoals: DailyGoal[] = goals.length > 0 ? goals : [
    { id: '1', user_id: '', goal_type: 'xp', goal_difficulty: 'regular', target_value: 50, current_value: 35, is_completed: false, completed_at: null, goal_date: '', created_at: '', updated_at: '' },
    { id: '2', user_id: '', goal_type: 'questions', goal_difficulty: 'regular', target_value: 10, current_value: 7, is_completed: false, completed_at: null, goal_date: '', created_at: '', updated_at: '' },
    { id: '3', user_id: '', goal_type: 'time', goal_difficulty: 'regular', target_value: 10, current_value: 10, is_completed: true, completed_at: new Date().toISOString(), goal_date: '', created_at: '', updated_at: '' },
  ];

  // Badge examples
  const demoBadges = {
    common: { id: 'demo-1', name: 'First Steps', description: 'Complete your first quiz', icon: '📝', rarity: 'common' as const },
    uncommon: { id: 'demo-2', name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', rarity: 'uncommon' as const },
    rare: { id: 'demo-3', name: 'Quiz Master', description: 'Complete 50 quizzes', icon: '🎯', rarity: 'rare' as const },
    epic: { id: 'demo-4', name: 'Scholar', description: 'Reach Level 20', icon: '🎓', rarity: 'epic' as const },
    legendary: { id: 'demo-5', name: 'Legend', description: 'Achieve 100-day streak', icon: '👑', rarity: 'legendary' as const },
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-yellow-500" />
          Gamification Demo
        </h1>
        <p className="text-muted-foreground">
          Test and preview all gamification animations and effects
        </p>
      </div>

      {/* Current Stats */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle>Current Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-primary">{store.totalXP}</p>
              <p className="text-sm text-muted-foreground">Total XP</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{store.level}</p>
              <p className="text-sm text-muted-foreground">Level</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange-500">{store.currentStreak}</p>
              <p className="text-sm text-muted-foreground">Streak</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">{store.levelTitle}</p>
              <p className="text-sm text-muted-foreground">Title</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Goals Demo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Daily Goals (Phase 2)
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowGoalModal(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Set Goal
            </Button>
          </div>
          <CardDescription>
            Circular progress rings like Duolingo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Goal Widget */}
          <DailyGoalWidget
            goal={demoGoals.find(g => g.goal_type === 'xp') || null}
            streak={store.currentStreak}
            onPress={() => setShowGoalModal(true)}
          />

          {/* Goal Rings Row */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-4">All Goals Progress</p>
            <div className="flex justify-center gap-8">
              {demoGoals.map((goal) => (
                <DailyGoalRing
                  key={goal.id}
                  goal={goal}
                  size="lg"
                  showLabel
                  showStats
                />
              ))}
            </div>
          </div>

          {/* Different Sizes */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-4">Ring Sizes</p>
            <div className="flex items-end justify-center gap-6">
              <DailyGoalRing goal={demoGoals[0]} size="sm" showLabel={false} showStats={false} />
              <DailyGoalRing goal={demoGoals[0]} size="md" showLabel={false} showStats={false} />
              <DailyGoalRing goal={demoGoals[0]} size="lg" showLabel={false} showStats={false} />
              <DailyGoalRing goal={demoGoals[0]} size="xl" showLabel={false} showStats={false} />
            </div>
          </div>

          {/* Compact Row */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-4">Compact Goals Row</p>
            <DailyGoalsRow goals={demoGoals} size="sm" />
          </div>
        </CardContent>
      </Card>

      {/* Goal Selection Modal */}
      <GoalSelectionModal
        isOpen={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        presets={presets.length > 0 ? presets : [
          { id: '1', difficulty: 'casual', display_name: 'Casual', description: '5 mins a day', xp_target: 20, questions_target: 5, time_target_minutes: 5, xp_bonus: 5, icon: '🌱', sort_order: 1 },
          { id: '2', difficulty: 'regular', display_name: 'Regular', description: '10 mins a day', xp_target: 50, questions_target: 10, time_target_minutes: 10, xp_bonus: 15, icon: '📚', sort_order: 2 },
          { id: '3', difficulty: 'serious', display_name: 'Serious', description: '15 mins a day', xp_target: 100, questions_target: 20, time_target_minutes: 15, xp_bonus: 30, icon: '🔥', sort_order: 3 },
          { id: '4', difficulty: 'intense', display_name: 'Intense', description: '20 mins a day', xp_target: 200, questions_target: 40, time_target_minutes: 20, xp_bonus: 50, icon: '💪', sort_order: 4 },
        ]}
        currentDifficulty={preferences?.preferred_difficulty || 'regular'}
        onSelect={async (d) => { await setDifficulty(d); }}
      />

      {/* League System Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            League System (Phase 3)
          </CardTitle>
          <CardDescription>
            Weekly competition with divisions and promotion/demotion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* League Widget */}
          <LeagueWidget
            currentLeague={demoCurrentLeague}
            userRank={demoLeaderboard.find(m => m.is_current_user) || null}
            totalMembers={demoLeaderboard.length}
            weekInfo={weekInfo}
          />

          {/* League Badges */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-4">League Badges</p>
            <div className="flex justify-center gap-4 flex-wrap">
              {demoLeagues.slice(0, 5).map((league) => (
                <LeagueBadge
                  key={league.tier}
                  name={league.name}
                  tier={league.tier}
                  icon={league.icon}
                  color={league.color}
                  size="md"
                  showTier
                />
              ))}
            </div>
          </div>

          {/* League Progress */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-4">League Progress</p>
            <LeagueProgress
              currentTier={3}
              leagues={demoLeagues}
            />
          </div>

          {/* Mini Leaderboard */}
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-4">Leaderboard Preview</p>
            <LeagueLeaderboard
              members={demoLeaderboard}
              currentLeague={demoCurrentLeague}
              league={demoLeagues.find(l => l.tier === 3) || null}
              weekInfo={weekInfo}
            />
          </div>
        </CardContent>
      </Card>

      {/* Reward Breakdown Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Reward Breakdown
          </CardTitle>
          <CardDescription>
            Simulate activity completion to see detailed reward breakdown
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Shows students exactly what they earned and why.
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => {
                const breakdown: RewardBreakdown = {
                  baseXP: 20,
                  bonuses: [
                    { type: 'percentage', label: '85% Score', amount: 26, icon: '📊' },
                    { type: 'highScore', label: 'Excellent (80%+)', amount: 20, icon: '⭐' },
                    { type: 'completed', label: 'Paper Completed', amount: 15, icon: '📄' },
                  ],
                  totalXP: 81,
                  dailyGoalProgress: [
                    { goalType: 'xp', previousValue: 30, newValue: 111, targetValue: 100, completed: true, justCompleted: true },
                    { goalType: 'questions', previousValue: 5, newValue: 15, targetValue: 20, completed: false, justCompleted: false },
                  ],
                  badgesUnlocked: [],
                  streakUpdated: true,
                  newStreakDays: 5,
                  leagueXPAdded: 81,
                  leveledUp: false,
                };
                setDemoBreakdown(breakdown);
                setShowRewardBreakdown(true);
              }}
            >
              Exam Paper (85%)
            </Button>
            
            <Button
              variant="outline"
              className="border-yellow-500/50"
              onClick={() => {
                const breakdown: RewardBreakdown = {
                  baseXP: 20,
                  bonuses: [
                    { type: 'percentage', label: '100% Score', amount: 50, icon: '📊' },
                    { type: 'perfectScore', label: 'Perfect Paper!', amount: 50, icon: '💯' },
                    { type: 'completed', label: 'Paper Completed', amount: 15, icon: '📄' },
                  ],
                  totalXP: 135,
                  dailyGoalProgress: [
                    { goalType: 'xp', previousValue: 15, newValue: 150, targetValue: 100, completed: true, justCompleted: true },
                  ],
                  badgesUnlocked: [
                    { id: 'perfect', name: 'Perfectionist', description: 'Score 100% on any activity', icon: '💯', rarity: 'rare' },
                  ],
                  streakUpdated: true,
                  newStreakDays: 7,
                  streakMilestone: { days: 7, title: 'Week Warrior!', xpReward: 50 },
                  leagueXPAdded: 135,
                  leveledUp: true,
                  newLevel: 5,
                  newTitle: 'Learner',
                };
                setDemoBreakdown(breakdown);
                setShowRewardBreakdown(true);
              }}
            >
              🏆 Perfect Paper (100%)
            </Button>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/30 text-sm">
            <p className="font-medium mb-1">Why this matters:</p>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• Students see exactly how XP is calculated</li>
              <li>• Bonuses are clearly labeled with reasons</li>
              <li>• Progress toward goals updates in real-time</li>
              <li>• Achievements feel earned, not random</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Reward Breakdown Modal */}
      <RewardBreakdownModal
        isOpen={showRewardBreakdown}
        onClose={() => setShowRewardBreakdown(false)}
        breakdown={demoBreakdown}
        activityName="Quiz Complete"
      />

      <div className="grid md:grid-cols-2 gap-6">
        {/* XP Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              XP Animations
            </CardTitle>
            <CardDescription>
              Test XP gain animations with different amounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>XP Amount</Label>
              <Input
                type="number"
                value={xpAmount}
                onChange={(e) => setXpAmount(parseInt(e.target.value) || 0)}
                min={1}
                max={500}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" onClick={() => setXpAmount(10)}>+10 XP</Button>
              <Button variant="outline" onClick={() => setXpAmount(25)}>+25 XP</Button>
              <Button variant="outline" onClick={() => setXpAmount(100)}>+100 XP</Button>
            </div>
            <Button 
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500"
              onClick={() => awardXP(xpAmount, 'Demo XP award')}
            >
              <Zap className="h-4 w-4 mr-2" />
              Award {xpAmount} XP
            </Button>
          </CardContent>
        </Card>

        {/* Level Up Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-purple-500" />
              Level Up
            </CardTitle>
            <CardDescription>
              Trigger level up celebration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current Level: <strong>{store.level}</strong> ({store.levelTitle})
            </p>
            <Button 
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
              onClick={() => store.triggerLevelUp(store.level, store.level + 1, 'Scholar')}
            >
              <Star className="h-4 w-4 mr-2" />
              Trigger Level Up
            </Button>
          </CardContent>
        </Card>

        {/* Badge Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-blue-500" />
              Badge Unlock
            </CardTitle>
            <CardDescription>
              Test badge unlock animations by rarity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Badge Rarity</Label>
              <Select value={badgeRarity} onValueChange={(v) => setBadgeRarity(v as typeof badgeRarity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="common">⚪ Common</SelectItem>
                  <SelectItem value="uncommon">🟢 Uncommon</SelectItem>
                  <SelectItem value="rare">🔵 Rare</SelectItem>
                  <SelectItem value="epic">🟣 Epic</SelectItem>
                  <SelectItem value="legendary">🟡 Legendary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              className="w-full"
              onClick={() => unlockBadge(demoBadges[badgeRarity])}
            >
              <Trophy className="h-4 w-4 mr-2" />
              Unlock {badgeRarity.charAt(0).toUpperCase() + badgeRarity.slice(1)} Badge
            </Button>
          </CardContent>
        </Card>

        {/* Streak Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Streak Celebration
            </CardTitle>
            <CardDescription>
              Test streak milestone celebrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Streak Days</Label>
              <div className="grid grid-cols-4 gap-2">
                <Button variant="outline" size="sm" onClick={() => setStreakDays(3)}>3</Button>
                <Button variant="outline" size="sm" onClick={() => setStreakDays(7)}>7</Button>
                <Button variant="outline" size="sm" onClick={() => setStreakDays(30)}>30</Button>
                <Button variant="outline" size="sm" onClick={() => setStreakDays(100)}>100</Button>
              </div>
            </div>
            <Button 
              className="w-full bg-gradient-to-r from-orange-500 to-red-500"
              onClick={() => celebrateStreak(streakDays, `${streakDays} Day Streak!`, streakDays * 5)}
            >
              <Flame className="h-4 w-4 mr-2" />
              Celebrate {streakDays}-Day Streak
            </Button>
          </CardContent>
        </Card>

        {/* Toast Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              Toast Notifications
            </CardTitle>
            <CardDescription>
              Test different toast notification types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => toast.xp(50, 'Quiz completed successfully!')}
            >
              XP Toast
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => toast.streak(7)}
            >
              Streak Toast
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => toast.badge('Quiz Master', '🎯')}
            >
              Badge Toast
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => toast.goal('Complete 5 quizzes today')}
            >
              Goal Toast
            </Button>
          </CardContent>
        </Card>

        {/* Confetti Demo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-500" />
              Confetti Effects
            </CardTitle>
            <CardDescription>
              Test different confetti presets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => triggerConfetti.celebration()}>
                🎉 Celebration
              </Button>
              <Button variant="outline" onClick={() => triggerConfetti.levelUp()}>
                ⭐ Level Up
              </Button>
              <Button variant="outline" onClick={() => triggerConfetti.badge()}>
                🏆 Badge
              </Button>
              <Button variant="outline" onClick={() => triggerConfetti.streak()}>
                🔥 Streak
              </Button>
              <Button variant="outline" onClick={() => triggerConfetti.perfectScore()}>
                💯 Perfect
              </Button>
              <Button variant="outline" onClick={() => triggerConfetti.fireworks()}>
                🎆 Fireworks
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <GamificationSettings />

      {/* Instructions */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <ul>
            <li><strong>XP Animations:</strong> Floating +XP badges appear and animate upward</li>
            <li><strong>Level Up:</strong> Full-screen modal with confetti celebration</li>
            <li><strong>Badge Unlock:</strong> Animated badge reveal with rarity-specific effects</li>
            <li><strong>Streak:</strong> Fire-themed celebration for streak milestones</li>
            <li><strong>Toasts:</strong> Slide-in notifications for quick feedback</li>
            <li><strong>Confetti:</strong> Various particle effects for celebrations</li>
          </ul>
          <p className="text-muted-foreground">
            Note: Sound effects require audio files in <code>/public/sounds/</code>. 
            See the README in that folder for required files.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
