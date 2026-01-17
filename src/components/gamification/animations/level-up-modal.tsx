'use client';

/**
 * Level Up Modal Component
 * Full-screen celebration when user reaches a new level
 */

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Zap, ArrowUp, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { useGamificationStore, selectLevelUpEvent, selectAnimationsEnabled } from '@/lib/gamification/stores/gamification-store';
import { soundManager } from '@/lib/gamification/sound-manager';

export function LevelUpModal() {
  const levelUpEvent = useGamificationStore(selectLevelUpEvent);
  const dismissLevelUp = useGamificationStore((state) => state.dismissLevelUp);
  const animationsEnabled = useGamificationStore(selectAnimationsEnabled);

  const triggerConfetti = useCallback(() => {
    if (!animationsEnabled) return;
    
    // Left side burst
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { x: 0.2, y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6B35', '#00D4FF'],
    });

    // Right side burst
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { x: 0.8, y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6B35', '#00D4FF'],
    });

    // Center burst with delay
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FF6B35', '#00D4FF', '#9B59B6'],
      });
    }, 300);
  }, [animationsEnabled]);

  useEffect(() => {
    if (levelUpEvent) {
      soundManager.play('level_up');
      triggerConfetti();
    }
  }, [levelUpEvent, triggerConfetti]);

  if (!levelUpEvent) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={dismissLevelUp}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
          }}
          className="relative max-w-md w-full mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glowing background */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-orange-500/20 to-red-500/20 rounded-3xl blur-xl" />
          
          {/* Main card */}
          <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 shadow-2xl border border-yellow-500/30">
            {/* Decorative stars */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-6 -right-6"
            >
              <Sparkles className="h-12 w-12 text-yellow-400" />
            </motion.div>
            
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-4 -left-4"
            >
              <Star className="h-8 w-8 text-orange-400 fill-orange-400" />
            </motion.div>

            {/* Content */}
            <div className="text-center space-y-6">
              {/* Level up text */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-center gap-2 text-yellow-400">
                  <ArrowUp className="h-6 w-6" />
                  <span className="text-lg font-semibold uppercase tracking-wider">Level Up!</span>
                  <ArrowUp className="h-6 w-6" />
                </div>
              </motion.div>

              {/* Level number */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 10,
                  delay: 0.3 
                }}
                className="relative"
              >
                {/* Glow effect */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-yellow-400/30 rounded-full blur-2xl" />
                </div>
                
                {/* Level badge */}
                <div className="relative inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 shadow-lg">
                  <div className="flex flex-col items-center">
                    <Zap className="h-8 w-8 text-white fill-white mb-1" />
                    <span className="text-5xl font-black text-white">
                      {levelUpEvent.newLevel}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <h2 className="text-2xl font-bold text-white">
                  {levelUpEvent.newTitle}
                </h2>
                <p className="text-gray-400">
                  You've reached Level {levelUpEvent.newLevel}!
                </p>
              </motion.div>

              {/* Stats change */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex items-center justify-center gap-4 text-sm"
              >
                <div className="flex items-center gap-1 text-gray-500">
                  <span>Level {levelUpEvent.oldLevel}</span>
                </div>
                <ArrowUp className="h-4 w-4 text-green-400" />
                <div className="flex items-center gap-1 text-yellow-400 font-semibold">
                  <span>Level {levelUpEvent.newLevel}</span>
                </div>
              </motion.div>

              {/* Continue button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Button 
                  onClick={dismissLevelUp}
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold px-8 py-3 text-lg"
                >
                  Continue Learning
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
