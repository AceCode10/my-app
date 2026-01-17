'use client';

/**
 * Quiz Completion Celebration Component
 * Triggers appropriate celebrations based on quiz performance
 */

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Zap, Target, Clock, Award } from 'lucide-react';
import { useGamificationEvents } from '@/hooks/use-gamification-events';
import { Card } from '@/components/ui/card';

interface QuizCompletionCelebrationProps {
  userId: string;
  quizId: string;
  score: number;
  maxScore: number;
  timeSpentMinutes: number;
  isFirstQuiz?: boolean;
  onComplete?: (xpEarned: number) => void;
}

export function QuizCompletionCelebration({
  userId,
  quizId,
  score,
  maxScore,
  timeSpentMinutes,
  isFirstQuiz = false,
  onComplete,
}: QuizCompletionCelebrationProps) {
  const { handleQuizComplete } = useGamificationEvents();
  const hasTriggered = useRef(false);

  const percentage = Math.round((score / maxScore) * 100);
  const isPerfectScore = percentage === 100;

  useEffect(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    const triggerCelebration = async () => {
      const result = await handleQuizComplete({
        userId,
        quizId,
        score,
        maxScore,
        percentage,
        timeSpentMinutes,
        isPerfectScore,
        isFirstQuiz,
      });

      onComplete?.(result.xpEarned);
    };

    // Small delay to ensure component is mounted
    const timer = setTimeout(triggerCelebration, 500);
    return () => clearTimeout(timer);
  }, []);

  // Calculate bonuses earned
  const bonuses = [];
  if (isPerfectScore) bonuses.push({ icon: Trophy, label: 'Perfect Score', xp: 20 });
  if (timeSpentMinutes < 5) bonuses.push({ icon: Clock, label: 'Speed Bonus', xp: 10 });
  if (isFirstQuiz) bonuses.push({ icon: Star, label: 'First Quiz', xp: 25 });

  const baseXP = Math.round(percentage * 0.5);
  const totalXP = baseXP + bonuses.reduce((sum, b) => sum + b.xp, 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="text-center space-y-4">
          {/* Score Display */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className={`
              inline-flex items-center justify-center w-24 h-24 rounded-full
              ${isPerfectScore 
                ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                : percentage >= 80 
                  ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                  : percentage >= 60
                    ? 'bg-gradient-to-br from-blue-400 to-cyan-500'
                    : 'bg-gradient-to-br from-gray-400 to-gray-500'
              }
            `}>
              <span className="text-3xl font-black text-white">{percentage}%</span>
            </div>
          </motion.div>

          {/* Result Text */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-xl font-bold">
              {isPerfectScore ? '🏆 Perfect Score!' 
                : percentage >= 80 ? '🌟 Excellent Work!' 
                : percentage >= 60 ? '👍 Good Job!' 
                : '💪 Keep Practicing!'}
            </h3>
            <p className="text-muted-foreground">
              {score} out of {maxScore} correct
            </p>
          </motion.div>

          {/* XP Breakdown */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-2 pt-4 border-t"
          >
            {/* Base XP */}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                Base Score
              </span>
              <span className="font-semibold text-blue-500">+{baseXP} XP</span>
            </div>

            {/* Bonuses */}
            {bonuses.map((bonus, index) => (
              <motion.div
                key={bonus.label}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <bonus.icon className="h-4 w-4 text-yellow-500" />
                  {bonus.label}
                </span>
                <span className="font-semibold text-yellow-500">+{bonus.xp} XP</span>
              </motion.div>
            ))}

            {/* Total */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.2, type: "spring" }}
              className="flex items-center justify-between pt-2 border-t mt-2"
            >
              <span className="flex items-center gap-2 font-bold">
                <Zap className="h-5 w-5 text-primary fill-primary" />
                Total Earned
              </span>
              <span className="text-xl font-black text-primary">+{totalXP} XP</span>
            </motion.div>
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * Hook for manual quiz celebration trigger
 */
export function useQuizCelebration() {
  const { handleQuizComplete, handleCorrectAnswer, handleIncorrectAnswer } = useGamificationEvents();

  return {
    celebrateQuizComplete: handleQuizComplete,
    celebrateCorrectAnswer: handleCorrectAnswer,
    celebrateIncorrectAnswer: handleIncorrectAnswer,
  };
}
