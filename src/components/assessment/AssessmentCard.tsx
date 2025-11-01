'use client';

import { Assessment } from '@/types/assessment';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, FileText, Award, Calendar, BookOpen, Play } from 'lucide-react';
import { formatDuration } from '@/lib/assessment-utils';
import { cn } from '@/lib/utils';

interface AssessmentCardProps {
  assessment: Assessment;
  onStart?: () => void;
  showDetails?: boolean;
  className?: string;
  userAttempts?: number;
}

export function AssessmentCard({
  assessment,
  onStart,
  showDetails = true,
  className,
  userAttempts = 0
}: AssessmentCardProps) {
  const canAttempt = userAttempts < assessment.max_attempts;
  const isFullPaper = assessment.assessment_type?.code === 'full_paper';
  const isQuiz = assessment.assessment_type?.code === 'quiz';

  return (
    <Card className={cn('hover:shadow-lg transition-shadow duration-200', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={isFullPaper ? 'default' : isQuiz ? 'secondary' : 'outline'}>
                {assessment.assessment_type?.name}
              </Badge>
              {assessment.exam_board && (
                <Badge variant="outline" className="text-xs">
                  {assessment.exam_board.code}
                </Badge>
              )}
            </div>
            <CardTitle className="text-xl">{assessment.title}</CardTitle>
            {assessment.description && (
              <CardDescription className="mt-2 line-clamp-2">
                {assessment.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      {showDetails && (
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            {assessment.duration_minutes && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(assessment.duration_minutes)}</span>
              </div>
            )}

            {/* Total Marks */}
            {assessment.total_marks && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Award className="w-4 h-4" />
                <span>{assessment.total_marks} marks</span>
              </div>
            )}

            {/* Subject */}
            {assessment.subject && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <BookOpen className="w-4 h-4" />
                <span className="truncate">{assessment.subject.name}</span>
              </div>
            )}

            {/* Past Paper Details */}
            {isFullPaper && assessment.exam_year && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>
                  {assessment.exam_year} {assessment.exam_series}
                </span>
              </div>
            )}

            {/* Paper Variant */}
            {isFullPaper && assessment.paper_variant && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>{assessment.paper_variant}</span>
              </div>
            )}

            {/* Question Count */}
            {assessment.questions && assessment.questions.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4" />
                <span>{assessment.questions.length} questions</span>
              </div>
            )}
          </div>

          {/* Attempts Info */}
          {assessment.max_attempts > 1 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Attempts:</span>
                <span className={cn(
                  'font-medium',
                  canAttempt ? 'text-green-600' : 'text-red-600'
                )}>
                  {userAttempts} / {assessment.max_attempts}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}

      <CardFooter className="flex gap-2">
        <Button
          onClick={onStart}
          disabled={!canAttempt}
          className="flex-1"
          size="lg"
        >
          <Play className="w-4 h-4 mr-2" />
          {userAttempts > 0 ? 'Retry' : 'Start'} {assessment.assessment_type?.name}
        </Button>
        
        {assessment.paper_file_url && (
          <Button variant="outline" size="lg" asChild>
            <a href={assessment.paper_file_url} target="_blank" rel="noopener noreferrer">
              <FileText className="w-4 h-4 mr-2" />
              View Paper
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
