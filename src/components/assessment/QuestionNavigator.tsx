'use client';

import { Question, AssessmentAnswer } from '@/types/assessment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, Flag, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionNavigatorProps {
  questions: Question[];
  currentIndex: number;
  answers: Map<string, AssessmentAnswer>;
  flaggedQuestions: Set<string>;
  onNavigate: (index: number) => void;
  className?: string;
}

export function QuestionNavigator({
  questions,
  currentIndex,
  answers,
  flaggedQuestions,
  onNavigate,
  className
}: QuestionNavigatorProps) {
  const getQuestionStatus = (question: Question, index: number) => {
    const isCurrent = index === currentIndex;
    const isAnswered = answers.has(question.id);
    const isFlagged = flaggedQuestions.has(question.id);

    return { isCurrent, isAnswered, isFlagged };
  };

  const stats = {
    total: questions.length,
    answered: Array.from(answers.keys()).length,
    flagged: flaggedQuestions.size,
    unanswered: questions.length - Array.from(answers.keys()).length
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="text-lg">Question Navigator</CardTitle>
        
        {/* Progress Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
          <div className="text-center p-2 bg-green-50 rounded">
            <div className="font-bold text-green-700">{stats.answered}</div>
            <div className="text-green-600 text-xs">Answered</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <div className="font-bold text-gray-700">{stats.unanswered}</div>
            <div className="text-gray-600 text-xs">Unanswered</div>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded">
            <div className="font-bold text-yellow-700">{stats.flagged}</div>
            <div className="text-yellow-600 text-xs">Flagged</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-5 gap-2">
            {questions.map((question, index) => {
              const { isCurrent, isAnswered, isFlagged } = getQuestionStatus(question, index);

              return (
                <Button
                  key={question.id}
                  variant={isCurrent ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onNavigate(index)}
                  className={cn(
                    'relative h-12 w-full',
                    isAnswered && !isCurrent && 'bg-green-50 border-green-500 hover:bg-green-100',
                    isFlagged && 'ring-2 ring-yellow-400'
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-semibold">{index + 1}</span>
                    <div className="flex gap-1">
                      {isAnswered && <Check className="w-3 h-3 text-green-600" />}
                      {isFlagged && <Flag className="w-3 h-3 text-yellow-600" />}
                      {!isAnswered && !isCurrent && <Circle className="w-3 h-3 text-gray-400" />}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t space-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 border border-green-500 rounded" />
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border border-gray-300 rounded" />
            <span>Not answered</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-white border-2 border-yellow-400 rounded" />
            <span>Flagged for review</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded" />
            <span>Current question</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
