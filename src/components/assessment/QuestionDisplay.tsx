'use client';

import { Question, QuestionChoice } from '@/types/assessment';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Flag, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDifficultyColor, getQuestionTypeLabel } from '@/lib/assessment-utils';

// Markdown component - install with: npm install react-markdown
// For now, we'll use a simple div if not available
const MarkdownRenderer = ({ children }: { children: string }) => {
  // Try to import ReactMarkdown dynamically
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ReactMarkdown = require('react-markdown');
    return <ReactMarkdown>{children}</ReactMarkdown>;
  } catch {
    // Fallback to simple HTML rendering
    return <div dangerouslySetInnerHTML={{ __html: children.replace(/\n/g, '<br />') }} />;
  }
};

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
        {/* MCQ Options */}
        {isMCQ && question.choices && (
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

        {/* True/False */}
        {isTrueFalse && (
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

        {/* Short Answer / Calculation */}
        {(isShortAnswer || isCalculation) && (
          <div className="space-y-2">
            <Label htmlFor="answer">Your Answer</Label>
            <Input
              id="answer"
              type={isCalculation ? 'text' : 'text'}
              value={answer || ''}
              onChange={(e) => onAnswerChange(e.target.value)}
              disabled={disabled}
              placeholder={isCalculation ? 'Enter your calculation and answer' : 'Type your answer here'}
              className="text-lg"
            />
            {isCalculation && (
              <p className="text-sm text-gray-500">
                Show your working and final answer
              </p>
            )}
          </div>
        )}

        {/* Essay / Long Answer */}
        {isEssay && (
          <div className="space-y-2">
            <Label htmlFor="essay">Your Answer</Label>
            <Textarea
              id="essay"
              value={answer || ''}
              onChange={(e) => onAnswerChange(e.target.value)}
              disabled={disabled}
              placeholder="Write your answer here..."
              rows={8}
              className="resize-none"
            />
            <p className="text-sm text-gray-500">
              {answer?.length || 0} characters
            </p>
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
