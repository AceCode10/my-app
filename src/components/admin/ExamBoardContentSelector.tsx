'use client';

// ============================================
// EXAM BOARD CONTENT SELECTOR (ADMIN)
// For admins to assign exam boards to content
// ============================================

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useExamBoard } from '@/contexts/ExamBoardContext';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface ExamBoardContentSelectorProps {
  selectedBoardIds: string[];
  onChange: (boardIds: string[]) => void;
  required?: boolean;
  allowMultiple?: boolean;
  className?: string;
}

export function ExamBoardContentSelector({
  selectedBoardIds,
  onChange,
  required = true,
  allowMultiple = true,
  className
}: ExamBoardContentSelectorProps) {
  const { examBoards } = useExamBoard();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (required && selectedBoardIds.length === 0) {
      setError('Please select at least one exam board');
    } else {
      setError(null);
    }
  }, [selectedBoardIds, required]);

  const handleToggle = (boardId: string) => {
    if (allowMultiple) {
      if (selectedBoardIds.includes(boardId)) {
        onChange(selectedBoardIds.filter(id => id !== boardId));
      } else {
        onChange([...selectedBoardIds, boardId]);
      }
    } else {
      // Single selection mode
      onChange([boardId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedBoardIds.length === examBoards.length) {
      onChange([]);
    } else {
      onChange(examBoards.map(b => b.id));
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>
            Exam Board Assignment
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
          {allowMultiple && examBoards.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm text-primary hover:underline"
            >
              {selectedBoardIds.length === examBoards.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </CardTitle>
        <CardDescription>
          {allowMultiple 
            ? 'Select which exam boards this content applies to. Content can belong to multiple boards.'
            : 'Select the exam board for this content.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {examBoards.map(board => {
            const isSelected = selectedBoardIds.includes(board.id);
            
            return (
              <div
                key={board.id}
                className={cn(
                  'relative flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                  'hover:shadow-md',
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-200 hover:border-gray-300'
                )}
                onClick={() => handleToggle(board.id)}
              >
                <Checkbox
                  id={`board-${board.id}`}
                  checked={isSelected}
                  onCheckedChange={() => handleToggle(board.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`board-${board.id}`}
                    className="cursor-pointer"
                  >
                    <div className="font-semibold text-base">{board.name}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {board.full_name}
                    </div>
                    {board.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {board.description}
                      </div>
                    )}
                  </Label>
                </div>
              </div>
            );
          })}
        </div>

        {selectedBoardIds.length > 0 && (
          <div className="pt-2">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Selected ({selectedBoardIds.length}):
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedBoardIds.map(boardId => {
                const board = examBoards.find(b => b.id === boardId);
                if (!board) return null;
                
                return (
                  <Badge
                    key={boardId}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleToggle(boardId)}
                  >
                    {board.name} ×
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {allowMultiple && (
          <div className="text-xs text-muted-foreground bg-blue-50 border border-blue-200 rounded-lg p-3">
            💡 <strong>Tip:</strong> If content is identical across multiple exam boards, 
            select all applicable boards. Students will see this content based on their preference.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for inline use
interface ExamBoardQuickSelectorProps {
  selectedBoardId: string | null;
  onChange: (boardId: string | null) => void;
  required?: boolean;
  className?: string;
}

export function ExamBoardQuickSelector({
  selectedBoardId,
  onChange,
  required = true,
  className
}: ExamBoardQuickSelectorProps) {
  const { examBoards } = useExamBoard();

  return (
    <div className={cn('space-y-2', className)}>
      <Label>
        Exam Board
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <select
        value={selectedBoardId || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full px-3 py-2 border rounded-md"
        required={required}
      >
        <option value="">Select exam board...</option>
        {examBoards.map(board => (
          <option key={board.id} value={board.id}>
            {board.name} - {board.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}
