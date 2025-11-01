'use client';

import { useAssessmentTimer } from '@/hooks/useAssessmentTimer';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimerProps {
  durationMinutes: number;
  startedAt: string;
  onExpire: () => void;
  onWarning?: (minutesRemaining: number) => void;
  className?: string;
}

export function Timer({
  durationMinutes,
  startedAt,
  onExpire,
  onWarning,
  className
}: TimerProps) {
  const { timeRemaining, isExpired, formattedTime, percentageRemaining } = useAssessmentTimer({
    durationMinutes,
    startedAt,
    onExpire,
    onWarning,
    warningThresholds: [10, 5, 1]
  });

  const minutes = Math.floor(timeRemaining / 60);
  const isWarning = minutes <= 10 && minutes > 5;
  const isCritical = minutes <= 5;

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 rounded-lg border-2 bg-white shadow-lg transition-all duration-300',
        isExpired && 'border-red-600 bg-red-50',
        isCritical && !isExpired && 'border-red-500 bg-red-50 animate-pulse',
        isWarning && !isCritical && 'border-yellow-500 bg-yellow-50',
        !isWarning && !isCritical && 'border-blue-500 bg-blue-50',
        className
      )}
    >
      <div className="p-4 min-w-[200px]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {isCritical ? (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          ) : (
            <Clock className="w-5 h-5 text-gray-600" />
          )}
          <span className="text-sm font-medium text-gray-700">
            Time Remaining
          </span>
        </div>

        {/* Time Display */}
        <div
          className={cn(
            'text-3xl font-bold tabular-nums',
            isExpired && 'text-red-600',
            isCritical && !isExpired && 'text-red-600',
            isWarning && !isCritical && 'text-yellow-600',
            !isWarning && !isCritical && 'text-blue-600'
          )}
        >
          {isExpired ? '00:00' : formattedTime}
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-1000 ease-linear',
              isExpired && 'bg-red-600',
              isCritical && !isExpired && 'bg-red-500',
              isWarning && !isCritical && 'bg-yellow-500',
              !isWarning && !isCritical && 'bg-blue-500'
            )}
            style={{ width: `${percentageRemaining}%` }}
          />
        </div>

        {/* Warning Messages */}
        {isCritical && !isExpired && (
          <div className="mt-2 text-xs font-medium text-red-600 animate-pulse">
            ⚠️ Less than 5 minutes remaining!
          </div>
        )}
        {isWarning && !isCritical && (
          <div className="mt-2 text-xs font-medium text-yellow-600">
            ⏰ 10 minutes remaining
          </div>
        )}
        {isExpired && (
          <div className="mt-2 text-xs font-medium text-red-600">
            ⏱️ Time's up! Submitting...
          </div>
        )}
      </div>
    </div>
  );
}
