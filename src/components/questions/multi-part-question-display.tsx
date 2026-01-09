'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { QuestionTextRenderer } from './question-text-renderer';
import { Badge } from '@/components/ui/badge';
import { PaperQuestion } from '@/types/paper-practice';

interface MultiPartQuestionDisplayProps {
  questions: PaperQuestion[];
  currentQuestionId: string;
  className?: string;
  showMarks?: boolean;
}

/**
 * Intelligently displays multi-part questions with proper hierarchy
 * Handles questions like:
 * Q2: Main stem
 *   (a) Part a stem
 *     (i) Sub-part [2 marks]
 *     (ii) Sub-part [2 marks]
 *   (b) Part b [3 marks]
 */
export function MultiPartQuestionDisplay({
  questions,
  currentQuestionId,
  className,
  showMarks = true
}: MultiPartQuestionDisplayProps) {
  const currentQuestion = questions.find(q => q.id === currentQuestionId);
  
  if (!currentQuestion) return null;

  // Build question hierarchy
  const hierarchy = buildQuestionHierarchy(questions, currentQuestion);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main question stem (if exists) */}
      {hierarchy.mainStem && (
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="text-base font-semibold px-3 py-1">
              Q{hierarchy.mainStem.question_number}
            </Badge>
            {hierarchy.mainStem.section_name && (
              <Badge variant="secondary" className="text-xs">
                {hierarchy.mainStem.section_name}
              </Badge>
            )}
          </div>
          <div className="pl-2 border-l-2 border-primary/20">
            <QuestionTextRenderer 
              text={hierarchy.mainStem.question_text || ''} 
              size="lg"
              className="text-foreground"
            />
          </div>
        </div>
      )}

      {/* Parent part (if exists) - e.g., (a) */}
      {hierarchy.parentPart && (
        <div className="space-y-3 ml-8 mt-4">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="text-sm font-semibold px-3 py-1">
              ({hierarchy.parentPart.part_label})
            </Badge>
          </div>
          <div className="pl-3 border-l-2 border-blue-300 bg-blue-50/30 rounded-r-sm">
            <QuestionTextRenderer 
              text={hierarchy.parentPart.question_text || ''} 
              size="md"
              className="text-foreground"
            />
          </div>
        </div>
      )}

      {/* Current question part */}
      <div className={cn(
        'space-y-4 p-6 rounded-lg border-2 bg-card shadow-sm',
        hierarchy.parentPart ? 'ml-12 mt-4' : hierarchy.mainStem ? 'ml-8 mt-4' : ''
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {currentQuestion.part_label && (
              <Badge variant="default" className="text-sm font-semibold">
                {formatPartLabel(currentQuestion.part_label)}
              </Badge>
            )}
            {!currentQuestion.part_label && (
              <Badge variant="default" className="text-base font-semibold">
                Q{currentQuestion.question_number}
              </Badge>
            )}
          </div>
          {showMarks && currentQuestion.marks > 0 && (
            <Badge variant="outline" className="text-sm">
              {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
            </Badge>
          )}
        </div>
        
        <QuestionTextRenderer 
          text={currentQuestion.question_text !== null ? currentQuestion.question_text : ''} 
          size="lg"
          className="text-foreground font-medium"
        />

        {currentQuestion.image_url && (
          <div className="rounded-lg border overflow-hidden mt-3">
            <img
              src={currentQuestion.image_url}
              alt="Question diagram"
              className="w-full h-auto max-h-96 object-contain"
            />
          </div>
        )}
      </div>

      {/* Context: Show sibling parts for reference - only if this is actually a multi-part question */}
      {hierarchy.siblings.length > 0 && (
        hierarchy.mainStem || hierarchy.parentPart || currentQuestion.part_label
      ) && (
        <div className="mt-6 p-4 bg-muted/40 rounded-lg border border-dashed">
          <p className="text-xs text-muted-foreground mb-3 font-medium">
            Other parts of this question:
          </p>
          <div className="flex flex-wrap gap-2">
            {hierarchy.siblings.map(sibling => (
              <Badge 
                key={sibling.id} 
                variant={sibling.id === currentQuestionId ? 'default' : 'outline'}
                className="text-xs"
              >
                {formatPartLabel(sibling.part_label || `Q${sibling.question_number}`)}
                {sibling.marks > 0 && ` (${sibling.marks}m)`}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Build the question hierarchy for display
 */
function buildQuestionHierarchy(allQuestions: PaperQuestion[], current: PaperQuestion) {
  const questionNumber = current.question_number;
  
  // Get all questions with the same question number
  const relatedQuestions = allQuestions.filter(q => q.question_number === questionNumber);
  
  // Sort by part_label to maintain order
  relatedQuestions.sort((a, b) => {
    const aLabel = a.part_label || '';
    const bLabel = b.part_label || '';
    return aLabel.localeCompare(bLabel);
  });

  // Find main stem (no part_label or marks = 0)
  const mainStem = relatedQuestions.find(q => 
    !q.part_label || (q.part_label === '' && q.marks === 0)
  );

  // Find parent part (e.g., for Q2a(i), parent is Q2a)
  let parentPart: PaperQuestion | null = null;
  if (current.part_label && current.part_label.includes('(')) {
    // Extract parent label: "a(i)" -> "a"
    const parentLabel = current.part_label.split('(')[0];
    parentPart = relatedQuestions.find(q => 
      q.part_label === parentLabel && q.id !== current.id
    ) || null;
  }

  // Find siblings (same level)
  let siblings: PaperQuestion[] = [];
  if (current.part_label) {
    const currentLevel = getPartLevel(current.part_label);
    siblings = relatedQuestions.filter(q => 
      q.part_label && 
      getPartLevel(q.part_label) === currentLevel &&
      q.marks > 0 // Only actual answerable parts
    );
  } else {
    siblings = relatedQuestions.filter(q => !q.part_label && q.marks > 0);
  }

  return {
    mainStem: mainStem && mainStem.id !== current.id ? mainStem : null,
    parentPart: parentPart,
    siblings,
    current
  };
}

/**
 * Get the nesting level of a part label
 * "a" -> 1, "a(i)" -> 2, "a(i)(A)" -> 3
 */
function getPartLevel(partLabel: string): number {
  if (!partLabel) return 0;
  return (partLabel.match(/\(/g) || []).length + 1;
}

/**
 * Format part label for display
 * "a(i)" -> "(a)(i)", "b" -> "(b)"
 */
function formatPartLabel(label: string): string {
  if (!label) return '';
  
  // If already has parentheses, return as is
  if (label.startsWith('(')) return label;
  
  // Split by parentheses and wrap each part
  const parts = label.split(/[()]/).filter(Boolean);
  return parts.map(p => `(${p})`).join('');
}

export default MultiPartQuestionDisplay;
