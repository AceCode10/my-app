'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EXAM_BOARDS } from '@/lib/exam-boards';

interface ExamBoardSelectorProps {
  selectedBoards: string[];
  onSelectionChange: (boards: string[]) => void;
  maxSelections?: number;
  showDescription?: boolean;
  className?: string;
}

export function ExamBoardSelector({
  selectedBoards,
  onSelectionChange,
  maxSelections,
  showDescription = true,
  className
}: ExamBoardSelectorProps) {
  const toggleBoard = (boardId: string) => {
    if (selectedBoards.includes(boardId)) {
      onSelectionChange(selectedBoards.filter(id => id !== boardId));
    } else {
      if (maxSelections && selectedBoards.length >= maxSelections) {
        // Replace the first selected with the new one
        onSelectionChange([...selectedBoards.slice(1), boardId]);
      } else {
        onSelectionChange([...selectedBoards, boardId]);
      }
    }
  };

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-3", className)}>
      {EXAM_BOARDS.map((board) => {
        const isSelected = selectedBoards.includes(board.id);
        return (
          <button
            key={board.id}
            type="button"
            onClick={() => toggleBoard(board.id)}
            className={cn(
              "relative flex flex-col items-start p-4 rounded-xl border-2 transition-all text-left",
              "hover:border-primary/50 hover:bg-muted/50",
              isSelected 
                ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                : "border-border bg-card"
            )}
          >
            {isSelected && (
              <div className="absolute top-2 right-2">
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
            )}
            <div className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm mb-2",
              board.color
            )}>
              {board.shortName}
            </div>
            <span className="font-semibold text-foreground">{board.name}</span>
            {showDescription && (
              <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {board.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Compact version for settings/profile pages
export function ExamBoardSelectorCompact({
  selectedBoards,
  onSelectionChange,
  className
}: Omit<ExamBoardSelectorProps, 'showDescription'>) {
  const toggleBoard = (boardId: string) => {
    if (selectedBoards.includes(boardId)) {
      onSelectionChange(selectedBoards.filter(id => id !== boardId));
    } else {
      onSelectionChange([...selectedBoards, boardId]);
    }
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {EXAM_BOARDS.map((board) => {
        const isSelected = selectedBoards.includes(board.id);
        return (
          <button
            key={board.id}
            type="button"
            onClick={() => toggleBoard(board.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
              "hover:border-primary/50",
              isSelected 
                ? "border-primary bg-primary/10 text-primary" 
                : "border-border bg-card text-muted-foreground"
            )}
          >
            <div className={cn(
              "h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold",
              board.color
            )}>
              {board.shortName.slice(0, 2)}
            </div>
            <span className="text-sm font-medium">{board.shortName}</span>
            {isSelected && <Check className="h-4 w-4" />}
          </button>
        );
      })}
    </div>
  );
}
