'use client';

/**
 * Goal Selection Modal
 * Allows users to choose their daily goal difficulty
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Zap, Target, Clock, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GoalPreset } from '@/lib/gamification/daily-goals-service';

interface GoalSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: GoalPreset[];
  currentDifficulty: string;
  onSelect: (difficulty: 'casual' | 'regular' | 'serious' | 'intense') => Promise<void>;
}

const DIFFICULTY_STYLES = {
  casual: {
    gradient: 'from-green-400 to-emerald-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-500',
    glow: 'shadow-green-500/20',
  },
  regular: {
    gradient: 'from-blue-400 to-cyan-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-500',
    glow: 'shadow-blue-500/20',
  },
  serious: {
    gradient: 'from-orange-400 to-red-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-500',
    glow: 'shadow-orange-500/20',
  },
  intense: {
    gradient: 'from-purple-400 to-pink-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-500',
    glow: 'shadow-purple-500/20',
  },
};

export function GoalSelectionModal({
  isOpen,
  onClose,
  presets,
  currentDifficulty,
  onSelect,
}: GoalSelectionModalProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState(currentDifficulty);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selectedDifficulty === currentDifficulty) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await onSelect(selectedDifficulty as 'casual' | 'regular' | 'serious' | 'intense');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-6 pb-4 bg-gradient-to-b from-primary/10 to-transparent">
              <button
                onClick={onClose}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Set Your Daily Goal</h2>
                  <p className="text-sm text-muted-foreground">
                    Choose a goal that works for you
                  </p>
                </div>
              </div>
            </div>

            {/* Presets */}
            <div className="p-6 space-y-3">
              {presets.map((preset, index) => {
                const styles = DIFFICULTY_STYLES[preset.difficulty as keyof typeof DIFFICULTY_STYLES];
                const isSelected = selectedDifficulty === preset.difficulty;
                
                return (
                  <motion.button
                    key={preset.difficulty}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedDifficulty(preset.difficulty)}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 transition-all text-left',
                      'hover:shadow-lg',
                      isSelected
                        ? `${styles.border} ${styles.bg} shadow-lg ${styles.glow}`
                        : 'border-muted hover:border-muted-foreground/30'
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0',
                        isSelected ? `bg-gradient-to-br ${styles.gradient} text-white` : 'bg-muted'
                      )}>
                        {preset.icon}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{preset.display_name}</h3>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className={cn(
                                'w-5 h-5 rounded-full flex items-center justify-center',
                                `bg-gradient-to-br ${styles.gradient}`
                              )}
                            >
                              <Check className="h-3 w-3 text-white" />
                            </motion.div>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {preset.description}
                        </p>

                        {/* Stats */}
                        <div className="flex flex-wrap gap-3 mt-2">
                          <div className="flex items-center gap-1 text-xs">
                            <Zap className={cn('h-3.5 w-3.5', isSelected ? styles.text : 'text-yellow-500')} />
                            <span>{preset.xp_target} XP</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Target className={cn('h-3.5 w-3.5', isSelected ? styles.text : 'text-blue-500')} />
                            <span>{preset.questions_target} questions</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className={cn('h-3.5 w-3.5', isSelected ? styles.text : 'text-green-500')} />
                            <span>{preset.time_target_minutes} min</span>
                          </div>
                        </div>

                        {/* Bonus */}
                        {preset.xp_bonus > 0 && (
                          <div className={cn(
                            'inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium',
                            isSelected ? styles.bg : 'bg-muted'
                          )}>
                            <Flame className="h-3 w-3 text-orange-500" />
                            +{preset.xp_bonus} XP bonus on completion
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-6 pt-2 border-t">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? 'Saving...' : 'Set Goal'}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                You can change your goal anytime
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Inline goal difficulty selector (for settings page)
 */
interface GoalDifficultySelectorProps {
  presets: GoalPreset[];
  currentDifficulty: string;
  onSelect: (difficulty: 'casual' | 'regular' | 'serious' | 'intense') => void;
  disabled?: boolean;
}

export function GoalDifficultySelector({
  presets,
  currentDifficulty,
  onSelect,
  disabled,
}: GoalDifficultySelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {presets.map((preset) => {
        const styles = DIFFICULTY_STYLES[preset.difficulty as keyof typeof DIFFICULTY_STYLES];
        const isSelected = currentDifficulty === preset.difficulty;
        
        return (
          <button
            key={preset.difficulty}
            onClick={() => onSelect(preset.difficulty as 'casual' | 'regular' | 'serious' | 'intense')}
            disabled={disabled}
            className={cn(
              'p-3 rounded-xl border-2 transition-all text-left',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isSelected
                ? `${styles.border} ${styles.bg}`
                : 'border-muted hover:border-muted-foreground/30'
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{preset.icon}</span>
              <div>
                <p className="font-medium text-sm">{preset.display_name}</p>
                <p className="text-xs text-muted-foreground">{preset.description}</p>
              </div>
              {isSelected && (
                <Check className={cn('h-4 w-4 ml-auto', styles.text)} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
