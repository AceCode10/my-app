'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarkdownRenderer } from './markdown-renderer';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Table,
  Image,
  Link as LinkIcon,
  Minus,
  AlertTriangle,
  Info,
  Lightbulb,
  PenLine,
  Loader2,
  Upload,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  hasLatex?: boolean;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  imageFolder?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  hasLatex = false,
  placeholder,
  minHeight = '500px',
  className,
  imageFolder = 'general',
}: MarkdownEditorProps) {
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isUploading, setIsUploading] = useState(false);

  const insertText = useCallback(
    (before: string, after: string = '', placeholder: string = '') => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end);
      const insertText = selectedText || placeholder;
      const newValue =
        value.substring(0, start) + before + insertText + after + value.substring(end);

      onChange(newValue);

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        const cursorPos = start + before.length + insertText.length;
        textarea.setSelectionRange(
          selectedText ? cursorPos + after.length : start + before.length,
          selectedText ? cursorPos + after.length : start + before.length + placeholder.length
        );
      }, 0);
    },
    [value, onChange]
  );

  const insertAtNewLine = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      // Find the start of the current line
      const beforeCursor = value.substring(0, start);
      const needsNewLine = beforeCursor.length > 0 && !beforeCursor.endsWith('\n');
      const prefix = needsNewLine ? '\n\n' : '';
      const newValue = value.substring(0, start) + prefix + text + value.substring(start);

      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        const newPos = start + prefix.length + text.length;
        textarea.setSelectionRange(newPos, newPos);
      }, 0);
    },
    [value, onChange]
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', imageFolder);

        const response = await fetch('/api/notes/upload-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Upload failed');
        }

        const data = await response.json();
        const altText = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        
        // Insert markdown image + caption
        insertAtNewLine(`![${altText}](${data.url})\n*${altText}*\n`);
        
        toast({
          title: 'Image uploaded',
          description: `${file.name} has been added to the note.`,
        });
      } catch (error: any) {
        console.error('Image upload error:', error);
        toast({
          variant: 'destructive',
          title: 'Upload failed',
          description: error.message || 'Could not upload image.',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [imageFolder, insertAtNewLine, toast]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleImageUpload(file);
      }
      e.target.value = '';
    },
    [handleImageUpload]
  );

  // Handle paste with image support
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleImageUpload(file);
          }
          return;
        }
      }
    },
    [handleImageUpload]
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload]
  );

  const toolbarButtons = [
    { icon: Bold, label: 'Bold', action: () => insertText('**', '**', 'bold text') },
    { icon: Italic, label: 'Italic', action: () => insertText('*', '*', 'italic text') },
    { type: 'separator' as const },
    { icon: Heading1, label: 'Heading 1', action: () => insertAtNewLine('# ') },
    { icon: Heading2, label: 'Heading 2', action: () => insertAtNewLine('## ') },
    { icon: Heading3, label: 'Heading 3', action: () => insertAtNewLine('### ') },
    { type: 'separator' as const },
    { icon: List, label: 'Bullet List', action: () => insertAtNewLine('- ') },
    { icon: ListOrdered, label: 'Numbered List', action: () => insertAtNewLine('1. ') },
    { icon: Quote, label: 'Blockquote', action: () => insertAtNewLine('> ') },
    { icon: Code, label: 'Code Block', action: () => insertText('\n```\n', '\n```\n', 'code') },
    { type: 'separator' as const },
    {
      icon: Table,
      label: 'Table',
      action: () =>
        insertAtNewLine(
          '| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n'
        ),
    },
    { icon: LinkIcon, label: 'Link', action: () => insertText('[', '](url)', 'link text') },
    { icon: Minus, label: 'Horizontal Rule', action: () => insertAtNewLine('\n---\n') },
    { type: 'separator' as const },
    {
      icon: Image,
      label: 'Upload Image',
      action: () => fileInputRef.current?.click(),
      highlight: true,
    },
    { type: 'separator' as const },
    {
      icon: PenLine,
      label: 'Worked Example',
      action: () =>
        insertAtNewLine(
          '> **Worked Example**\n>\n> Explain the difference between X and Y.\n>\n> [2]\n>\n> Answer\n>\n> X does this specific thing [1]\n>\n> Y does that specific thing [1]\n'
        ),
    },
    {
      icon: Lightbulb,
      label: 'Exam Tip',
      action: () =>
        insertAtNewLine(
          '> **Exam Tip:** Write your exam tip here.\n'
        ),
    },
    {
      icon: Info,
      label: 'Key Definition',
      action: () =>
        insertAtNewLine(
          '> **Key Definition:** Write the definition here.\n'
        ),
    },
    {
      icon: AlertTriangle,
      label: 'Warning/Common Mistake',
      action: () =>
        insertAtNewLine(
          '> **Common Mistake:** Describe the common mistake here.\n'
        ),
    },
  ];

  return (
    <div className={cn('space-y-2', className)}>
      {/* Tab switcher */}
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}>
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>
        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading image...
          </div>
        )}
      </div>

      {activeTab === 'edit' ? (
        <>
          {/* Toolbar */}
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-0.5 flex-wrap p-1.5 border rounded-lg bg-muted/30">
              {toolbarButtons.map((btn, i) => {
                if ('type' in btn && btn.type === 'separator') {
                  return <div key={`sep-${i}`} className="w-px h-6 bg-border mx-1" />;
                }
                const Btn = btn as {
                  icon: any;
                  label: string;
                  action: () => void;
                  highlight?: boolean;
                };
                return (
                  <Tooltip key={Btn.label}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          'h-8 w-8',
                          Btn.highlight && 'text-primary hover:text-primary hover:bg-primary/10'
                        )}
                        onClick={Btn.action}
                        disabled={isUploading}
                      >
                        <Btn.icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">{Btn.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            placeholder={
              placeholder ||
              `# Topic Title

## What is [topic]?

- **Key point 1** with explanation
- **Key point 2** with more detail

![diagram description](image-url)
*Figure 1: Diagram caption*

> **Exam Tip:** Important tip for the exam.

| Header | Payload | Trailer |
| --- | --- | --- |
| Source IP | Data | End marker |`
            }
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="font-mono text-sm"
            style={{ minHeight }}
          />

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Helper text */}
          <p className="text-xs text-muted-foreground">
            Supports Markdown, LaTeX ($...$), tables, and images. Paste or drag images directly into the editor.
          </p>
        </>
      ) : (
        <div
          className="border rounded-lg p-6 bg-background overflow-auto"
          style={{ minHeight }}
        >
          {value ? (
            <MarkdownRenderer content={value} hasLatex={hasLatex} />
          ) : (
            <p className="text-muted-foreground text-center py-12">No content to preview</p>
          )}
        </div>
      )}
    </div>
  );
}

export default MarkdownEditor;
