'use client';

/**
 * Daily Goal Ring Component
 * Circular progress indicator for daily goals (Duolingo-style)
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Target, Clock, Check, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DailyGoal } from '@/lib/gamification/daily-goals-service';

interface DailyGoalRingProps {
  goal: DailyGoal | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  showStats?: boolean;
  animate?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZES = {
  sm: { ring: 60, stroke: 4, icon: 16, text: 'text-xs' },
  md: { ring: 80, stroke: 5, icon: 20, text: 'text-sm' },
  lg: { ring: 120, stroke: 6, icon: 28, text: 'text-base' },
  xl: { ring: 160, stroke: 8, icon: 36, text: 'text-lg' },
};

const GOAL_COLORS = {
  xp: {
    primary: '#EAB308', // yellow-500
    secondary: '#FEF08A', // yellow-200
    bg: 'bg-yellow-500/10',
    glow: 'shadow-yellow-500/30',
  },
  questions: {
    primary: '#3B82F6', // blue-500
    secondary: '#BFDBFE', // blue-200
    bg: 'bg-blue-500/10',
    glow: 'shadow-blue-500/30',
  },
  time: {
    primary: '#22C55E', // green-500
    secondary: '#BBF7D0', // green-200
    bg: 'bg-green-500/10',
    glow: 'shadow-green-500/30',
  },
};

const GOAL_ICONS = {
  xp: Zap,
  questions: Target,
  time: Clock,
};

export function DailyGoalRing({
  goal,
  size = 'md',
  showLabel = true,
  showStats = true,
  animate = true,
  onClick,
  className,
}: DailyGoalRingProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  
  const sizeConfig = SIZES[size];
  const goalType = goal?.goal_type || 'xp';
  const colors = GOAL_COLORS[goalType];
  const Icon = GOAL_ICONS[goalType];
  
  const progress = goal 
    ? Math.min((goal.current_value / goal.target_value) * 100, 100) 
    : 0;
  const isCompleted = goal?.is_completed || false;

  // Animate progress on mount/change
  useEffect(() => {
    if (!animate) {
      setDisplayProgress(progress);
      return;
    }

    const timer = setTimeout(() => {
      setDisplayProgress(progress);
    }, 100);

    return () => clearTimeout(timer);
  }, [progress, animate]);

  // SVG calculations
  const radius = (sizeConfig.ring - sizeConfig.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (displayProgress / 100) * circumference;

  if (!goal) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div 
          className="rounded-full bg-muted animate-pulse"
          style={{ width: sizeConfig.ring, height: sizeConfig.ring }}
        />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        'flex flex-col items-center gap-2',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Ring Container */}
      <div className="relative" style={{ width: sizeConfig.ring, height: sizeConfig.ring }}>
        {/* Glow effect when completed */}
        {isCompleted && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.1, opacity: 0.5 }}
            transition={{ duration: 0.5 }}
            className={cn(
              'absolute inset-0 rounded-full blur-xl',
              colors.bg
            )}
          />
        )}

        {/* SVG Ring */}
        <svg
          width={sizeConfig.ring}
          height={sizeConfig.ring}
          className="transform -rotate-90"
        >
          {/* Background ring */}
          <circle
            cx={sizeConfig.ring / 2}
            cy={sizeConfig.ring / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={sizeConfig.stroke}
            className="text-muted/30"
          />
          
          {/* Progress ring */}
          <motion.circle
            cx={sizeConfig.ring / 2}
            cy={sizeConfig.ring / 2}
            r={radius}
            fill="none"
            stroke={colors.primary}
            strokeWidth={sizeConfig.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: animate ? 1 : 0, ease: "easeOut" }}
            style={{
              filter: isCompleted ? `drop-shadow(0 0 6px ${colors.primary})` : undefined,
            }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {isCompleted ? (
              <motion.div
                key="completed"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Check 
                  className="text-green-500" 
                  style={{ width: sizeConfig.icon, height: sizeConfig.icon }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="progress"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                <Icon 
                  style={{ width: sizeConfig.icon * 0.8, height: sizeConfig.icon * 0.8, color: colors.primary }}
                />
                {size !== 'sm' && (
                  <span className={cn('font-bold mt-0.5', sizeConfig.text)} style={{ color: colors.primary }}>
                    {Math.round(progress)}%
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <div className="text-center">
          <p className={cn('font-medium', sizeConfig.text)}>
            {goalType === 'xp' && 'XP Goal'}
            {goalType === 'questions' && 'Questions'}
            {goalType === 'time' && 'Study Time'}
          </p>
        </div>
      )}

      {/* Stats */}
      {showStats && (
        <div className="text-center">
          <p className={cn('text-muted-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>
            <span className="font-semibold" style={{ color: colors.primary }}>
              {goal.current_value}
            </span>
            {' / '}
            <span>{goal.target_value}</span>
            {' '}
            <span className="text-xs">
              {goalType === 'xp' && 'XP'}
              {goalType === 'questions' && 'Q'}
              {goalType === 'time' && 'min'}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version showing all three goals in a row
 */
interface DailyGoalsRowProps {
  goals: DailyGoal[];
  size?: 'sm' | 'md';
  onGoalClick?: (goal: DailyGoal) => void;
  className?: string;
}

export function DailyGoalsRow({ goals, size = 'sm', onGoalClick, className }: DailyGoalsRowProps) {
  const goalOrder: ('xp' | 'questions' | 'time')[] = ['xp', 'questions', 'time'];
  
  return (
    <div className={cn('flex items-center justify-center gap-4', className)}>
      {goalOrder.map((type) => {
        const goal = goals.find(g => g.goal_type === type) || null;
        return (
          <DailyGoalRing
            key={type}
            goal={goal}
            size={size}
            showLabel={false}
            showStats={false}
            onClick={() => goal && onGoalClick?.(goal)}
          />
        );
      })}
    </div>
  );
}

/**
 * Goal widget with streak info
 */
interface DailyGoalWidgetProps {
  goal: DailyGoal | null;
  streak?: number;
  onPress?: () => void;
  className?: string;
}

export function DailyGoalWidget({ goal, streak = 0, onPress, className }: DailyGoalWidgetProps) {
  const isCompleted = goal?.is_completed || false;
  const progress = goal ? Math.round((goal.current_value / goal.target_value) * 100) : 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPress}
      className={cn(
        'relative p-4 rounded-2xl cursor-pointer transition-all',
        'bg-gradient-to-br border',
        isCompleted 
          ? 'from-green-500/20 to-emerald-500/10 border-green-500/30' 
          : 'from-yellow-500/10 to-orange-500/5 border-yellow-500/20',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* Ring */}
        <DailyGoalRing
          goal={goal}
          size="md"
          showLabel={false}
          showStats={false}
        />

        {/* Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">
              {isCompleted ? 'Goal Complete!' : 'Daily Goal'}
            </h3>
            {streak > 0 && (
              <div className="flex items-center gap-1 text-orange-500 text-sm">
                <Flame className="h-4 w-4 fill-orange-500" />
                <span className="font-bold">{streak}</span>
              </div>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mt-0.5">
            {isCompleted ? (
              'Great job! See you tomorrow!'
            ) : goal ? (
              <>
                {goal.current_value} / {goal.target_value} XP earned today
              </>
            ) : (
              'Loading...'
            )}
          </p>

          {/* Progress bar */}
          {!isCompleted && goal && (
            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          )}
        </div>

        {/* Completion badge */}
        {isCompleted && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center"
          >
            <Check className="h-6 w-6 text-white" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
