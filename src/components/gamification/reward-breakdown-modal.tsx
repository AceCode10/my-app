'use client';

/**
 * Reward Breakdown Modal
 * Shows detailed breakdown of rewards earned after completing an activity
 * Helps students understand exactly what they earned and why
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Gem, Target, Flame, Trophy, Star, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { RewardBreakdown, RewardBonus, DailyGoalProgressUpdate, QuestProgressUpdate } from '@/lib/gamification/reward-engine';
import { soundManager } from '@/lib/gamification/sound-manager';
import { triggerConfetti } from './animations/confetti-burst';

interface RewardBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  breakdown: RewardBreakdown | null;
  activityName?: string;
}

export function RewardBreakdownModal({
  isOpen,
  onClose,
  breakdown,
  activityName = 'Activity',
}: RewardBreakdownModalProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    if (isOpen && breakdown) {
      setAnimationPhase(0);
      setShowDetails(false);

      // Progressive animation phases
      const timers = [
        setTimeout(() => setAnimationPhase(1), 300),  // Show XP
        setTimeout(() => setAnimationPhase(2), 800),  // Show bonuses
        setTimeout(() => setAnimationPhase(3), 1500), // Show gems
        setTimeout(() => setAnimationPhase(4), 2000), // Show progress
        setTimeout(() => setShowDetails(true), 2500), // Enable details
      ];

      // Play sound
      if (breakdown.totalXP > 50) {
        soundManager.play('level_up');
      } else {
        soundManager.play('xp_gain');
      }

      // Confetti for big rewards
      if (breakdown.leveledUp || breakdown.badgesUnlocked.length > 0) {
        setTimeout(() => triggerConfetti.levelUp(), 500);
      } else if (breakdown.totalXP > 30) {
        setTimeout(() => triggerConfetti.celebration(), 500);
      }

      return () => timers.forEach(clearTimeout);
    }
  }, [isOpen, breakdown]);

  if (!breakdown) return null;

  const hasGoalProgress = breakdown.dailyGoalProgress.some(g => g.justCompleted || g.newValue > g.previousValue);
  const hasQuestProgress = breakdown.questProgress.some(q => q.justCompleted || q.newProgress > q.previousProgress);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-md bg-background rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with gradient */}
            <div className="relative p-6 pb-4 bg-gradient-to-b from-primary/20 via-primary/10 to-transparent">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: animationPhase >= 1 ? 1 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-3"
                >
                  <Trophy className="h-8 w-8 text-primary" />
                </motion.div>
                <h2 className="text-xl font-bold">{activityName} Complete!</h2>
                <p className="text-sm text-muted-foreground mt-1">Here's what you earned</p>
              </div>
            </div>

            {/* Main rewards */}
            <div className="px-6 pb-6 space-y-4">
              {/* Total XP - Big display */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: animationPhase >= 1 ? 1 : 0, y: animationPhase >= 1 ? 0 : 20 }}
                className="text-center py-4"
              >
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-8 w-8 text-yellow-500" />
                  <AnimatedNumber value={breakdown.totalXP} className="text-4xl font-bold text-yellow-500" />
                  <span className="text-2xl font-bold text-yellow-500">XP</span>
                </div>
              </motion.div>

              {/* XP Breakdown */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ 
                  opacity: animationPhase >= 2 ? 1 : 0, 
                  height: animationPhase >= 2 ? 'auto' : 0 
                }}
                className="space-y-2 overflow-hidden"
              >
                {/* Base XP */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Base XP</span>
                  <span className="font-medium">+{breakdown.baseXP}</span>
                </div>

                {/* Bonuses */}
                {breakdown.bonuses.map((bonus, i) => (
                  <BonusRow key={i} bonus={bonus} delay={i * 100} />
                ))}
              </motion.div>

              {/* Gems earned */}
              {breakdown.gemsEarned > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: animationPhase >= 3 ? 1 : 0, x: animationPhase >= 3 ? 0 : -20 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20"
                >
                  <div className="flex items-center gap-2">
                    <Gem className="h-5 w-5 text-cyan-400" />
                    <span className="font-medium">Gems Earned</span>
                  </div>
                  <span className="font-bold text-cyan-400">+{breakdown.gemsEarned}</span>
                </motion.div>
              )}

              {/* Daily Goal Progress */}
              {hasGoalProgress && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: animationPhase >= 4 ? 1 : 0, y: animationPhase >= 4 ? 0 : 20 }}
                  className="space-y-2"
                >
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    Daily Goals
                  </h3>
                  {breakdown.dailyGoalProgress.map((goal, i) => (
                    <GoalProgressRow key={i} goal={goal} />
                  ))}
                </motion.div>
              )}

              {/* Quest Progress */}
              {hasQuestProgress && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: animationPhase >= 4 ? 1 : 0, y: animationPhase >= 4 ? 0 : 20 }}
                  className="space-y-2"
                >
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Quest Progress
                  </h3>
                  {breakdown.questProgress.map((quest, i) => (
                    <QuestProgressRow key={i} quest={quest} />
                  ))}
                </motion.div>
              )}

              {/* Streak */}
              {breakdown.streakUpdated && breakdown.newStreakDays > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: animationPhase >= 4 ? 1 : 0, scale: animationPhase >= 4 ? 1 : 0.8 }}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20"
                >
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span className="font-bold text-orange-500">{breakdown.newStreakDays} Day Streak!</span>
                  {breakdown.streakMilestone && (
                    <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                      {breakdown.streakMilestone.title}
                    </span>
                  )}
                </motion.div>
              )}

              {/* Level Up */}
              {breakdown.leveledUp && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="text-center p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30"
                >
                  <p className="text-sm text-muted-foreground">Level Up!</p>
                  <p className="text-2xl font-bold text-purple-500">
                    Level {breakdown.newLevel}
                  </p>
                  <p className="text-sm text-purple-400">{breakdown.newTitle}</p>
                </motion.div>
              )}

              {/* Badges */}
              {breakdown.badgesUnlocked.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="space-y-2"
                >
                  <h3 className="text-sm font-medium">🏆 Badges Unlocked!</h3>
                  {breakdown.badgesUnlocked.map((badge, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
                    >
                      <span className="text-2xl">{badge.icon}</span>
                      <div>
                        <p className="font-medium">{badge.name}</p>
                        <p className="text-xs text-muted-foreground">{badge.description}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Continue button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showDetails ? 1 : 0 }}
              >
                <Button onClick={onClose} className="w-full mt-4" size="lg">
                  Continue
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Animated number counter
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let current = 0;
    const steps = 20;
    const increment = value / steps;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, 30);
    return () => clearInterval(interval);
  }, [value]);

  return <span className={className}>{displayValue}</span>;
}

// Bonus row with animation
function BonusRow({ bonus, delay }: { bonus: RewardBonus; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay / 1000 }}
      className="flex items-center justify-between text-sm"
    >
      <div className="flex items-center gap-2">
        <span>{bonus.icon}</span>
        <span className="text-muted-foreground">{bonus.label}</span>
      </div>
      <span className="font-medium text-green-500">+{bonus.amount}</span>
    </motion.div>
  );
}

// Goal progress row
function GoalProgressRow({ goal }: { goal: DailyGoalProgressUpdate }) {
  const progress = (goal.newValue / goal.targetValue) * 100;
  const goalTypeLabels = { xp: 'XP Goal', questions: 'Questions Goal', time: 'Time Goal' };

  return (
    <div className="p-2 rounded-lg bg-muted/30">
      <div className="flex items-center justify-between text-sm mb-1">
        <span>{goalTypeLabels[goal.goalType]}</span>
        {goal.justCompleted ? (
          <span className="flex items-center gap-1 text-green-500 font-medium">
            <Check className="h-3 w-3" /> Complete!
          </span>
        ) : (
          <span className="text-muted-foreground">
            {goal.newValue}/{goal.targetValue}
          </span>
        )}
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

// Quest progress row
function QuestProgressRow({ quest }: { quest: QuestProgressUpdate }) {
  const progress = (quest.newProgress / quest.targetProgress) * 100;

  return (
    <div className={cn(
      "p-2 rounded-lg",
      quest.justCompleted ? "bg-green-500/10" : "bg-muted/30"
    )}>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="truncate">{quest.questName}</span>
        {quest.justCompleted ? (
          <span className="flex items-center gap-1 text-green-500 font-medium shrink-0">
            <Check className="h-3 w-3" /> +{quest.xpReward} XP
          </span>
        ) : (
          <span className="text-muted-foreground shrink-0">
            {quest.newProgress}/{quest.targetProgress}
          </span>
        )}
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}

// Hook for using reward breakdown
export function useRewardBreakdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [breakdown, setBreakdown] = useState<RewardBreakdown | null>(null);
  const [activityName, setActivityName] = useState('Activity');

  const showBreakdown = (data: RewardBreakdown, name?: string) => {
    setBreakdown(data);
    setActivityName(name || 'Activity');
    setIsOpen(true);
  };

  const closeBreakdown = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    breakdown,
    activityName,
    showBreakdown,
    closeBreakdown,
  };
}
