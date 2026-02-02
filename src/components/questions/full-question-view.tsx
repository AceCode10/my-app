'use client';

import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { QuestionTextRenderer } from './question-text-renderer';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PaperQuestion } from '@/types/paper-practice';
import { ZoomIn, ExternalLink, X } from 'lucide-react';

interface FullQuestionViewProps {
  questionParts: PaperQuestion[];
  answers: Map<string, { answer_text: string | null; selected_option: string | null }>;
  onAnswerChange: (questionId: string, text: string | null, option: string | null) => void;
  className?: string;
}

/**
 * Determines if a question part needs an answer input
 * Uses needs_answer field if available, falls back to heuristics
 */
function isAnswerablePart(q: PaperQuestion, allParts: PaperQuestion[]): boolean {
  // Check is_context_only first - these never need answers
  if ((q as any).is_context_only === true) return false;
  
  // Check marks === 0 - no marks means no answer needed
  // Use Number() to handle string marks
  const marks = Number(q.marks) || 0;
  if (marks === 0) return false;
  
  // Explicit needs_answer field takes priority
  if (q.needs_answer === true) return true;
  if (q.needs_answer === false) return false;
  
  // Check if this is a parent question with children - it's context-only
  const hasChildren = allParts.some(p => p.parent_question_id === q.id);
  if (hasChildren) return false;
  
  // Check for context-only patterns in the text
  const text = (q.question_text || '').toLowerCase();
  const contextPatterns = [
    'consists of both',
    'has been the victim',
    'needs to be considered',
    'the following',
    'read the',
    'study the',
    'look at the',
    'consider the',
    'the diagram shows',
    'the table shows'
  ];
  
  // If no part_label and matches context pattern, it's likely context-only
  if (!q.part_label && contextPatterns.some(p => text.includes(p))) {
    // Check if there are any parts under this question number
    const samQuestionParts = allParts.filter(p => 
      p.question_number === q.question_number && 
      p.id !== q.id && 
      p.part_label
    );
    if (samQuestionParts.length > 0) return false;
  }
  
  // Fallback heuristics:
  // 1. Has marks > 0 AND has a part_label OR is standalone
  // 2. Question type suggests answer needed
  if (marks > 0) {
    // If it has a part_label, it's answerable
    if (q.part_label) return true;
    // If it's standalone (no other parts with same question_number), it's answerable
    const otherParts = allParts.filter(p => 
      p.question_number === q.question_number && p.id !== q.id
    );
    if (otherParts.length === 0) return true;
    // Otherwise, it's likely context for the parts below
    return false;
  }
  
  if (q.question_type === 'mcq' && q.options?.length) return true;
  
  return false;
}

/**
 * Smart sorting for question parts
 * Handles: main stem first, then (a), (b), (c), then (i), (ii), (iii)
 */
function sortQuestionParts(parts: PaperQuestion[]): PaperQuestion[] {
  return [...parts].sort((a, b) => {
    // First by display_order if available
    const orderA = a.display_order ?? 9999;
    const orderB = b.display_order ?? 9999;
    if (orderA !== orderB) return orderA - orderB;
    
    // Then by part_label structure
    const labelA = a.part_label || '';
    const labelB = b.part_label || '';
    
    // No label comes first (main stem)
    if (!labelA && labelB) return -1;
    if (labelA && !labelB) return 1;
    if (!labelA && !labelB) return 0;
    
    // Compare by depth first (a before a(i))
    const depthA = (labelA.match(/\(/g) || []).length;
    const depthB = (labelB.match(/\(/g) || []).length;
    if (depthA !== depthB) return depthA - depthB;
    
    // Natural sort for same depth
    return labelA.localeCompare(labelB, undefined, { numeric: true });
  });
}

/**
 * Displays a full question with all its parts on one page
 * Uses clean HTML rendering with structured data (like SaveMyExams)
 */
export function FullQuestionView({
  questionParts,
  answers,
  onAnswerChange,
  className
}: FullQuestionViewProps) {
  // Early return for empty parts
  if (!questionParts?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No question content available
      </div>
    );
  }

  // Memoize sorted parts and structure
  const { sortedParts, answerableParts, totalMarks, renderStructure } = useMemo(() => {
    const sorted = sortQuestionParts(questionParts);
    const answerable = sorted.filter(q => isAnswerablePart(q, sorted));
    const marks = answerable.reduce((sum, q) => sum + (q.marks || 0), 0);
    const structure = buildRenderStructure(sorted, answerable);
    
    return { sortedParts: sorted, answerableParts: answerable, totalMarks: marks, renderStructure: structure };
  }, [questionParts]);

  const questionNumber = sortedParts[0]?.question_number || 1;

  // Determine if we should show marks in the main header only
  // (when there's only one answerable part, show marks only in header)
  const showMarksInHeader = answerableParts.length === 1;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Question Header - Q number left, marks right-aligned */}
      <div className="flex items-center justify-between">
        <Badge variant="default" className="text-lg px-4 py-2 font-bold rounded-md">
          Q{questionNumber}
        </Badge>
        {totalMarks > 0 && (
          <span className="text-sm text-muted-foreground">
            {totalMarks} {totalMarks === 1 ? 'mark' : 'marks'}
          </span>
        )}
      </div>

      {/* Render question content with clean HTML */}
      <div className="space-y-4">
        {renderStructure.map((item) => (
          <QuestionItem
            key={item.question.id}
            item={item}
            answers={answers}
            onAnswerChange={onAnswerChange}
            depth={0}
            hideMarks={showMarksInHeader}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Render a table from structured data
 */
interface QuestionTableProps {
  tableData: {
    headers: string[];
    rows: string[][];
  };
}

function QuestionTable({ tableData }: QuestionTableProps) {
  return (
    <div className="overflow-x-auto my-4">
      <table className="w-full border-collapse border border-border text-sm">
        {tableData.headers && tableData.headers.length > 0 && (
          <thead>
            <tr className="bg-muted">
              {tableData.headers.map((header, i) => (
                <th 
                  key={i} 
                  className="border border-border px-3 py-2 text-left font-semibold"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {tableData.rows.map((row, rowIdx) => (
            <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
              {row.map((cell, cellIdx) => (
                <td 
                  key={cellIdx} 
                  className={cn(
                    "border border-border px-3 py-2",
                    cellIdx === 0 && "font-medium"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Unified component for displaying question images
 * Handles both image_url and question_image_data (base64)
 */
function QuestionImage({ question }: { question: PaperQuestion }) {
  const [imageError, setImageError] = useState(false);
  
  const imageData = question.question_image_data;
  const imageUrl = question.image_url;
  
  if (!imageData && !imageUrl) return null;
  if (imageError) return null;
  
  const imageSrc = imageData 
    ? (imageData.startsWith('http') ? imageData : `data:image/png;base64,${imageData}`)
    : imageUrl;

  const openFullImage = () => {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`
        <html>
          <head>
            <title>Question Image</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
              img { max-width: 95%; max-height: 95vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
            </style>
          </head>
          <body>
            <img src="${imageSrc}" alt="Question diagram" />
          </body>
        </html>
      `);
    }
  };

  return (
    <div className="flex justify-center">
      <div className="relative group inline-block">
        <img 
          src={imageSrc!}
          alt="Question diagram"
          className="max-w-full max-h-72 object-contain rounded-lg border bg-white shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={openFullImage}
          onError={() => setImageError(true)}
        />
        <button
          onClick={(e) => { e.stopPropagation(); openFullImage(); }}
          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
          title="Open full size"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * Full Question Image Component (SaveMyExams style)
 * Displays the entire question as a high-quality image
 * Optimized for clarity with zoom capability
 */
function FullQuestionImage({ imageUrl }: { imageUrl: string }) {
  const [imageError, setImageError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  
  if (imageError) {
    return (
      <div className="p-4 text-center text-muted-foreground bg-muted/30 rounded-lg">
        <p>Failed to load question image</p>
      </div>
    );
  }

  const openFullImage = () => {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`
        <html>
          <head>
            <title>Question</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; background: #f8f9fa; padding: 20px; }
              img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" alt="Question" />
          </body>
        </html>
      `);
    }
  };

  return (
    <div className="w-full">
      <div 
        className={cn(
          "relative group transition-all duration-200",
          isZoomed ? "fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer" : ""
        )}
        onClick={() => isZoomed ? setIsZoomed(false) : null}
      >
        {/* Question image - displayed seamlessly like on a PDF/canvas */}
        <img 
          src={imageUrl}
          alt="Question"
          className={cn(
            "transition-all duration-200",
            isZoomed 
              ? "max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-white" 
              : "w-full h-auto"
          )}
          style={{ 
            imageRendering: '-webkit-optimize-contrast'
          }}
          onError={() => setImageError(true)}
          onClick={(e) => {
            e.stopPropagation();
            if (!isZoomed) setIsZoomed(true);
          }}
        />
        
        {/* Subtle zoom controls - only visible on hover */}
        {!isZoomed && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setIsZoomed(true); }}
              className="p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-md"
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openFullImage(); }}
              className="p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-md"
              title="Open in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {/* Close button when zoomed */}
        {isZoomed && (
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white text-gray-800 rounded-full shadow-lg"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}

interface RenderItem {
  question: PaperQuestion;
  isContext: boolean;
  isAnswerable: boolean;
  children: RenderItem[];
}

/**
 * Build a hierarchical render structure from flat question list
 * Handles various nesting patterns:
 * 1. Label-based: a -> a(i), a(ii)
 * 2. parent_question_id based: parent -> children
 * 3. Mixed: context parts should appear before their children
 */
function buildRenderStructure(allParts: PaperQuestion[], answerableParts: PaperQuestion[]): RenderItem[] {
  const result: RenderItem[] = [];
  const answerableIds = new Set(answerableParts.map(p => p.id));
  const processed = new Set<string>();

  // Helper to get parent label from nested label (e.g., "a(i)" -> "a")
  const getParentLabel = (label: string): string | null => {
    if (!label || !label.includes('(')) return null;
    return label.split('(')[0];
  };

  // Build parent_question_id map for hierarchy
  const childrenByParentId = new Map<string, PaperQuestion[]>();
  for (const part of allParts) {
    if (part.parent_question_id) {
      const siblings = childrenByParentId.get(part.parent_question_id) || [];
      siblings.push(part);
      childrenByParentId.set(part.parent_question_id, siblings);
    }
  }

  // First pass: identify all parent labels that have children (label-based)
  const parentsWithChildren = new Set<string>();
  for (const part of allParts) {
    const parentLabel = getParentLabel(part.part_label || '');
    if (parentLabel) parentsWithChildren.add(parentLabel);
  }

  // Identify parts that are parents (have children via parent_question_id)
  const parentIds = new Set(childrenByParentId.keys());

  for (const part of allParts) {
    if (processed.has(part.id)) continue;
    
    // Skip if this part has a parent_question_id (it will be processed as a child)
    if (part.parent_question_id && !processed.has(part.parent_question_id)) {
      // Check if parent exists in our list
      const parentExists = allParts.some(p => p.id === part.parent_question_id);
      if (parentExists) continue;
    }
    
    processed.add(part.id);

    const isAnswerable = answerableIds.has(part.id);
    const partLabel = part.part_label || '';

    // Collect children for this part
    const children: RenderItem[] = [];
    
    // Method 1: Check if this part has children via parent_question_id
    const childrenByParent = childrenByParentId.get(part.id) || [];
    for (const child of childrenByParent) {
      if (processed.has(child.id)) continue;
      processed.add(child.id);
      
      // Recursively get grandchildren
      const grandchildren: RenderItem[] = [];
      const grandchildrenByParent = childrenByParentId.get(child.id) || [];
      for (const grandchild of grandchildrenByParent) {
        if (processed.has(grandchild.id)) continue;
        processed.add(grandchild.id);
        grandchildren.push({
          question: grandchild,
          isContext: !answerableIds.has(grandchild.id),
          isAnswerable: answerableIds.has(grandchild.id),
          children: []
        });
      }
      
      children.push({
        question: child,
        isContext: !answerableIds.has(child.id),
        isAnswerable: answerableIds.has(child.id),
        children: grandchildren
      });
    }
    
    // Method 2: Check if this part has nested sub-parts via label (e.g., "b" has "b(i)")
    if (partLabel && parentsWithChildren.has(partLabel) && children.length === 0) {
      for (const child of allParts) {
        if (processed.has(child.id)) continue;
        const childLabel = child.part_label || '';
        const childParent = getParentLabel(childLabel);
        
        if (childParent === partLabel) {
          processed.add(child.id);
          children.push({
            question: child,
            isContext: !answerableIds.has(child.id),
            isAnswerable: answerableIds.has(child.id),
            children: []
          });
        }
      }
    }

    result.push({
      question: part,
      isContext: !isAnswerable,
      isAnswerable,
      children
    });
  }

  return result;
}

/**
 * Renders a single question item (context or answerable)
 */
interface QuestionItemProps {
  item: RenderItem;
  answers: Map<string, { answer_text: string | null; selected_option: string | null }>;
  onAnswerChange: (questionId: string, text: string | null, option: string | null) => void;
  depth: number;
  hideMarks?: boolean;
}

function QuestionItem({ item, answers, onAnswerChange, depth, hideMarks }: QuestionItemProps) {
  const { question, isContext, isAnswerable, children } = item;
  const partLabel = question.part_label || '';
  const hasChildren = children.length > 0;
  
  // Get table data if available
  const tableData = (question as any).table_data;

  // Get image position (default to after_text)
  const imagePosition = question.image_position || 'after_text';
  const hasImage = question.image_url || question.question_image_data;

  // Context items (no answer needed) - render as intro text
  if (isContext && !isAnswerable) {
    return (
      <div className={cn('space-y-4', depth > 0 && 'ml-6')}>
        {/* Context text with part label if present */}
        <div className={cn(
          'rounded-lg p-4',
          !partLabel ? 'bg-muted/30 border-l-4 border-primary' : 'bg-muted/20'
        )}>
          <div className="flex items-start gap-3">
            {partLabel && (
              <Badge variant="outline" className="text-sm font-semibold shrink-0">
                ({partLabel})
              </Badge>
            )}
            <div className="flex-1 space-y-3">
              {/* Image BEFORE text */}
              {hasImage && imagePosition === 'before_text' && (
                <QuestionImage question={question} />
              )}
              
              <QuestionTextRenderer 
                text={question.question_text || ''} 
                size={!partLabel ? 'lg' : 'md'}
                className="text-foreground"
              />
              
              {/* Image AFTER text (default) */}
              {hasImage && imagePosition === 'after_text' && (
                <QuestionImage question={question} />
              )}
              
              {/* Table data */}
              {tableData && <QuestionTable tableData={tableData} />}
            </div>
          </div>
        </div>

        {/* Render children */}
        {children.map((child) => (
          <QuestionItem key={child.question.id} item={child} answers={answers} onAnswerChange={onAnswerChange} depth={depth + 1} hideMarks={hideMarks} />
        ))}
      </div>
    );
  }

  // Answerable items - render with answer input
  const currentAnswer = answers.get(question.id);
  const currentText = currentAnswer?.answer_text || '';
  const currentOption = currentAnswer?.selected_option || '';
  
  // Check if this is a full question image (SaveMyExams style)
  const useImageQuestion = question.use_image_question && question.question_image_url;

  return (
    <div className={cn('space-y-4', depth > 0 && 'ml-6')}>
      <div className="rounded-lg border bg-card overflow-hidden">
        {/* Question header - part label and marks on TOP (marks hidden if shown in main header) */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
          <div className="flex items-center gap-2">
            {partLabel && (
              <span className="text-sm font-semibold text-foreground">
                ({formatPartLabel(partLabel)})
              </span>
            )}
          </div>
          {!hideMarks && question.marks > 0 && (
            <span className="text-sm text-muted-foreground">
              {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
            </span>
          )}
        </div>
        
        {/* Question content */}
        <div className="p-4 space-y-4">
          <div className="flex-1">
            {useImageQuestion ? (
              /* Full Question Image Mode (SaveMyExams style) - seamless display */
              <FullQuestionImage imageUrl={question.question_image_url!} />
            ) : (
              /* Traditional Text Mode */
              <div className="space-y-3">
                {/* Image BEFORE text */}
                {hasImage && imagePosition === 'before_text' && (
                  <QuestionImage question={question} />
                )}
                
                <QuestionTextRenderer text={question.question_text || ''} size="md" className="text-foreground" />
                
                {/* Image AFTER text (default) */}
                {hasImage && imagePosition === 'after_text' && (
                  <QuestionImage question={question} />
                )}
                
                {/* Table data */}
                {tableData && <QuestionTable tableData={tableData} />}
              </div>
            )}
          </div>

          {/* Answer Input - always below the question content */}
          <div className="pt-3 border-t border-dashed">
            <AnswerInput
              question={question}
              currentText={currentText}
              currentOption={currentOption}
              onAnswerChange={onAnswerChange}
              useImageQuestion={!!useImageQuestion}
            />
          </div>
        </div>
      </div>

      {/* Render children */}
      {children.map((child) => (
        <QuestionItem key={child.question.id} item={child} answers={answers} onAnswerChange={onAnswerChange} depth={depth + 1} hideMarks={hideMarks} />
      ))}
    </div>
  );
}

/**
 * Render appropriate answer input based on question type
 */
interface AnswerInputProps {
  question: PaperQuestion;
  currentText: string;
  currentOption: string;
  onAnswerChange: (questionId: string, text: string | null, option: string | null) => void;
  useImageQuestion?: boolean;
}

function AnswerInput({ question, currentText, currentOption, onAnswerChange, useImageQuestion }: AnswerInputProps) {
  // MCQ with options
  if (question.question_type === 'mcq' && question.options && Array.isArray(question.options)) {
    // For image questions, show only letter buttons (A, B, C, D) without text
    if (useImageQuestion) {
      return (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Choose your answer</p>
          <div className="flex gap-2">
            {question.options.map((option: any, idx: number) => {
              const label = option.label || String.fromCharCode(65 + idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onAnswerChange(question.id, null, label)}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 font-semibold transition-all",
                    currentOption === label
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 hover:border-primary/50 bg-background"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    
    // Standard MCQ with text options
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {question.options.map((option: any, idx: number) => (
          <button
            key={idx}
            type="button"
            onClick={() => onAnswerChange(question.id, null, option.label || option.text)}
            className={cn(
              "p-3 rounded-lg border text-left transition-colors",
              currentOption === (option.label || option.text)
                ? "border-primary bg-primary/10 ring-2 ring-primary"
                : "border-muted hover:border-muted-foreground/50"
            )}
          >
            <span className="font-medium">{option.label || String.fromCharCode(65 + idx)}.</span>{' '}
            <span>{option.text}</span>
          </button>
        ))}
      </div>
    );
  }

  // True/False
  if (question.question_type === 'true_false') {
    return (
      <RadioGroup value={currentText} onValueChange={(value) => onAnswerChange(question.id, value, null)} className="flex gap-4">
        {['True', 'False'].map((option) => (
          <div
            key={option}
            className={cn(
              "flex items-center space-x-2 p-3 rounded-lg border transition-colors cursor-pointer flex-1",
              currentText === option ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
            )}
            onClick={() => onAnswerChange(question.id, option, null)}
          >
            <RadioGroupItem value={option} id={`${question.id}-${option}`} />
            <Label htmlFor={`${question.id}-${option}`} className="cursor-pointer font-medium">{option}</Label>
          </div>
        ))}
      </RadioGroup>
    );
  }

  // Multiple sub-inputs (e.g., Way 1, Way 2, Example 1, Example 2)
  if (question.sub_inputs && Array.isArray(question.sub_inputs) && question.sub_inputs.length > 0) {
    // Parse current answer as JSON array or split by newlines
    let subAnswers: string[] = [];
    try {
      subAnswers = currentText ? JSON.parse(currentText) : [];
    } catch {
      subAnswers = currentText ? currentText.split('\n').filter(Boolean) : [];
    }
    
    // Ensure array has enough slots
    while (subAnswers.length < question.sub_inputs.length) {
      subAnswers.push('');
    }
    
    const handleSubInputChange = (index: number, value: string) => {
      const newAnswers = [...subAnswers];
      newAnswers[index] = value;
      // Store as JSON array
      onAnswerChange(question.id, JSON.stringify(newAnswers), null);
    };
    
    return (
      <div className="space-y-3">
        {question.sub_inputs.map((label: string, index: number) => (
          <div key={index} className="space-y-1">
            <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
            <Input
              value={subAnswers[index] || ''}
              onChange={(e) => handleSubInputChange(index, e.target.value)}
              placeholder={`Enter answer for ${label}...`}
              className="bg-background"
            />
          </div>
        ))}
      </div>
    );
  }

  // Short answer (1-2 marks) - use Input
  if (question.marks <= 2 || question.question_type === 'short_answer' || question.question_type === 'calculation') {
    return (
      <Input
        value={currentText}
        onChange={(e) => onAnswerChange(question.id, e.target.value, null)}
        placeholder="Type your answer here..."
        className="bg-background"
      />
    );
  }

  // Extended response (3+ marks) - use Textarea
  const rows = question.marks >= 6 ? 8 : question.marks >= 4 ? 6 : 4;
  return (
    <Textarea
      value={currentText}
      onChange={(e) => onAnswerChange(question.id, e.target.value, null)}
      placeholder="Write your answer here..."
      rows={rows}
      className="resize-none bg-background"
    />
  );
}

/**
 * Format part label for display - extract just the last part for nested labels
 */
function formatPartLabel(label: string): string {
  if (!label) return '';
  
  // For nested parts like "a(i)", extract just "(i)"
  if (label.includes('(')) {
    const match = label.match(/\(([^)]+)\)$/);
    return match ? match[1] : label;
  }
  
  return label;
}

export default FullQuestionView;
