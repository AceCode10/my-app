'use client';

import { useState, useEffect } from 'react';
import { Assessment, Question, SubmitAnswerRequest } from '@/types/assessment';

interface TestAttempt {
  id: string;
  assignment_id: string;
  test_id?: string;
  paper_id?: string;
  user_id: string;
  status: string;
  started_at: string;
  submitted_at?: string;
  answers: any;
  score?: number;
  max_score?: number;
}
import { Timer } from './Timer';
import { QuestionDisplay } from './QuestionDisplay';
import { QuestionNavigator } from './QuestionNavigator';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAssessmentState, useAutoSave, useVisibilityChange, usePreventCopyPaste, useFullscreen } from '@/hooks/useAssessmentTimer';
import { ChevronLeft, ChevronRight, Send, Maximize, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TestInterfaceProps {
  assessment: Assessment;
  attempt: TestAttempt;
  questions: Question[];
  onSubmitAnswer: (answer: SubmitAnswerRequest) => Promise<void>;
  onSubmitAssessment: () => Promise<void>;
  onAutoSave: () => Promise<void>;
}

export function TestInterface({
  assessment,
  attempt,
  questions,
  onSubmitAnswer,
  onSubmitAssessment,
  onAutoSave
}: TestInterfaceProps) {
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  const {
    currentQuestionIndex,
    currentQuestion,
    answers,
    flaggedQuestions,
    goToNext,
    goToPrevious,
    goToQuestion,
    setAnswer,
    toggleFlag,
    getProgress
  } = useAssessmentState({
    attemptId: attempt.id,
    questions
  });

  const { lastSaved, isSaving } = useAutoSave({
    onSave: onAutoSave,
    interval: 30000,
    enabled: true
  });

  const { hiddenCount } = useVisibilityChange({
    onHidden: () => {
      console.warn('Tab hidden - this may be flagged');
    },
    warnOnHidden: true
  });

  usePreventCopyPaste(true);

  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreen();

  const progress = getProgress();
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  const handleAnswerChange = async (answerText: string | null, choiceId?: string | null) => {
    setAnswer(currentQuestion.id, { answerText, choiceId });

    // Submit answer to backend
    try {
      await onSubmitAnswer({
        attempt_id: attempt.id,
        question_id: currentQuestion.id,
        answer_text: answerText || undefined,
        selected_choice_id: choiceId || undefined,
        flagged_for_review: flaggedQuestions.has(currentQuestion.id)
      });
    } catch (error) {
      console.error('Failed to save answer:', error);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmitAssessment();
    } catch (error) {
      console.error('Failed to submit assessment:', error);
    } finally {
      setIsSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const handleTimeWarning = (minutesRemaining: number) => {
    setShowWarning(true);
    setWarningMessage(`${minutesRemaining} minute${minutesRemaining === 1 ? '' : 's'} remaining!`);
    setTimeout(() => setShowWarning(false), 5000);
  };

  const handleTimeExpire = async () => {
    await handleSubmit();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Timer */}
      {assessment.duration_minutes && (
        <Timer
          durationMinutes={assessment.duration_minutes}
          startedAt={attempt.started_at}
          onExpire={handleTimeExpire}
          onWarning={handleTimeWarning}
        />
      )}

      {/* Warning Alert */}
      {showWarning && (
        <Alert className="fixed top-20 right-4 z-40 w-80 border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800 font-medium">
            {warningMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Tab Switch Warning */}
      {hiddenCount > 0 && (
        <Alert className="fixed bottom-4 left-4 z-40 w-80 border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            Tab switches detected: {hiddenCount}. This may be flagged.
          </AlertDescription>
        </Alert>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
              <p className="text-gray-600 mt-1">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Progress */}
              <div className="text-right">
                <div className="text-sm text-gray-600">Progress</div>
                <div className="text-lg font-semibold text-blue-600">
                  {progress.answered}/{progress.total}
                </div>
              </div>

              {/* Fullscreen Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={isFullscreen ? exitFullscreen : enterFullscreen}
              >
                <Maximize className="w-4 h-4" />
              </Button>

              {/* Auto-save Status */}
              <div className="text-xs text-gray-500">
                {isSaving ? 'Saving...' : lastSaved ? `Saved ${new Date(lastSaved).toLocaleTimeString()}` : ''}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Question */}
            <QuestionDisplay
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              answer={answers.get(currentQuestion.id)?.answerText}
              selectedChoiceId={answers.get(currentQuestion.id)?.choiceId}
              onAnswerChange={handleAnswerChange}
              isFlagged={flaggedQuestions.has(currentQuestion.id)}
              onToggleFlag={() => toggleFlag(currentQuestion.id)}
            />

            {/* Navigation */}
            <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-4">
              <Button
                variant="outline"
                onClick={goToPrevious}
                disabled={isFirstQuestion}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="text-sm text-gray-600">
                {progress.unanswered > 0 && (
                  <span className="text-yellow-600 font-medium">
                    {progress.unanswered} unanswered
                  </span>
                )}
                {progress.flagged > 0 && (
                  <span className="text-yellow-600 font-medium ml-4">
                    {progress.flagged} flagged
                  </span>
                )}
              </div>

              {isLastQuestion ? (
                <Button
                  onClick={() => setShowSubmitDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Test
                </Button>
              ) : (
                <Button onClick={goToNext}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <QuestionNavigator
              questions={questions}
              currentIndex={currentQuestionIndex}
              answers={answers}
              flaggedQuestions={flaggedQuestions}
              onNavigate={goToQuestion}
              className="sticky top-4"
            />
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assessment?</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this assessment? You cannot change your answers after submission.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Questions:</span>
              <span className="font-medium">{progress.total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Answered:</span>
              <span className="font-medium text-green-600">{progress.answered}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Unanswered:</span>
              <span className="font-medium text-red-600">{progress.unanswered}</span>
            </div>
            {progress.flagged > 0 && (
              <div className="flex justify-between text-sm">
                <span>Flagged for Review:</span>
                <span className="font-medium text-yellow-600">{progress.flagged}</span>
              </div>
            )}
          </div>

          {progress.unanswered > 0 && (
            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                You have {progress.unanswered} unanswered question{progress.unanswered === 1 ? '' : 's'}.
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
              Go Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
