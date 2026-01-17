'use client';

/**
 * Confetti Burst Component
 * Reusable confetti effects for celebrations
 */

import { useCallback } from 'react';

export type ConfettiPreset = 
  | 'celebration'
  | 'levelUp'
  | 'badge'
  | 'streak'
  | 'perfectScore'
  | 'goalComplete'
  | 'fireworks';

interface ConfettiOptions {
  particleCount?: number;
  spread?: number;
  origin?: { x: number; y: number };
  colors?: string[];
}

// Lazy load confetti to avoid SSR issues
let confettiModule: any = null;

const loadConfetti = async () => {
  if (typeof window === 'undefined') return null;
  if (!confettiModule) {
    const mod = await import('canvas-confetti');
    confettiModule = mod.default;
  }
  return confettiModule;
};

// Initialize on client side
if (typeof window !== 'undefined') {
  loadConfetti();
}

// Helper to run confetti with lazy loading
const runConfetti = async (options: any) => {
  const confetti = await loadConfetti();
  if (confetti) {
    confetti(options);
  }
};

// Preset configurations
const PRESETS: Record<ConfettiPreset, () => void> = {
  celebration: () => {
    runConfetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6B35', '#00D4FF', '#9B59B6'],
    });
  },

  levelUp: () => {
    // Left burst
    runConfetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#FFD700', '#FFA500', '#FF6B35'],
    });
    // Right burst
    runConfetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#FFD700', '#FFA500', '#FF6B35'],
    });
    // Center delayed burst
    setTimeout(() => {
      runConfetti({
        particleCount: 100,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FF6B35', '#9B59B6'],
      });
    }, 250);
  },

  badge: () => {
    runConfetti({
      particleCount: 80,
      spread: 60,
      origin: { x: 0.5, y: 0.4 },
      colors: ['#9B59B6', '#8B5CF6', '#A855F7', '#FFD700'],
    });
  },

  streak: () => {
    runConfetti({
      particleCount: 100,
      spread: 80,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#FF6B35', '#FF4500', '#FF8C00', '#FFD700', '#FFA500'],
      shapes: ['circle'],
    });
  },

  perfectScore: () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      runConfetti({
        particleCount: 30,
        spread: 60,
        origin: {
          x: Math.random(),
          y: Math.random() - 0.2,
        },
        colors: ['#FFD700', '#00FF00', '#00D4FF'],
      });
    }, 250);
  },

  goalComplete: () => {
    runConfetti({
      particleCount: 60,
      spread: 50,
      origin: { x: 0.5, y: 0.7 },
      colors: ['#10B981', '#34D399', '#6EE7B7', '#FFD700'],
    });
  },

  fireworks: () => {
    const duration = 5000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      runConfetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FF6B35', '#9B59B6'],
      });
      runConfetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#00D4FF', '#00FF00', '#FF69B4'],
      });
    }, 250);
  },
};

/**
 * Hook for triggering confetti effects
 */
export function useConfetti() {
  const trigger = useCallback((preset: ConfettiPreset) => {
    PRESETS[preset]?.();
  }, []);

  const custom = useCallback((options: ConfettiOptions) => {
    runConfetti({
      particleCount: options.particleCount ?? 100,
      spread: options.spread ?? 70,
      origin: options.origin ?? { x: 0.5, y: 0.6 },
      colors: options.colors ?? ['#FFD700', '#FFA500', '#FF6B35'],
    });
  }, []);

  const stop = useCallback(async () => {
    const confetti = await loadConfetti();
    if (confetti) {
      confetti.reset();
    }
  }, []);

  return { trigger, custom, stop };
}

/**
 * Trigger confetti directly without hook
 */
export const triggerConfetti = {
  celebration: () => PRESETS.celebration(),
  levelUp: () => PRESETS.levelUp(),
  badge: () => PRESETS.badge(),
  streak: () => PRESETS.streak(),
  perfectScore: () => PRESETS.perfectScore(),
  goalComplete: () => PRESETS.goalComplete(),
  fireworks: () => PRESETS.fireworks(),
  custom: (options: ConfettiOptions) => {
    runConfetti({
      particleCount: options.particleCount ?? 100,
      spread: options.spread ?? 70,
      origin: options.origin ?? { x: 0.5, y: 0.6 },
      colors: options.colors ?? ['#FFD700', '#FFA500', '#FF6B35'],
    });
  },
  stop: async () => {
    const confetti = await loadConfetti();
    if (confetti) {
      confetti.reset();
    }
  },
};
