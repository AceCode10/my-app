/**
 * Gamification Components Export
 * Central export point for all gamification-related components
 */

// Core display components
export { NotificationBell } from '@/components/notification-bell';
export { Leaderboard } from './leaderboard';
export { XPProgressBar } from './xp-progress-bar';
export { StreakDisplay } from './streak-display';
export { BadgeDisplay } from './badge-display';

// Animation components
export {
  XPGainOverlay,
  XPGainInline,
  AnimatedXPCounter,
  LevelUpModal,
  BadgeUnlockModal,
  StreakCelebration,
  AchievementToastContainer,
  addToast,
  removeToast,
  clearToasts,
  toast,
  useConfetti,
  triggerConfetti,
} from './animations';

// Quiz integration
export { QuizCompletionCelebration, useQuizCelebration } from './quiz-completion-celebration';

// Daily goals components
export { DailyGoalRing, DailyGoalsRow, DailyGoalWidget } from './daily-goal-ring';
export { GoalSelectionModal, GoalDifficultySelector } from './goal-selection-modal';
export { DailyQuestsPanel, CompactQuestList } from './daily-quests-panel';

// League components
export { LeagueBadge, LeagueProgress } from './league-badge';
export { LeagueLeaderboard, LeagueWidget } from './league-leaderboard';

// Reward breakdown
export { RewardBreakdownModal, useRewardBreakdown } from './reward-breakdown-modal';

// Settings widget
export { GamificationSettings } from './widgets/gamification-settings';

// Types
export type { AchievementToastData, ToastType, ConfettiPreset } from './animations';
