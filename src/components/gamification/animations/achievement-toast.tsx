'use client';

/**
 * Achievement Toast Component
 * Slide-in notifications for various achievements
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Flame, Trophy, Target, Star } from 'lucide-react';
import { soundManager } from '@/lib/gamification/sound-manager';

export type ToastType = 'xp' | 'streak' | 'badge' | 'goal' | 'achievement';

export interface AchievementToastData {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  icon?: string;
  xpAmount?: number;
  duration?: number; // ms, default 4000
}

interface ToastProps {
  toast: AchievementToastData;
  onDismiss: (id: string) => void;
}

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  xp: <Zap className="h-6 w-6 text-yellow-400 fill-yellow-400" />,
  streak: <Flame className="h-6 w-6 text-orange-500 fill-orange-500" />,
  badge: <Trophy className="h-6 w-6 text-purple-500" />,
  goal: <Target className="h-6 w-6 text-green-500" />,
  achievement: <Star className="h-6 w-6 text-blue-500 fill-blue-500" />,
};

const TOAST_COLORS: Record<ToastType, string> = {
  xp: 'border-l-yellow-400 bg-yellow-400/10',
  streak: 'border-l-orange-500 bg-orange-500/10',
  badge: 'border-l-purple-500 bg-purple-500/10',
  goal: 'border-l-green-500 bg-green-500/10',
  achievement: 'border-l-blue-500 bg-blue-500/10',
};

function Toast({ toast, onDismiss }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 4000;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`
        relative overflow-hidden
        w-80 bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-xl
        border-l-4 ${TOAST_COLORS[toast.type]}
      `}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700/50">
        <motion.div
          className="h-full bg-white/30"
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05 }}
        />
      </div>

      <div className="p-4 pr-10">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {toast.icon ? (
              <span className="text-2xl">{toast.icon}</span>
            ) : (
              TOAST_ICONS[toast.type]
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white text-sm">
              {toast.title}
            </h4>
            <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">
              {toast.message}
            </p>
            
            {/* XP indicator */}
            {toast.xpAmount && (
              <div className="flex items-center gap-1 mt-2">
                <Zap className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="text-yellow-400 text-sm font-semibold">
                  +{toast.xpAmount} XP
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(toast.id)}
        className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4 text-gray-500" />
      </button>
    </motion.div>
  );
}

// Toast container and manager
interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Global toast state
let toastListeners: ((toasts: AchievementToastData[]) => void)[] = [];
let currentToasts: AchievementToastData[] = [];

export function addToast(toast: Omit<AchievementToastData, 'id'>) {
  const newToast: AchievementToastData = {
    ...toast,
    id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  
  currentToasts = [...currentToasts, newToast];
  toastListeners.forEach(listener => listener(currentToasts));
  
  // Play notification sound
  soundManager.play('notification');
  
  return newToast.id;
}

export function removeToast(id: string) {
  currentToasts = currentToasts.filter(t => t.id !== id);
  toastListeners.forEach(listener => listener(currentToasts));
}

export function clearToasts() {
  currentToasts = [];
  toastListeners.forEach(listener => listener(currentToasts));
}

export function AchievementToastContainer({ position = 'top-right' }: ToastContainerProps) {
  const [toasts, setToasts] = useState<AchievementToastData[]>([]);

  useEffect(() => {
    const listener = (newToasts: AchievementToastData[]) => {
      setToasts([...newToasts]);
    };
    
    toastListeners.push(listener);
    setToasts([...currentToasts]);
    
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  const handleDismiss = useCallback((id: string) => {
    removeToast(id);
  }, []);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-[300] flex flex-col gap-3`}>
      <AnimatePresence mode="popLayout">
        {toasts.slice(0, 5).map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={handleDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// Convenience functions for common toasts
export const toast = {
  xp: (amount: number, source: string) => addToast({
    type: 'xp',
    title: 'XP Earned!',
    message: source,
    xpAmount: amount,
  }),
  
  streak: (days: number) => addToast({
    type: 'streak',
    title: `${days} Day Streak! 🔥`,
    message: 'Keep up the great work!',
    icon: '🔥',
  }),
  
  badge: (name: string, icon: string) => addToast({
    type: 'badge',
    title: 'Badge Unlocked!',
    message: name,
    icon,
    duration: 5000,
  }),
  
  goal: (message: string) => addToast({
    type: 'goal',
    title: 'Goal Completed! 🎯',
    message,
    icon: '🎯',
  }),
  
  achievement: (title: string, message: string, icon?: string) => addToast({
    type: 'achievement',
    title,
    message,
    icon,
  }),
};
