'use client';

// ============================================
// EXAM BOARD BADGE COMPONENT
// Small label showing exam board on content
// ============================================

import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { ExamBoard } from '@/types/exam-board';
import { cn } from '@/lib/utils';

interface ExamBoardBadgeProps {
  examBoard: ExamBoard;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'subtle';
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5'
};

const boardColors: Record<string, string> = {
  CIE: 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200',
  EDEXCEL: 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200',
  AQA: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  OCR: 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200',
  AP: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
};

export function ExamBoardBadge({ 
  examBoard, 
  size = 'sm', 
  variant = 'default',
  className 
}: ExamBoardBadgeProps) {
  const colorClass = boardColors[examBoard.code] || 'bg-gray-100 text-gray-800 border-gray-300';
  
  return (
    <Badge
      variant={variant === 'outline' ? 'outline' : 'secondary'}
      className={cn(
        sizeClasses[size],
        variant === 'default' && colorClass,
        variant === 'subtle' && 'bg-gray-100 text-gray-700 border-gray-200',
        'font-medium whitespace-nowrap',
        className
      )}
      title={examBoard.full_name}
    >
      {examBoard.name}
    </Badge>
  );
}

// Multiple exam boards badge
interface MultiExamBoardBadgeProps {
  examBoards: ExamBoard[];
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MultiExamBoardBadge({ 
  examBoards, 
  maxDisplay = 2,
  size = 'sm',
  className 
}: MultiExamBoardBadgeProps) {
  const displayBoards = examBoards.slice(0, maxDisplay);
  const remaining = examBoards.length - maxDisplay;

  return (
    <div className={cn('flex items-center gap-1 flex-wrap', className)}>
      {displayBoards.map(board => (
        <ExamBoardBadge key={board.id} examBoard={board} size={size} />
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className={cn(sizeClasses[size], 'text-gray-600')}>
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}
