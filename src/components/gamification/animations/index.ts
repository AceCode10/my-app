/**
 * Gamification Animation Components
 * Export all animation-related components
 */

export { XPGainOverlay, XPGainInline, AnimatedXPCounter } from './xp-gain-overlay';
export { LevelUpModal } from './level-up-modal';
export { BadgeUnlockModal } from './badge-unlock-modal';
export { StreakCelebration } from './streak-celebration';
export { 
  AchievementToastContainer, 
  addToast, 
  removeToast, 
  clearToasts,
  toast,
  type AchievementToastData,
  type ToastType 
} from './achievement-toast';
export { useConfetti, triggerConfetti, type ConfettiPreset } from './confetti-burst';
