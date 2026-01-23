'use client';

/**
 * Duolingo-style XP Popup Component
 * A centered, modal-like celebration that appears when XP is earned
 */

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Sparkles, Star, Trophy, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { soundManager } from '@/lib/gamification/sound-manager';

export interface XPBonus {
  type: string;
  label: string;
  amount: number;
  icon?: string;
}

export interface XPPopupData {
  id: string;
  baseXP: number;
  bonuses: XPBonus[];
  totalXP: number;
  source: string;
  message?: string;
  showBreakdown?: boolean;
}

interface XPPopupProps {
  data: XPPopupData | null;
  onDismiss: () => void;
  autoDismissMs?: number;
}

// Animated number counter
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(startValue + (value - startValue) * easeOutQuart);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

// Individual bonus item with staggered animation
function BonusItem({ bonus, index }: { bonus: XPBonus; index: number }) {
  const getIcon = () => {
    switch (bonus.type) {
      case 'perfectScore':
        return <Trophy className="h-4 w-4 text-yellow-400" />;
      case 'highScore':
        return <Star className="h-4 w-4 text-amber-400" />;
      case 'streak':
        return <Flame className="h-4 w-4 text-orange-500" />;
      case 'speed':
        return <Zap className="h-4 w-4 text-blue-400" />;
      default:
        return bonus.icon ? <span className="text-sm">{bonus.icon}</span> : <Sparkles className="h-4 w-4 text-purple-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.5 + index * 0.15, duration: 0.3 }}
      className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg"
    >
      <div className="flex items-center gap-2">
        {getIcon()}
        <span className="text-sm text-gray-300">{bonus.label}</span>
      </div>
      <span className="text-sm font-semibold text-green-400">+{bonus.amount}</span>
    </motion.div>
  );
}

export function XPPopup({ data, onDismiss, autoDismissMs = 5000 }: XPPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (data) {
      setIsVisible(true);
      // Play celebration sound based on XP amount
      if (data.totalXP >= 50) {
        soundManager.play('xp_gain_large');
      } else if (data.totalXP >= 20) {
        soundManager.play('xp_gain_medium');
      } else {
        soundManager.play('xp_gain_small');
      }
      
      // Auto-dismiss after delay
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for exit animation
      }, autoDismissMs);
      
      return () => clearTimeout(timer);
    }
  }, [data, autoDismissMs, onDismiss]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  }, [onDismiss]);

  if (!data) return null;

  const showBreakdown = data.showBreakdown !== false && data.bonuses.length > 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            onClick={handleDismiss}
          />
          
          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed inset-0 flex items-center justify-center z-[201] pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm mx-4">
              <div className="relative bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-green-500/10 via-transparent to-yellow-500/10 pointer-events-none" />
                
                {/* Close button */}
                <button
                  onClick={handleDismiss}
                  className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 transition-colors z-10"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>

                {/* Content */}
                <div className="relative p-6 pt-8">
                  {/* XP Icon with pulse animation */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.2, 1] }}
                    transition={{ duration: 0.5, times: [0, 0.6, 1] }}
                    className="flex justify-center mb-4"
                  >
                    <div className="relative">
                      {/* Outer glow rings */}
                      <motion.div
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-full bg-yellow-400/30"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
                        className="absolute inset-0 rounded-full bg-green-400/30"
                      />
                      
                      {/* Main icon */}
                      <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 via-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                        <Zap className="h-10 w-10 text-white fill-white" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center text-xl font-bold text-white mb-1"
                  >
                    XP Earned!
                  </motion.h2>
                  
                  {/* Source/Message */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center text-sm text-gray-400 mb-4"
                  >
                    {data.message || data.source}
                  </motion.p>

                  {/* Total XP with animated counter */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                    className="flex items-center justify-center gap-2 mb-6"
                  >
                    <Zap className="h-8 w-8 text-yellow-400 fill-yellow-400" />
                    <span className="text-5xl font-bold bg-gradient-to-r from-yellow-400 via-green-400 to-emerald-400 bg-clip-text text-transparent">
                      +<AnimatedNumber value={data.totalXP} duration={800} />
                    </span>
                  </motion.div>

                  {/* Breakdown section */}
                  {showBreakdown && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ delay: 0.5 }}
                      className="space-y-2 mb-4"
                    >
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">
                        Breakdown
                      </div>
                      
                      {/* Base XP */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center justify-between py-2 px-3 bg-white/5 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-gray-300">Base XP</span>
                        </div>
                        <span className="text-sm font-semibold text-green-400">+{data.baseXP}</span>
                      </motion.div>
                      
                      {/* Bonus items */}
                      {data.bonuses.map((bonus, index) => (
                        <BonusItem key={bonus.type} bonus={bonus} index={index} />
                      ))}
                    </motion.div>
                  )}

                  {/* Continue button */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: showBreakdown ? 0.8 + data.bonuses.length * 0.1 : 0.6 }}
                  >
                    <Button
                      onClick={handleDismiss}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 rounded-xl shadow-lg shadow-green-500/25"
                    >
                      Continue
                    </Button>
                  </motion.div>
                </div>

                {/* Sparkle decorations */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-10 -right-10 w-40 h-40 opacity-20"
                >
                  <Sparkles className="w-full h-full text-yellow-400" />
                </motion.div>
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  className="absolute -bottom-10 -left-10 w-32 h-32 opacity-20"
                >
                  <Star className="w-full h-full text-green-400" />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Global XP popup state management
let xpPopupListeners: ((data: XPPopupData | null) => void)[] = [];
let currentXPPopup: XPPopupData | null = null;
let popupQueue: XPPopupData[] = [];

export function showXPPopup(data: Omit<XPPopupData, 'id'>) {
  const popupData: XPPopupData = {
    ...data,
    id: `xp-popup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };
  
  // If there's already a popup showing, queue this one
  if (currentXPPopup) {
    popupQueue.push(popupData);
    return popupData.id;
  }
  
  currentXPPopup = popupData;
  xpPopupListeners.forEach(listener => listener(popupData));
  
  return popupData.id;
}

export function dismissXPPopup() {
  currentXPPopup = null;
  
  // Show next popup in queue if any
  if (popupQueue.length > 0) {
    const nextPopup = popupQueue.shift()!;
    setTimeout(() => {
      currentXPPopup = nextPopup;
      xpPopupListeners.forEach(listener => listener(nextPopup));
    }, 300);
  } else {
    xpPopupListeners.forEach(listener => listener(null));
  }
}

// Container component that listens for popup events
export function XPPopupContainer() {
  const [popupData, setPopupData] = useState<XPPopupData | null>(null);

  useEffect(() => {
    const listener = (data: XPPopupData | null) => {
      setPopupData(data);
    };
    
    xpPopupListeners.push(listener);
    setPopupData(currentXPPopup);
    
    return () => {
      xpPopupListeners = xpPopupListeners.filter(l => l !== listener);
    };
  }, []);

  return <XPPopup data={popupData} onDismiss={dismissXPPopup} />;
}

// Convenience function to show XP popup with common configurations
export const xpPopup = {
  // Show a simple XP gain
  simple: (amount: number, source: string) => showXPPopup({
    baseXP: amount,
    bonuses: [],
    totalXP: amount,
    source,
    showBreakdown: false,
  }),
  
  // Show XP with breakdown
  withBreakdown: (baseXP: number, bonuses: XPBonus[], source: string, message?: string) => {
    const totalXP = baseXP + bonuses.reduce((sum, b) => sum + b.amount, 0);
    return showXPPopup({
      baseXP,
      bonuses,
      totalXP,
      source,
      message,
      showBreakdown: true,
    });
  },
  
  // Quiz completion popup
  quizComplete: (score: number, maxScore: number, bonuses: XPBonus[] = []) => {
    const percentage = Math.round((score / maxScore) * 100);
    const baseXP = Math.round(percentage * 0.5);
    const totalXP = baseXP + bonuses.reduce((sum, b) => sum + b.amount, 0);
    
    return showXPPopup({
      baseXP,
      bonuses,
      totalXP,
      source: 'Quiz Completed',
      message: `You scored ${percentage}%!`,
      showBreakdown: bonuses.length > 0,
    });
  },
  
  // Note reading popup
  noteComplete: (timeSpentMinutes: number, bonuses: XPBonus[] = []) => {
    const baseXP = Math.min(timeSpentMinutes * 2, 20);
    const totalXP = baseXP + bonuses.reduce((sum, b) => sum + b.amount, 0);
    
    return showXPPopup({
      baseXP,
      bonuses,
      totalXP,
      source: 'Notes Completed',
      message: 'Great job studying!',
      showBreakdown: bonuses.length > 0,
    });
  },
};
