'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Superscript, 
  Subscript,
  Type,
  Eraser,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showFormatting?: boolean;
  maxHeight?: number;
  autoResize?: boolean;
  onSave?: (value: string) => void;
}

export function AnswerInput({
  value,
  onChange,
  placeholder = "Type your answer here...",
  disabled = false,
  className,
  showFormatting = true,
  maxHeight = 400,
  autoResize = true,
  onSave
}: AnswerInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] = useState<string[]>(['']);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Auto-resize textarea
  useEffect(() => {
    if (autoResize && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      textarea.style.height = `${newHeight}px`;
    }
  }, [value, autoResize, maxHeight]);

  // Save to history for undo/redo
  const saveToHistory = (newValue: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newValue);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    saveToHistory(newValue);
  };

  const insertText = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const newText = before + selectedText + after;
    
    const newValue = value.substring(0, start) + newText + value.substring(end);
    onChange(newValue);
    saveToHistory(newValue);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selectedText.length
      );
    }, 0);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      onChange(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      onChange(history[historyIndex + 1]);
    }
  };

  const handleClear = () => {
    onChange('');
    saveToHistory('');
    textareaRef.current?.focus();
  };

  const formatButtons = [
    {
      icon: Bold,
      label: 'Bold',
      action: () => insertText('**', '**'),
      shortcut: 'Ctrl+B'
    },
    {
      icon: Italic,
      label: 'Italic',
      action: () => insertText('*', '*'),
      shortcut: 'Ctrl+I'
    },
    {
      icon: Superscript,
      label: 'Superscript',
      action: () => insertText('^', '^'),
      shortcut: 'Ctrl+^'
    },
    {
      icon: Subscript,
      label: 'Subscript',
      action: () => insertText('_', '_'),
      shortcut: 'Ctrl+_'
    },
  ];

  const listButtons = [
    {
      icon: List,
      label: 'Bullet List',
      action: () => insertText('• '),
    },
    {
      icon: ListOrdered,
      label: 'Numbered List',
      action: () => insertText('1. '),
    },
  ];

  const alignButtons = [
    {
      icon: AlignLeft,
      label: 'Align Left',
      action: () => insertText('<p style="text-align: left;">', '</p>'),
    },
    {
      icon: AlignCenter,
      label: 'Align Center',
      action: () => insertText('<p style="text-align: center;">', '</p>'),
    },
    {
      icon: AlignRight,
      label: 'Align Right',
      action: () => insertText('<p style="text-align: right;">', '</p>'),
    },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || !textareaRef.current) return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (ctrlKey && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            insertText('**', '**');
            break;
          case 'i':
            e.preventDefault();
            insertText('*', '*');
            break;
          case 'z':
            e.preventDefault();
            handleUndo();
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [disabled, value, historyIndex, history]);

  return (
    <TooltipProvider>
      <div className={cn('relative w-full', className)}>
        {/* Formatting Toolbar */}
        {showFormatting && (
          <div className="border border-b-0 rounded-t-md bg-muted/50 p-2 flex flex-wrap items-center gap-1">
            {/* Undo/Redo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUndo}
                  disabled={historyIndex === 0}
                  className="h-8 w-8 p-0"
                >
                  <Undo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRedo}
                  disabled={historyIndex === history.length - 1}
                  className="h-8 w-8 p-0"
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
            </Tooltip>

            {/* Separator */}
            <div className="w-px h-6 bg-border mx-1" />

            {/* Text Formatting */}
            {formatButtons.map(({ icon: Icon, label, action, shortcut }) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={action}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{label}</p>
                  <p className="text-xs text-muted-foreground">{shortcut}</p>
                </TooltipContent>
              </Tooltip>
            ))}

            {/* Separator */}
            <div className="w-px h-6 bg-border mx-1" />

            {/* Lists */}
            {listButtons.map(({ icon: Icon, label, action }) => (
              <Tooltip key={label}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={action}
                    disabled={disabled}
                    className="h-8 w-8 p-0"
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            ))}

            {/* Separator */}
            <div className="w-px h-6 bg-border mx-1" />

            {/* Alignment */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  className="h-8 w-8 p-0"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {alignButtons.map(({ icon: Icon, label, action }) => (
                  <DropdownMenuItem key={label} onClick={action}>
                    <Icon className="h-4 w-4 mr-2" />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Separator */}
            <div className="w-px h-6 bg-border mx-1" />

            {/* Clear */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={disabled}
                  className="h-8 w-8 p-0"
                >
                  <Eraser className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear</TooltipContent>
            </Tooltip>

            {/* Character count */}
            <div className="ml-auto text-xs text-muted-foreground self-center pr-2">
              {value.length} chars
            </div>
          </div>
        )}

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'resize-none',
            showFormatting && 'rounded-t-none border-t-0',
            autoResize && 'min-h-[120px]',
            !autoResize && 'min-h-[200px]'
          )}
          style={{
            ...(autoResize && {
              height: 'auto',
              maxHeight: `${maxHeight}px`,
              overflowY: 'auto'
            })
          }}
        />

        {/* Save button (if provided) */}
        {onSave && (
          <div className="flex justify-end mt-2">
            <Button
              onClick={() => onSave(value)}
              disabled={disabled || !value.trim()}
              size="sm"
            >
              Save Answer
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
