'use client';

import { Assessment, AssessmentAttempt, Question, AssessmentAnswer } from '@/types/assessment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { QuestionDisplay } from './QuestionDisplay';
import { Award, Clock, CheckCircle, XCircle, AlertCircle, Download, Share2, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGradeLetter } from '@/lib/assessment-utils';

interface ResultsViewProps {
  assessment: Assessment;
  attempt: AssessmentAttempt;
  questions: Question[];
  answers: AssessmentAnswer[];
  onRetry?: () => void;
  onDownloadPDF?: () => void;
  onGoHome?: () => void;
  className?: string;
}

export function ResultsView({
  assessment,
  attempt,
  questions,
  answers,
  onRetry,
  onDownloadPDF,
  onGoHome,
  className
}: ResultsViewProps) {
  const percentage = attempt.percentage || 0;
  const score = attempt.score || 0;
  const maxScore = attempt.max_score || assessment.total_marks || 0;
  const isPassed = percentage >= 50;
  const gradeLetter = getGradeLetter(percentage);

  // Calculate statistics
  const correctCount = answers.filter(a => a.is_correct === true).length;
  const incorrectCount = answers.filter(a => a.is_correct === false).length;
  const unansweredCount = questions.length - answers.length;
  const needsGradingCount = answers.filter(a => a.is_correct === null).length;

  const timeSpent = attempt.time_spent_seconds || 0;
  const timeSpentMinutes = Math.floor(timeSpent / 60);
  const timeSpentSeconds = timeSpent % 60;

  return (
    <div className={cn('min-h-screen bg-gray-50 py-8', className)}>
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">{assessment.title}</CardTitle>
                <p className="text-gray-600">Assessment Results</p>
              </div>
              <div className="flex gap-2">
                {onGoHome && (
                  <Button variant="outline" onClick={onGoHome}>
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                )}
                {onDownloadPDF && (
                  <Button variant="outline" onClick={onDownloadPDF}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                )}
                {onRetry && attempt.attempt_number < assessment.max_attempts && (
                  <Button onClick={onRetry}>
                    Retry Assessment
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Score Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Overall Score */}
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-5xl font-bold text-blue-600 mb-2">
                  {percentage.toFixed(1)}%
                </div>
                <div className="text-gray-600 mb-2">Overall Score</div>
                <Badge className={cn(
                  'text-lg px-4 py-1',
                  isPassed ? 'bg-green-500' : 'bg-red-500'
                )}>
                  {isPassed ? '✓ Passed' : '✗ Failed'}
                </Badge>
              </div>

              {/* Grade */}
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                <div className="text-5xl font-bold text-purple-600 mb-2">
                  {gradeLetter}
                </div>
                <div className="text-gray-600 mb-2">Grade</div>
                <div className="text-sm text-gray-500">
                  {score} / {maxScore} marks
                </div>
              </div>

              {/* Time Taken */}
              <div className="text-center p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg">
                <div className="text-3xl font-bold text-amber-600 mb-2">
                  {timeSpentMinutes}:{timeSpentSeconds.toString().padStart(2, '0')}
                </div>
                <div className="text-gray-600 mb-2">Time Taken</div>
                {assessment.duration_minutes && (
                  <div className="text-sm text-gray-500">
                    of {assessment.duration_minutes} minutes
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Score Progress</span>
                <span className="text-sm text-gray-600">{score} / {maxScore}</span>
              </div>
              <Progress value={percentage} className="h-3" />
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{correctCount}</div>
                  <div className="text-sm text-green-700">Correct</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                <XCircle className="w-8 h-8 text-red-600" />
                <div>
                  <div className="text-2xl font-bold text-red-600">{incorrectCount}</div>
                  <div className="text-sm text-red-700">Incorrect</div>
                </div>
              </div>

              {needsGradingCount > 0 && (
                <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{needsGradingCount}</div>
                    <div className="text-sm text-yellow-700">Pending</div>
                  </div>
                </div>
              )}

              {unansweredCount > 0 && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <AlertCircle className="w-8 h-8 text-gray-600" />
                  <div>
                    <div className="text-2xl font-bold text-gray-600">{unansweredCount}</div>
                    <div className="text-sm text-gray-700">Skipped</div>
                  </div>
                </div>
              )}
            </div>

            {/* Pending Grading Notice */}
            {needsGradingCount > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-yellow-900 mb-1">
                      Manual Grading Required
                    </h4>
                    <p className="text-sm text-yellow-800">
                      {needsGradingCount} question{needsGradingCount === 1 ? '' : 's'} require{needsGradingCount === 1 ? 's' : ''} manual grading by your teacher. 
                      Your final score may change once grading is complete.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Solutions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Detailed Solutions</h2>
          <div className="space-y-6">
            {questions.map((question, index) => {
              const answer = answers.find(a => a.question_id === question.id);
              
              return (
                <QuestionDisplay
                  key={question.id}
                  question={question}
                  questionNumber={index + 1}
                  answer={answer?.answer_text || null}
                  selectedChoiceId={answer?.selected_choice_id || null}
                  onAnswerChange={() => {}} // Read-only
                  showSolution={true}
                  isCorrect={answer?.is_correct || null}
                  disabled={true}
                />
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 justify-center">
              {onRetry && attempt.attempt_number < assessment.max_attempts && (
                <Button size="lg" onClick={onRetry}>
                  Try Again ({assessment.max_attempts - attempt.attempt_number} attempt{assessment.max_attempts - attempt.attempt_number === 1 ? '' : 's'} left)
                </Button>
              )}
              {onDownloadPDF && (
                <Button size="lg" variant="outline" onClick={onDownloadPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Results
                </Button>
              )}
              <Button size="lg" variant="outline" onClick={onGoHome}>
                <Home className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
