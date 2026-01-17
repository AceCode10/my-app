'use client';

/**
 * Badge Unlock Modal Component
 * Animated badge reveal when user earns a new badge
 */

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { useGamificationStore, selectBadgeUnlockEvent, selectAnimationsEnabled } from '@/lib/gamification/stores/gamification-store';
import { soundManager } from '@/lib/gamification/sound-manager';

const RARITY_COLORS = {
  common: {
    bg: 'from-gray-400 to-gray-500',
    glow: 'bg-gray-400/30',
    text: 'text-gray-300',
    border: 'border-gray-400/50',
  },
  uncommon: {
    bg: 'from-green-400 to-emerald-500',
    glow: 'bg-green-400/30',
    text: 'text-green-300',
    border: 'border-green-400/50',
  },
  rare: {
    bg: 'from-blue-400 to-cyan-500',
    glow: 'bg-blue-400/30',
    text: 'text-blue-300',
    border: 'border-blue-400/50',
  },
  epic: {
    bg: 'from-purple-400 to-violet-500',
    glow: 'bg-purple-400/30',
    text: 'text-purple-300',
    border: 'border-purple-400/50',
  },
  legendary: {
    bg: 'from-yellow-400 via-orange-500 to-red-500',
    glow: 'bg-yellow-400/40',
    text: 'text-yellow-300',
    border: 'border-yellow-400/50',
  },
};

const RARITY_LABELS = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export function BadgeUnlockModal() {
  const badgeUnlockEvent = useGamificationStore(selectBadgeUnlockEvent);
  const dismissBadgeUnlock = useGamificationStore((state) => state.dismissBadgeUnlock);
  const animationsEnabled = useGamificationStore(selectAnimationsEnabled);

  const triggerConfetti = useCallback((rarity: string) => {
    if (!animationsEnabled) return;
    
    const colors = rarity === 'legendary' 
      ? ['#FFD700', '#FFA500', '#FF6B35']
      : rarity === 'epic'
        ? ['#9B59B6', '#8B5CF6', '#A855F7']
        : rarity === 'rare'
          ? ['#3B82F6', '#06B6D4', '#0EA5E9']
          : ['#10B981', '#34D399', '#6EE7B7'];

    // Burst from badge position
    confetti({
      particleCount: rarity === 'legendary' ? 100 : 50,
      spread: 70,
      origin: { x: 0.5, y: 0.4 },
      colors,
    });
  }, [animationsEnabled]);

  useEffect(() => {
    if (badgeUnlockEvent) {
      soundManager.playBadgeUnlock(badgeUnlockEvent.rarity);
      
      // Delay confetti for dramatic effect
      setTimeout(() => {
        triggerConfetti(badgeUnlockEvent.rarity);
      }, 500);
    }
  }, [badgeUnlockEvent, triggerConfetti]);

  if (!badgeUnlockEvent) return null;

  const colors = RARITY_COLORS[badgeUnlockEvent.rarity];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={dismissBadgeUnlock}
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
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
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={`absolute inset-0 ${colors.glow} rounded-3xl blur-2xl`} 
          />
          
          {/* Main card */}
          <div className={`relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 shadow-2xl border ${colors.border}`}>
            {/* Header */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-center mb-6"
            >
              <div className="flex items-center justify-center gap-2 text-yellow-400">
                <Trophy className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  Badge Unlocked!
                </span>
                <Trophy className="h-5 w-5" />
              </div>
            </motion.div>

            {/* Badge icon container */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 12,
                delay: 0.2,
              }}
              className="relative flex justify-center mb-6"
            >
              {/* Glow ring */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className={`absolute inset-0 mx-auto w-28 h-28 ${colors.glow} rounded-full blur-xl`}
              />
              
              {/* Badge */}
              <div className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${colors.bg} flex items-center justify-center shadow-lg`}>
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="text-5xl"
                >
                  {badgeUnlockEvent.icon}
                </motion.span>
                
                {/* Sparkle effects for legendary */}
                {badgeUnlockEvent.rarity === 'legendary' && (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-2 -right-2"
                    >
                      <Sparkles className="h-6 w-6 text-yellow-300" />
                    </motion.div>
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                      className="absolute -bottom-1 -left-1"
                    >
                      <Star className="h-5 w-5 text-orange-300 fill-orange-300" />
                    </motion.div>
                  </>
                )}
              </div>
            </motion.div>

            {/* Badge info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center space-y-3"
            >
              {/* Rarity badge */}
              <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${colors.text} bg-white/10`}>
                {RARITY_LABELS[badgeUnlockEvent.rarity]}
              </div>
              
              {/* Badge name */}
              <h2 className="text-2xl font-bold text-white">
                {badgeUnlockEvent.name}
              </h2>
              
              {/* Description */}
              <p className="text-gray-400 text-sm">
                {badgeUnlockEvent.description}
              </p>
            </motion.div>

            {/* Continue button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8"
            >
              <Button 
                onClick={dismissBadgeUnlock}
                className={`w-full bg-gradient-to-r ${colors.bg} hover:opacity-90 text-white font-semibold py-3`}
              >
                Awesome!
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
