'use client';

// ============================================
// EXAM BOARD ONBOARDING COMPONENT
// One-time exam board selection after signup
// ============================================

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useExamBoard } from '@/contexts/ExamBoardContext';
import { cn } from '@/lib/utils';
import { Check, GraduationCap } from 'lucide-react';

interface ExamBoardOnboardingProps {
  onComplete: (boardId: string | null) => void;
  onSkip?: () => void;
  allowSkip?: boolean;
}

export function ExamBoardOnboarding({
  onComplete,
  onSkip,
  allowSkip = true
}: ExamBoardOnboardingProps) {
  const { examBoards, updateUserPreference } = useExamBoard();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedBoardId) return;

    setIsSubmitting(true);
    try {
      await updateUserPreference(selectedBoardId);
      onComplete(selectedBoardId);
    } catch (error) {
      console.error('Error saving exam board preference:', error);
      alert('Failed to save preference. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-4xl shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">
            Welcome to RevisionPlus! 🎓
          </CardTitle>
          <CardDescription className="text-lg">
            Which exam board are you studying? This helps us personalize your learning experience.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Exam Board Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examBoards.map(board => (
              <button
                key={board.id}
                onClick={() => setSelectedBoardId(board.id)}
                className={cn(
                  'relative p-6 rounded-lg border-2 transition-all duration-200',
                  'hover:shadow-md hover:scale-105',
                  'text-left space-y-2',
                  selectedBoardId === board.id
                    ? 'border-primary bg-primary/5 shadow-lg'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                {selectedBoardId === board.id && (
                  <div className="absolute top-3 right-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className="font-bold text-xl">{board.name}</div>
                <div className="text-sm font-medium text-gray-600">
                  {board.full_name}
                </div>
                {board.description && (
                  <div className="text-xs text-gray-500 mt-2">
                    {board.description}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">💡 Don't worry!</p>
            <p>You can change this anytime in your settings, and you can always browse content from all exam boards.</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!selectedBoardId || isSubmitting}
              className="sm:min-w-[200px]"
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </Button>
            
            {allowSkip && (
              <Button
                size="lg"
                variant="outline"
                onClick={handleSkip}
                disabled={isSubmitting}
                className="sm:min-w-[200px]"
              >
                Skip for now
              </Button>
            )}
          </div>

          {allowSkip && (
            <p className="text-xs text-center text-gray-500">
              Skipping will show you content from all exam boards
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Compact version for settings page
export function ExamBoardSettings() {
  const { examBoards, userPreference, updateUserPreference } = useExamBoard();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(
    userPreference?.preferred_exam_board_id || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    setShowSuccess(false);
    try {
      await updateUserPreference(selectedBoardId);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating exam board:', error);
      alert('Failed to update preference. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanged = selectedBoardId !== userPreference?.preferred_exam_board_id;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exam Board Preference</CardTitle>
        <CardDescription>
          Choose your exam board to see personalized content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setSelectedBoardId(null)}
            className={cn(
              'p-4 rounded-lg border-2 transition-all',
              'hover:shadow-md text-left',
              selectedBoardId === null
                ? 'border-primary bg-primary/5'
                : 'border-gray-200 hover:border-gray-300'
            )}
          >
            <div className="font-medium">All Exam Boards</div>
            <div className="text-xs text-gray-500 mt-1">
              Show content from all boards
            </div>
          </button>

          {examBoards.map(board => (
            <button
              key={board.id}
              onClick={() => setSelectedBoardId(board.id)}
              className={cn(
                'p-4 rounded-lg border-2 transition-all',
                'hover:shadow-md text-left',
                selectedBoardId === board.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <div className="font-medium">{board.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {board.full_name}
              </div>
            </button>
          ))}
        </div>

        {hasChanged && (
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        )}

        {showSuccess && (
          <div className="text-sm text-green-600 font-medium">
            ✓ Exam board preference updated successfully!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
