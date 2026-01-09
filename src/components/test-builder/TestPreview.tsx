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

export function TestPreview({ assessment, questions }: TestPreviewProps) {
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
              {questions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No questions added yet</p>
                </div>
              ) : (
                questions.map((aq, index) => (
                  <QuestionPreview
                    key={aq.id}
                    assessmentQuestion={aq}
                    index={index}
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

function QuestionPreview({
  assessmentQuestion,
  index
}: {
  assessmentQuestion: AssessmentQuestion & { question: Question };
  index: number;
}) {
  const question = assessmentQuestion.question;
  const marks = assessmentQuestion.custom_marks || question?.marks || 0;

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mcq: 'Multiple Choice',
      short_answer: 'Short Answer',
      essay: 'Essay',
      calculation: 'Calculation',
      true_false: 'True/False',
      fill_in_blank: 'Fill in the Blank'
    };
    return labels[type] || type;
  };

  return (
    <div className="border rounded-lg p-6">
      {/* Question Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            {index + 1}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">
                {getQuestionTypeLabel(question?.question_type || '')}
              </Badge>
              {question?.difficulty && (
                <Badge variant="secondary">
                  {question.difficulty}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          {marks} {marks === 1 ? 'mark' : 'marks'}
        </Badge>
      </div>

      {/* Question Text */}
      <div className="mb-4">
        <p className="text-sm whitespace-pre-wrap">
          {assessmentQuestion.custom_question_text || question?.stem_markdown}
        </p>
      </div>

      {/* Answer Choices (for MCQ) */}
      {question?.question_type === 'mcq' && question.choices && question.choices.length > 0 && (
        <div className="space-y-2 ml-11">
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
        <div className="ml-11 p-4 border-2 border-dashed rounded-md">
          <p className="text-sm text-muted-foreground text-center">
            {question?.question_type === 'essay' ? 'Essay answer space' : 'Answer space'}
          </p>
        </div>
      )}

      {/* Mark Scheme (if available) */}
      {(question?.mark_scheme || assessmentQuestion.custom_mark_scheme) && (
        <div className="mt-4 ml-11 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-xs font-medium text-blue-900 mb-1">Mark Scheme:</p>
          <p className="text-xs text-blue-800">
            {assessmentQuestion.custom_mark_scheme || question?.mark_scheme}
          </p>
        </div>
      )}
    </div>
  );
}
