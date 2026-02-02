'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Calculator, Shuffle, Eye } from 'lucide-react';
import type { Assessment, AssessmentQuestion, Question } from '@/types/assessment';
import { cn } from '@/lib/utils';

interface TestPreviewProps {
  assessment: Partial<Assessment>;
  questions: (AssessmentQuestion & { question: Question })[];
}

// Extended question type with context fields
interface ExtendedQuestion extends Question {
  is_context_only?: boolean;
  needs_answer?: boolean;
  parent_question_id?: string | null;
  question_number?: string | number;
  part_label?: string | null;
}

// Group questions by question_number for multi-part display
interface QuestionGroup {
  questionNumber: string | number;
  parts: (AssessmentQuestion & { question: ExtendedQuestion })[];
  totalMarks: number;
}

function groupQuestionsByNumber(questions: (AssessmentQuestion & { question: Question })[]): QuestionGroup[] {
  const groups = new Map<string | number, (AssessmentQuestion & { question: ExtendedQuestion })[]>();
  
  questions.forEach(aq => {
    const q = aq.question as ExtendedQuestion;
    const num = q?.question_number || aq.question_order || 'unknown';
    if (!groups.has(num)) {
      groups.set(num, []);
    }
    groups.get(num)!.push(aq as AssessmentQuestion & { question: ExtendedQuestion });
  });
  
  const result: QuestionGroup[] = [];
  groups.forEach((parts, questionNumber) => {
    // Sort parts: context first (no part_label), then by part_label
    const sorted = [...parts].sort((a, b) => {
      const labelA = a.question?.part_label || '';
      const labelB = b.question?.part_label || '';
      if (!labelA && labelB) return -1;
      if (labelA && !labelB) return 1;
      return labelA.localeCompare(labelB);
    });
    
    // Calculate total marks (only from answerable parts)
    const totalMarks = sorted.reduce((sum, aq) => {
      const q = aq.question;
      if (q?.is_context_only || q?.needs_answer === false || (aq.custom_marks || q?.marks || 0) === 0) {
        return sum;
      }
      return sum + (aq.custom_marks || q?.marks || 0);
    }, 0);
    
    result.push({ questionNumber, parts: sorted, totalMarks });
  });
  
  // Sort by question number
  result.sort((a, b) => {
    const numA = typeof a.questionNumber === 'number' ? a.questionNumber : parseInt(String(a.questionNumber)) || 0;
    const numB = typeof b.questionNumber === 'number' ? b.questionNumber : parseInt(String(b.questionNumber)) || 0;
    return numA - numB;
  });
  
  return result;
}

export function TestPreview({ assessment, questions }: TestPreviewProps) {
  const questionGroups = groupQuestionsByNumber(questions);
  
  const totalMarks = questions.reduce((sum, q) => {
    return sum + (q.custom_marks || q.question?.marks || 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Test Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{assessment.title || 'Untitled Test'}</CardTitle>
              {assessment.description && (
                <p className="text-muted-foreground mt-2">{assessment.description}</p>
              )}
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {totalMarks} marks
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Test Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {assessment.duration_minutes && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{assessment.duration_minutes >= 60 ? `${Math.floor(assessment.duration_minutes / 60)}h ${assessment.duration_minutes % 60 > 0 ? `${assessment.duration_minutes % 60}m` : ''}` : `${assessment.duration_minutes} min`}</p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{questions.length} questions</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>

            {assessment.calculator_allowed && (
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Allowed</p>
                  <p className="text-xs text-muted-foreground">Calculator</p>
                </div>
              </div>
            )}

            {assessment.randomize_questions && (
              <div className="flex items-center gap-2">
                <Shuffle className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Randomized</p>
                  <p className="text-xs text-muted-foreground">Questions</p>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          {assessment.instructions && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Instructions:</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {assessment.instructions}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-6">
              {questionGroups.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No questions added yet</p>
                </div>
              ) : (
                questionGroups.map((group, groupIndex) => (
                  <QuestionGroupPreview
                    key={`group-${group.questionNumber}`}
                    group={group}
                    groupIndex={groupIndex}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to check if a question part needs an answer input
function isAnswerablePart(aq: AssessmentQuestion & { question: ExtendedQuestion }): boolean {
  const q = aq.question;
  if (!q) return false;
  if (q.is_context_only === true) return false;
  if (q.needs_answer === false) return false;
  const marks = aq.custom_marks || q.marks || 0;
  if (marks === 0) return false;
  return true;
}

function getQuestionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    mcq: 'Multiple Choice',
    short_answer: 'Short Answer',
    essay: 'Essay',
    calculation: 'Calculation',
    true_false: 'True/False',
    fill_in_blank: 'Fill in the Blank'
  };
  return labels[type] || type;
}

// Renders a group of related question parts together
function QuestionGroupPreview({
  group,
  groupIndex
}: {
  group: QuestionGroup;
  groupIndex: number;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Group Header */}
      <div className="flex items-center justify-between p-4 bg-muted/30 border-b">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            {groupIndex + 1}
          </div>
          <span className="font-medium">Question {group.questionNumber}</span>
        </div>
        {group.totalMarks > 0 && (
          <Badge variant="secondary" className="text-sm">
            {group.totalMarks} {group.totalMarks === 1 ? 'mark' : 'marks'}
          </Badge>
        )}
      </div>

      {/* Question Parts */}
      <div className="divide-y">
        {group.parts.map((aq, partIndex) => (
          <QuestionPartPreview
            key={aq.id || partIndex}
            assessmentQuestion={aq}
            isContext={!isAnswerablePart(aq)}
          />
        ))}
      </div>
    </div>
  );
}

// Renders a single question part (either context or answerable)
function QuestionPartPreview({
  assessmentQuestion,
  isContext
}: {
  assessmentQuestion: AssessmentQuestion & { question: ExtendedQuestion };
  isContext: boolean;
}) {
  const question = assessmentQuestion.question;
  const marks = assessmentQuestion.custom_marks || question?.marks || 0;
  const partLabel = question?.part_label;

  // Context parts - display without answer space
  if (isContext) {
    return (
      <div className={cn(
        "p-4",
        !partLabel ? "bg-muted/20 border-l-4 border-primary/30" : "bg-muted/10"
      )}>
        <div className="flex items-start gap-3">
          {partLabel && (
            <Badge variant="outline" className="text-sm font-semibold shrink-0">
              ({partLabel})
            </Badge>
          )}
          <p className="text-sm whitespace-pre-wrap flex-1">
            {assessmentQuestion.custom_question_text || question?.stem_markdown}
          </p>
        </div>
      </div>
    );
  }

  // Answerable parts - with marks and answer space
  return (
    <div className="p-4">
      {/* Part header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {partLabel && (
            <Badge variant="outline" className="text-sm font-semibold">
              ({partLabel})
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {getQuestionTypeLabel(question?.question_type || '')}
          </Badge>
          {question?.difficulty && (
            <Badge variant="secondary" className="text-xs">
              {question.difficulty}
            </Badge>
          )}
        </div>
        {marks > 0 && (
          <span className="text-sm text-muted-foreground">
            {marks} {marks === 1 ? 'mark' : 'marks'}
          </span>
        )}
      </div>

      {/* Question Text */}
      <div className="mb-4">
        <p className="text-sm whitespace-pre-wrap">
          {assessmentQuestion.custom_question_text || question?.stem_markdown}
        </p>
      </div>

      {/* Answer Choices (for MCQ) */}
      {question?.question_type === 'mcq' && question.choices && question.choices.length > 0 && (
        <div className="space-y-2 ml-4">
          {question.choices
            .sort((a, b) => a.choice_order - b.choice_order)
            .map((choice, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-md border",
                  choice.is_correct && "border-green-500 bg-green-50"
                )}
              >
                <p className="text-sm">{choice.choice_text}</p>
              </div>
            ))}
        </div>
      )}

      {/* Answer Space (for other types) */}
      {question?.question_type !== 'mcq' && (
        <div className="ml-4 p-4 border-2 border-dashed rounded-md">
          <p className="text-sm text-muted-foreground text-center">
            {question?.question_type === 'essay' ? 'Essay answer space' : 'Answer space'}
          </p>
        </div>
      )}

      {/* Mark Scheme (if available) */}
      {(question?.mark_scheme || assessmentQuestion.custom_mark_scheme) && (
        <div className="mt-4 ml-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs font-medium text-blue-900 mb-1">Mark Scheme:</p>
          <p className="text-xs text-blue-800">
            {assessmentQuestion.custom_mark_scheme || question?.mark_scheme}
          </p>
        </div>
      )}
    </div>
  );
}
