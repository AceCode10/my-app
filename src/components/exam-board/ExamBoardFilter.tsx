'use client';

// ============================================
// EXAM BOARD FILTER COMPONENT
// Tab-based or button-based filtering UI
// ============================================

import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useExamBoard } from '@/contexts/ExamBoardContext';
import { cn } from '@/lib/utils';
import { Filter } from 'lucide-react';

interface ExamBoardFilterProps {
  onFilterChange?: (boardId: string | null) => void;
  currentFilter?: string | null;
  variant?: 'tabs' | 'buttons' | 'compact';
  showCount?: boolean;
  className?: string;
}

export function ExamBoardFilter({
  onFilterChange,
  currentFilter,
  variant = 'tabs',
  showCount = false,
  className
}: ExamBoardFilterProps) {
  const { examBoards, activeExamBoard, setActiveExamBoard, showAllBoards } = useExamBoard();

  const handleFilterChange = (boardId: string | null) => {
    if (onFilterChange) {
      onFilterChange(boardId);
    } else {
      const board = examBoards.find(b => b.id === boardId);
      setActiveExamBoard(board || null);
    }
  };

  const activeId = currentFilter !== undefined 
    ? currentFilter 
    : (showAllBoards ? null : activeExamBoard?.id);

  if (variant === 'tabs') {
    return (
      <Tabs 
        value={activeId || 'all'} 
        onValueChange={(value) => handleFilterChange(value === 'all' ? null : value)}
        className={className}
      >
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All Boards</TabsTrigger>
          {examBoards.map(board => (
            <TabsTrigger key={board.id} value={board.id}>
              {board.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    );
  }

  if (variant === 'buttons') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        <Button
          variant={activeId === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFilterChange(null)}
        >
          All Boards
        </Button>
        {examBoards.map(board => (
          <Button
            key={board.id}
            variant={activeId === board.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange(board.id)}
          >
            {board.name}
          </Button>
        ))}
      </div>
    );
  }

  // Compact variant - just shows current filter with icon
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Filter className="h-4 w-4" />
      <span>
        {activeId 
          ? examBoards.find(b => b.id === activeId)?.name || 'All Boards'
          : 'All Boards'
        }
      </span>
    </div>
  );
}

// Quick toggle component for header/sidebar
export function ExamBoardQuickToggle({ className }: { className?: string }) {
  const { activeExamBoard, showAllBoards, setShowAllBoards } = useExamBoard();

  if (!activeExamBoard) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setShowAllBoards(!showAllBoards)}
      className={cn('text-xs', className)}
    >
      {showAllBoards ? (
        <>Viewing: All Boards</>
      ) : (
        <>Viewing: {activeExamBoard.name}</>
      )}
    </Button>
  );
}
