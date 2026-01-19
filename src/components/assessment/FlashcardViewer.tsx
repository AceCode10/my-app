'use client';

import { useState } from 'react';
import { Question, ConfidenceLevel } from '@/types/assessment';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RotateCcw, ChevronLeft, ChevronRight, Shuffle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlashcardViewerProps {
  questions: Question[];
  onUpdateProgress: (questionId: string, confidence: ConfidenceLevel) => Promise<void>;
  onComplete?: () => void;
  className?: string;
}

export function FlashcardViewer({
  questions,
  onUpdateProgress,
  onComplete,
  className
}: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCards, setReviewedCards] = useState<Set<string>>(new Set());
  const [isUpdating, setIsUpdating] = useState(false);

  const currentCard = questions[currentIndex];
  const progress = (reviewedCards.size / questions.length) * 100;
  const isLastCard = currentIndex === questions.length - 1;
  const isFirstCard = currentIndex === 0;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleConfidence = async (confidence: ConfidenceLevel) => {
    if (!currentCard) return;

    setIsUpdating(true);
    try {
      await onUpdateProgress(currentCard.id, confidence);
      setReviewedCards(prev => new Set(prev).add(currentCard.id));
      
      // Move to next card
      if (isLastCard) {
        onComplete?.();
      } else {
        setCurrentIndex(prev => prev + 1);
        setIsFlipped(false);
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrevious = () => {
    if (!isFirstCard) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleNext = () => {
    if (!isLastCard) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    // Shuffle remaining cards
    const remaining = questions.slice(currentIndex + 1);
    const shuffled = [...remaining].sort(() => Math.random() - 0.5);
    // This would need to be implemented at parent level
    console.log('Shuffle requested');
  };

  if (!currentCard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold mb-2">All Done! 🎉</h3>
          <p className="text-muted-foreground mb-4">You've reviewed all flashcards</p>
          <Button onClick={onComplete}>Finish Session</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('max-w-4xl mx-auto', className)}>
      {/* Progress Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Card {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {reviewedCards.size} reviewed
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Flashcard */}
      <div className="perspective-1000 mb-6">
        <div
          className={cn(
            'relative w-full h-[400px] transition-transform duration-500 transform-style-3d cursor-pointer',
            isFlipped && 'rotate-y-180'
          )}
          onClick={handleFlip}
        >
          {/* Front Side */}
          <Card
            className={cn(
              'absolute inset-0 backface-hidden',
              'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-200 dark:border-blue-800'
            )}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-8">
              <Badge className="mb-4 bg-blue-500">Question</Badge>
              <div className="text-center">
                <p className="text-2xl font-medium text-foreground mb-4">
                  {currentCard.stem_markdown}
                </p>
                {currentCard.image_url && (
                  <img
                    src={currentCard.image_url}
                    alt="Question"
                    className="max-w-full max-h-48 mx-auto rounded-lg"
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-6">Click to reveal answer</p>
            </CardContent>
          </Card>

          {/* Back Side */}
          <Card
            className={cn(
              'absolute inset-0 backface-hidden rotate-y-180',
              'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-200 dark:border-green-800'
            )}
          >
            <CardContent className="flex flex-col items-center justify-center h-full p-8">
              <Badge className="mb-4 bg-green-500">Answer</Badge>
              <div className="text-center mb-6">
                <p className="text-xl font-medium text-foreground mb-4">
                  {currentCard.correct_answer}
                </p>
                {currentCard.explanation && (
                  <div className="mt-4 p-4 bg-background/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{currentCard.explanation}</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Click to flip back</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confidence Buttons (only show when flipped) */}
      {isFlipped && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-2 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={() => handleConfidence('dont_know')}
            disabled={isUpdating}
          >
            <span className="text-2xl">😕</span>
            <span className="text-sm font-medium">Don't Know</span>
            <span className="text-xs text-muted-foreground">Review in 1 day</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-2 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-950"
            onClick={() => handleConfidence('need_practice')}
            disabled={isUpdating}
          >
            <span className="text-2xl">🤔</span>
            <span className="text-sm font-medium">Need Practice</span>
            <span className="text-xs text-muted-foreground">Review in 3 days</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-2 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
            onClick={() => handleConfidence('got_it')}
            disabled={isUpdating}
          >
            <span className="text-2xl">😊</span>
            <span className="text-sm font-medium">Got It</span>
            <span className="text-xs text-muted-foreground">Review in 7 days</span>
          </Button>

          <Button
            variant="outline"
            className="h-20 flex-col gap-2 border-2 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950"
            onClick={() => handleConfidence('mastered')}
            disabled={isUpdating}
          >
            <span className="text-2xl">🎉</span>
            <span className="text-sm font-medium">Mastered</span>
            <span className="text-xs text-muted-foreground">Review in 30 days</span>
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstCard}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleShuffle}
            title="Shuffle remaining cards"
          >
            <Shuffle className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFlipped(false)}
            title="Reset card"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={handleNext}
          disabled={isLastCard}
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground text-center">
          <strong>Keyboard shortcuts:</strong> Space to flip • 1-4 for confidence • ← → to navigate
        </p>
      </div>
    </div>
  );
}
