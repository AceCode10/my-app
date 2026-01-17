'use client';

/**
 * XP Gain Overlay Component
 * Displays floating +XP animations when XP is earned
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';
import { useGamificationStore, selectXPGains, selectAnimationsEnabled } from '@/lib/gamification/stores/gamification-store';
import { soundManager } from '@/lib/gamification/sound-manager';

interface XPGainOverlayProps {
  // If provided, XP animations appear at fixed position
  // Otherwise they appear at mouse/touch position or center
  fixedPosition?: { x: number; y: number };
}

export function XPGainOverlay({ fixedPosition }: XPGainOverlayProps) {
  const xpGains = useGamificationStore(selectXPGains);
  const animationsEnabled = useGamificationStore(selectAnimationsEnabled);

  // Play sound when new XP gain is added
  useEffect(() => {
    if (xpGains.length > 0) {
      const latestGain = xpGains[xpGains.length - 1];
      soundManager.playXPGain(latestGain.amount);
    }
  }, [xpGains.length]);

  if (!animationsEnabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence mode="popLayout">
        {xpGains.map((gain) => {
          const position = gain.position || fixedPosition || {
            x: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
            y: typeof window !== 'undefined' ? window.innerHeight / 2 : 300,
          };

          return (
            <motion.div
              key={gain.id}
              initial={{ 
                opacity: 0, 
                scale: 0.5, 
                x: position.x - 40, 
                y: position.y 
              }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0.5, 1.2, 1, 0.8],
                y: [position.y, position.y - 30, position.y - 60, position.y - 100],
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ 
                duration: 1.5,
                ease: "easeOut",
                times: [0, 0.2, 0.5, 1]
              }}
              className="absolute"
            >
              <div className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full
                font-bold text-lg shadow-lg
                ${gain.amount >= 50 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' 
                  : gain.amount >= 20 
                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                    : 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white'
                }
              `}>
                <Zap className="h-5 w-5 fill-current" />
                <span>+{gain.amount} XP</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/**
 * Compact XP gain indicator for inline use
 */
export function XPGainInline({ amount, className = '' }: { amount: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -5 }}
      className={`inline-flex items-center gap-1 text-sm font-semibold text-green-600 ${className}`}
    >
      <Zap className="h-4 w-4 fill-current" />
      +{amount} XP
    </motion.div>
  );
}

/**
 * XP Counter with animated number change
 */
export function AnimatedXPCounter({ 
  value, 
  className = '' 
}: { 
  value: number; 
  className?: string;
}) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      {value.toLocaleString()}
    </motion.span>
  );
}
