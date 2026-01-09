'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Clock, Pause, Play, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuestionTimerProps {
  durationMinutes: number; // Total duration in minutes
  onExpire?: () => void;
  onWarning?: (minutesRemaining: number) => void;
  isPaused?: boolean;
  onTogglePause?: () => void;
  showControls?: boolean;
  className?: string;
}

export function QuestionTimer({
  durationMinutes,
  onExpire,
  onWarning,
  isPaused = false,
  onTogglePause,
  showControls = false,
  className
}: QuestionTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60);
  const [hasWarned, setHasWarned] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isPaused || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        
        // Check for warnings at 10, 5, and 1 minute marks
        const warningPoints = [10, 5, 1];
        const currentMinutes = Math.ceil(newTime / 60);
        
        if (onWarning && warningPoints.includes(currentMinutes) && !hasWarned.has(currentMinutes)) {
          onWarning(currentMinutes);
          setHasWarned(prev => new Set([...prev, currentMinutes]));
        }
        
        if (newTime <= 0) {
          onExpire?.();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, timeRemaining, onExpire, onWarning, hasWarned]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    const percentRemaining = (timeRemaining / (durationMinutes * 60)) * 100;
    if (percentRemaining <= 10) return 'text-red-500 bg-red-500/10';
    if (percentRemaining <= 25) return 'text-orange-500 bg-orange-500/10';
    return 'text-foreground bg-muted/50';
  };

  const isLowTime = timeRemaining <= 60;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div 
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-lg transition-colors",
          getTimerColor(),
          isLowTime && "animate-pulse"
        )}
      >
        {isLowTime ? (
          <AlertTriangle className="w-5 h-5" />
        ) : (
          <Clock className="w-5 h-5" />
        )}
        <span className="font-bold">{formatTime(timeRemaining)}</span>
      </div>
      
      {showControls && onTogglePause && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePause}
          className="h-10 w-10 p-0"
        >
          {isPaused ? (
            <Play className="w-4 h-4" />
          ) : (
            <Pause className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
}

// Simple stopwatch that counts up
interface StopwatchProps {
  isRunning: boolean;
  onTimeUpdate?: (seconds: number) => void;
  className?: string;
}

export function Stopwatch({ isRunning, onTimeUpdate, className }: StopwatchProps) {
  const [elapsed, setElapsed] = useState(0);

  // Memoize the callback to prevent unnecessary re-renders
  const stableOnTimeUpdate = useCallback((time: number) => {
    onTimeUpdate?.(time);
  }, [onTimeUpdate]);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // Call onTimeUpdate in a separate effect to avoid setState during render
  useEffect(() => {
    if (elapsed > 0) {
      stableOnTimeUpdate(elapsed);
    }
  }, [elapsed, stableOnTimeUpdate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn("flex items-center gap-2 text-muted-foreground", className)}>
      <Clock className="w-4 h-4" />
      <span className="font-mono text-sm">{formatTime(elapsed)}</span>
    </div>
  );
}
