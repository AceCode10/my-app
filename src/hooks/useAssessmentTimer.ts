'use client';

// ============================================
// ASSESSMENT TIMER HOOK
// Manages countdown timer for timed assessments
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { UseAssessmentTimerOptions, UseAssessmentTimerReturn } from '@/types/assessment';

export function useAssessmentTimer({
  durationMinutes,
  startedAt,
  onExpire,
  onWarning,
  warningThresholds = [10, 5, 1] // minutes
}: UseAssessmentTimerOptions): UseAssessmentTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const warningsTriggered = useRef<Set<number>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate server-based time remaining
  const calculateTimeRemaining = useCallback(() => {
    const startTime = new Date(startedAt).getTime();
    const endTime = startTime + (durationMinutes * 60 * 1000);
    const now = Date.now();
    const remaining = Math.max(0, endTime - now);
    return Math.floor(remaining / 1000); // return seconds
  }, [durationMinutes, startedAt]);

  // Format time as HH:MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate percentage remaining
  const calculatePercentage = useCallback((seconds: number): number => {
    const totalSeconds = durationMinutes * 60;
    return Math.max(0, Math.min(100, (seconds / totalSeconds) * 100));
  }, [durationMinutes]);

  // Check and trigger warnings
  const checkWarnings = useCallback((seconds: number) => {
    if (!onWarning) return;

    const minutesRemaining = Math.ceil(seconds / 60);
    
    for (const threshold of warningThresholds) {
      if (minutesRemaining === threshold && !warningsTriggered.current.has(threshold)) {
        warningsTriggered.current.add(threshold);
        onWarning(threshold);
      }
    }
  }, [onWarning, warningThresholds]);

  // Main timer effect
  useEffect(() => {
    // Calculate initial time
    const initial = calculateTimeRemaining();
    setTimeRemaining(initial);

    if (initial <= 0) {
      setIsExpired(true);
      onExpire();
      return;
    }

    // Update every second
    intervalRef.current = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);
      checkWarnings(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        onExpire();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }, 1000);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [calculateTimeRemaining, checkWarnings, onExpire]);

  // Sync with server every minute to prevent time manipulation
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const serverTime = calculateTimeRemaining();
      const drift = Math.abs(serverTime - timeRemaining);
      
      // If drift is more than 5 seconds, resync
      if (drift > 5) {
        console.warn('Timer drift detected, resyncing with server');
        setTimeRemaining(serverTime);
      }
    }, 60000); // every minute

    return () => clearInterval(syncInterval);
  }, [calculateTimeRemaining, timeRemaining]);

  return {
    timeRemaining,
    isExpired,
    formattedTime: formatTime(timeRemaining),
    percentageRemaining: calculatePercentage(timeRemaining)
  };
}

// ============================================
// AUTO-SAVE HOOK
// Automatically saves answers at intervals
// ============================================

interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  interval?: number; // milliseconds, default 30000 (30 seconds)
  enabled?: boolean;
}

export function useAutoSave({
  onSave,
  interval = 30000,
  enabled = true
}: UseAutoSaveOptions) {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const save = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);
    try {
      await onSave();
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, isSaving]);

  useEffect(() => {
    if (!enabled) return;

    saveTimeoutRef.current = setInterval(() => {
      save();
    }, interval);

    return () => {
      if (saveTimeoutRef.current) {
        clearInterval(saveTimeoutRef.current);
      }
    };
  }, [save, interval, enabled]);

  // Save on unmount (page close)
  useEffect(() => {
    return () => {
      if (enabled) {
        save();
      }
    };
  }, [save, enabled]);

  return {
    lastSaved,
    isSaving,
    forceSave: save
  };
}

// ============================================
// VISIBILITY CHANGE HOOK
// Detect when user switches tabs/minimizes
// ============================================

interface UseVisibilityChangeOptions {
  onHidden?: () => void;
  onVisible?: () => void;
  warnOnHidden?: boolean;
}

export function useVisibilityChange({
  onHidden,
  onVisible,
  warnOnHidden = true
}: UseVisibilityChangeOptions = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const [hiddenCount, setHiddenCount] = useState(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);

      if (!visible) {
        setHiddenCount(prev => prev + 1);
        if (warnOnHidden) {
          console.warn('Assessment tab is hidden - this may be flagged');
        }
        onHidden?.();
      } else {
        onVisible?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onHidden, onVisible, warnOnHidden]);

  return {
    isVisible,
    hiddenCount
  };
}

// ============================================
// PREVENT COPY/PASTE HOOK
// Disable copy/paste during assessments
// ============================================

export function usePreventCopyPaste(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      console.warn('Copy disabled during assessment');
    };

    const preventPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      console.warn('Paste disabled during assessment');
    };

    const preventCut = (e: ClipboardEvent) => {
      e.preventDefault();
      console.warn('Cut disabled during assessment');
    };

    document.addEventListener('copy', preventCopy);
    document.addEventListener('paste', preventPaste);
    document.addEventListener('cut', preventCut);

    return () => {
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('paste', preventPaste);
      document.removeEventListener('cut', preventCut);
    };
  }, [enabled]);
}

// ============================================
// FULLSCREEN HOOK
// Manage fullscreen mode for assessments
// ============================================

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen
  };
}

// ============================================
// ASSESSMENT STATE HOOK
// Manage assessment attempt state
// ============================================

interface UseAssessmentStateOptions {
  attemptId: string;
  questions: any[];
}

export function useAssessmentState({ attemptId, questions }: UseAssessmentStateOptions) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, any>>(new Map());
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  const currentQuestion = questions[currentQuestionIndex];

  const goToNext = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, questions.length]);

  const goToPrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const goToQuestion = useCallback((index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  }, [questions.length]);

  const setAnswer = useCallback((questionId: string, answer: any) => {
    setAnswers(prev => new Map(prev).set(questionId, answer));
  }, []);

  const toggleFlag = useCallback((questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }, []);

  const getProgress = useCallback(() => {
    const answered = Array.from(answers.keys()).length;
    const total = questions.length;
    const percentage = total > 0 ? (answered / total) * 100 : 0;
    
    return {
      answered,
      total,
      percentage,
      unanswered: total - answered,
      flagged: flaggedQuestions.size
    };
  }, [answers, questions.length, flaggedQuestions.size]);

  return {
    currentQuestionIndex,
    currentQuestion,
    answers,
    flaggedQuestions,
    goToNext,
    goToPrevious,
    goToQuestion,
    setAnswer,
    toggleFlag,
    getProgress
  };
}
