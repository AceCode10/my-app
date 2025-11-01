'use client';

// ============================================
// EXAM BOARD SELECTOR COMPONENT
// Dropdown selector for exam board filtering
// ============================================

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExamBoard } from '@/contexts/ExamBoardContext';
import { cn } from '@/lib/utils';

interface ExamBoardSelectorProps {
  value?: string | null;
  onChange?: (boardId: string | null) => void;
  showAllOption?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function ExamBoardSelector({
  value,
  onChange,
  showAllOption = true,
  disabled = false,
  className,
  placeholder = 'Select exam board'
}: ExamBoardSelectorProps) {
  const { examBoards, activeExamBoard, setActiveExamBoard } = useExamBoard();

  const handleValueChange = (newValue: string) => {
    const boardId = newValue === 'all' ? null : newValue;
    
    if (onChange) {
      onChange(boardId);
    } else {
      // Use context if no onChange provided
      const board = examBoards.find(b => b.id === boardId);
      setActiveExamBoard(board || null);
    }
  };

  const currentValue = value !== undefined 
    ? (value || 'all') 
    : (activeExamBoard?.id || 'all');

  return (
    <Select
      value={currentValue}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={cn('w-[200px]', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value="all">All Exam Boards</SelectItem>
        )}
        {examBoards.map(board => (
          <SelectItem key={board.id} value={board.id}>
            <div className="flex items-center gap-2">
              <span className="font-medium">{board.name}</span>
              <span className="text-xs text-muted-foreground">
                {board.full_name}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
