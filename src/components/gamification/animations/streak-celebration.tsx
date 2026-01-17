'use client';

/**
 * Streak Celebration Component
 * Animated celebration for streak milestones
 */

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Zap, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { useGamificationStore, selectStreakMilestoneEvent, selectAnimationsEnabled } from '@/lib/gamification/stores/gamification-store';
import { soundManager } from '@/lib/gamification/sound-manager';

const STREAK_COLORS = {
  small: { // 3-6 days
    flame: 'text-orange-400',
    bg: 'from-orange-400 to-red-500',
    glow: 'bg-orange-400/30',
  },
  medium: { // 7-29 days
    flame: 'text-red-500',
    bg: 'from-red-500 to-pink-600',
    glow: 'bg-red-500/30',
  },
  large: { // 30-99 days
    flame: 'text-purple-500',
    bg: 'from-purple-500 to-violet-600',
    glow: 'bg-purple-500/30',
  },
  legendary: { // 100+ days
    flame: 'text-yellow-400',
    bg: 'from-yellow-400 via-orange-500 to-red-600',
    glow: 'bg-yellow-400/40',
  },
};

function getStreakTier(days: number) {
  if (days >= 100) return 'legendary';
  if (days >= 30) return 'large';
  if (days >= 7) return 'medium';
  return 'small';
}

export function StreakCelebration() {
  const streakMilestoneEvent = useGamificationStore(selectStreakMilestoneEvent);
  const dismissStreakMilestone = useGamificationStore((state) => state.dismissStreakMilestone);
  const animationsEnabled = useGamificationStore(selectAnimationsEnabled);

  const triggerFireConfetti = useCallback((days: number) => {
    if (!animationsEnabled) return;
    
    const tier = getStreakTier(days);
    const particleCount = tier === 'legendary' ? 150 : tier === 'large' ? 100 : 60;
    
    // Fire-colored confetti
    confetti({
      particleCount,
      spread: 80,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#FF6B35', '#FF4500', '#FF8C00', '#FFD700', '#FFA500'],
      shapes: ['circle'],
    });

    // Additional burst for legendary
    if (tier === 'legendary') {
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 100,
          origin: { x: 0.3, y: 0.6 },
          colors: ['#FFD700', '#FFA500'],
        });
        confetti({
          particleCount: 50,
          spread: 100,
          origin: { x: 0.7, y: 0.6 },
          colors: ['#FFD700', '#FFA500'],
        });
      }, 300);
    }
  }, [animationsEnabled]);

  useEffect(() => {
    if (streakMilestoneEvent) {
      soundManager.play('streak_milestone');
      triggerFireConfetti(streakMilestoneEvent.days);
    }
  }, [streakMilestoneEvent, triggerFireConfetti]);

  if (!streakMilestoneEvent) return null;

  const tier = getStreakTier(streakMilestoneEvent.days);
  const colors = STREAK_COLORS[tier];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={dismissStreakMilestone}
      >
        <motion.div
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0, y: 50 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          className="relative max-w-sm w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glowing background */}
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute inset-0 ${colors.glow} rounded-3xl blur-2xl`} 
          />
          
          {/* Main card */}
          <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 shadow-2xl border border-orange-500/30">
            {/* Animated flames background */}
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ 
                    y: [-20, -100],
                    opacity: [0.3, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeOut",
                  }}
                  className="absolute bottom-0"
                  style={{ left: `${15 + i * 18}%` }}
                >
                  <Flame className={`h-16 w-16 ${colors.flame} opacity-30`} />
                </motion.div>
              ))}
            </div>

            {/* Content */}
            <div className="relative text-center space-y-6">
              {/* Header */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-center gap-2"
              >
                <Flame className={`h-6 w-6 ${colors.flame}`} />
                <span className="text-lg font-semibold uppercase tracking-wider text-orange-400">
                  Streak Milestone!
                </span>
                <Flame className={`h-6 w-6 ${colors.flame}`} />
              </motion.div>

              {/* Streak counter */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 10,
                  delay: 0.2,
                }}
                className="relative"
              >
                {/* Glow effect */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={`absolute inset-0 mx-auto w-32 h-32 ${colors.glow} rounded-full blur-2xl`}
                />
                
                {/* Streak badge */}
                <div className={`relative inline-flex flex-col items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br ${colors.bg} shadow-lg`}>
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  >
                    <Flame className="h-10 w-10 text-white fill-white" />
                  </motion.div>
                  <span className="text-4xl font-black text-white">
                    {streakMilestoneEvent.days}
                  </span>
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <h2 className="text-2xl font-bold text-white">
                  {streakMilestoneEvent.title}
                </h2>
                <p className="text-gray-400">
                  {streakMilestoneEvent.days} day streak achieved!
                </p>
              </motion.div>

              {/* XP Reward */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30"
              >
                <Zap className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 font-bold">
                  +{streakMilestoneEvent.xpReward} XP Bonus
                </span>
              </motion.div>

              {/* Continue button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button 
                  onClick={dismissStreakMilestone}
                  className={`w-full bg-gradient-to-r ${colors.bg} hover:opacity-90 text-white font-semibold py-3`}
                >
                  <Flame className="h-5 w-5 mr-2" />
                  Keep the Fire Burning!
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
