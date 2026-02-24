'use client';

import { Question, QuestionChoice } from '@/types/assessment';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AnswerInput } from './AnswerInput';
import { Flag, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDifficultyColor, getQuestionTypeLabel } from '@/lib/assessment-utils';

// Simple markdown renderer - just handle basic formatting
const MarkdownRenderer = ({ children }: { children: string | null | undefined }) => {
  // Handle null/undefined children
  if (!children) {
    return <div className="text-muted-foreground italic">No content</div>;
  }
  
  // Simple fallback for now - just handle line breaks and basic formatting
  const formatted = children
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
    .replace(/\n/g, '<br />'); // Line breaks
  
  return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
};

// Extended question type with context fields
interface ExtendedQuestion extends Question {
  is_context_only?: boolean;
  needs_answer?: boolean;
  part_label?: string | null;
}

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  answer?: string | null;
  selectedChoiceId?: string | null;
  onAnswerChange: (answer: string | null, choiceId?: string | null) => void;
  isFlagged?: boolean;
  onToggleFlag?: () => void;
  showSolution?: boolean;
  isCorrect?: boolean | null;
  disabled?: boolean;
  className?: string;
}

// Helper to check if question needs answer input
function isAnswerableQuestion(question: Question): boolean {
  const q = question as ExtendedQuestion;
  if (q.is_context_only === true) return false;
  if (q.needs_answer === false) return false;
  if ((q.marks || 0) === 0) return false;
  return true;
}

export function QuestionDisplay({
  question,
  questionNumber,
  answer,
  selectedChoiceId,
  onAnswerChange,
  isFlagged = false,
  onToggleFlag,
  showSolution = false,
  isCorrect = null,
  disabled = false,
  className
}: QuestionDisplayProps) {
  const isMCQ = question.question_type === 'mcq';
  const isShortAnswer = question.question_type === 'short_answer';
  const isEssay = question.question_type === 'essay';
  const isCalculation = question.question_type === 'calculation';
  const isTrueFalse = question.question_type === 'true_false';
  
  // Check if this question needs an answer input
  const needsAnswer = isAnswerableQuestion(question);
  const extQuestion = question as ExtendedQuestion;

  return (
    <Card className={cn('relative', className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Question Header */}
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-sm">
                Question {questionNumber}
              </Badge>
              {question.marks && (
                <Badge variant="secondary" className="text-sm">
                  {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                </Badge>
              )}
              {question.difficulty && (
                <Badge className={getDifficultyColor(question.difficulty)}>
                  {question.difficulty}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {getQuestionTypeLabel(question.question_type)}
              </Badge>
            </div>

            {/* Question Text */}
            <div className="prose prose-sm max-w-none">
              <MarkdownRenderer>{question.stem_markdown}</MarkdownRenderer>
            </div>

            {/* Question Image */}
            {question.image_url && (
              <div className="mt-4 rounded-lg border overflow-hidden">
                <img
                  src={question.image_url}
                  alt="Question diagram"
                  className="w-full h-auto"
                />
              </div>
            )}
          </div>

          {/* Flag Button */}
          {onToggleFlag && (
            <Button
              variant={isFlagged ? 'default' : 'outline'}
              size="sm"
              onClick={onToggleFlag}
              className={cn(isFlagged && 'bg-yellow-500 hover:bg-yellow-600')}
            >
              <Flag className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Context-only question - no answer input needed */}
        {!needsAnswer && (
          <div className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary/30">
            <p className="text-sm text-muted-foreground italic">
              This is context information for the following question(s). No answer required.
            </p>
          </div>
        )}

        {/* MCQ Options - only show if answer needed */}
        {needsAnswer && isMCQ && question.choices && (
          <RadioGroup
            value={selectedChoiceId || ''}
            onValueChange={(value) => onAnswerChange(null, value)}
            disabled={disabled}
            className="space-y-3"
          >
            {question.choices
              .sort((a, b) => a.choice_order - b.choice_order)
              .map((choice, index) => {
                const isSelected = selectedChoiceId === choice.id;
                const isCorrectChoice = showSolution && choice.is_correct;
                const isWrongChoice = showSolution && isSelected && !choice.is_correct;

                return (
                  <div
                    key={choice.id}
                    className={cn(
                      'flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors',
                      isSelected && !showSolution && 'border-blue-500 bg-blue-50',
                      isCorrectChoice && 'border-green-500 bg-green-50',
                      isWrongChoice && 'border-red-500 bg-red-50',
                      !isSelected && !showSolution && 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <RadioGroupItem value={choice.id} id={choice.id} />
                    <Label
                      htmlFor={choice.id}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      <span className="font-medium mr-2">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      {choice.choice_text}
                      
                      {/* Show explanation in solution mode */}
                      {showSolution && choice.explanation && (
                        <div className="mt-2 text-sm text-gray-600 italic">
                          {choice.explanation}
                        </div>
                      )}
                    </Label>
                  </div>
                );
              })}
          </RadioGroup>
        )}

        {/* True/False - only show if answer needed */}
        {needsAnswer && isTrueFalse && (
          <RadioGroup
            value={answer || ''}
            onValueChange={(value) => onAnswerChange(value)}
            disabled={disabled}
            className="space-y-3"
          >
            {['True', 'False'].map((option) => (
              <div
                key={option}
                className={cn(
                  'flex items-center space-x-3 p-4 rounded-lg border-2',
                  answer === option && 'border-blue-500 bg-blue-50',
                  !answer && 'border-gray-200'
                )}
              >
                <RadioGroupItem value={option} id={option} />
                <Label htmlFor={option} className="cursor-pointer font-medium">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {/* Short Answer / Calculation - only show if answer needed */}
        {needsAnswer && (isShortAnswer || isCalculation) && (
          <div className="space-y-2">
            <Label htmlFor="answer">Your Answer</Label>
            <AnswerInput
              value={answer || ''}
              onChange={onAnswerChange}
              disabled={disabled}
              placeholder={isCalculation ? 'Enter your calculation and answer' : 'Type your answer here'}
              showFormatting={isCalculation}
              autoResize={false}
              className="min-h-[100px]"
            />
            {isCalculation && (
              <p className="text-sm text-gray-500">
                Show your working and final answer. Use formatting tools for equations.
              </p>
            )}
          </div>
        )}

        {/* Essay / Long Answer - only show if answer needed */}
        {needsAnswer && isEssay && (
          <div className="space-y-2">
            <Label htmlFor="essay">Your Answer</Label>
            <AnswerInput
              value={answer || ''}
              onChange={onAnswerChange}
              disabled={disabled}
              placeholder="Write your answer here..."
              showFormatting={true}
              autoResize={true}
              maxHeight={500}
              className="min-h-[200px]"
            />
          </div>
        )}

        {/* Solution Section */}
        {showSolution && (
          <div className="mt-6 pt-6 border-t space-y-4">
            {/* Correct/Incorrect Indicator */}
            {isCorrect !== null && (
              <div
                className={cn(
                  'p-4 rounded-lg font-medium',
                  isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                )}
              >
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </div>
            )}

            {/* Explanation */}
            {question.explanation && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Explanation</h4>
                <div className="text-blue-800 prose prose-sm max-w-none">
                  <MarkdownRenderer>{question.explanation}</MarkdownRenderer>
                </div>
              </div>
            )}

            {/* Mark Scheme */}
            {question.mark_scheme && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-900 mb-2">Mark Scheme</h4>
                <div className="text-purple-800 prose prose-sm max-w-none">
                  <MarkdownRenderer>{question.mark_scheme}</MarkdownRenderer>
                </div>
              </div>
            )}

            {/* Examiner Comments */}
            {question.examiner_comments && (
              <div className="bg-amber-50 p-4 rounded-lg">
                <h4 className="font-semibold text-amber-900 mb-2">Examiner Comments</h4>
                <div className="text-amber-800 prose prose-sm max-w-none">
                  <MarkdownRenderer>{question.examiner_comments}</MarkdownRenderer>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
