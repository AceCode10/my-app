'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { flashcardService, Flashcard, FlashcardProgress, Rating } from '@/lib/flashcards/flashcard-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Lightbulb,
  Clock,
  Brain,
  Trophy
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface StudyCard extends Flashcard {
  progress?: FlashcardProgress;
}

export default function StudyPage() {
  const router = useRouter();
  const params = useParams();
  const deckId = params.id as string;
  const { user } = useUser();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState({
    studied: 0,
    correct: 0,
    wrong: 0,
    startTime: Date.now()
  });
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (user && deckId) {
      initializeStudy();
    }
  }, [user, deckId]);

  async function initializeStudy() {
    setLoading(true);
    try {
      // Get cards for review
      let reviewCards = await flashcardService.getCardsForReview(deckId);
      
      // If no review cards, get new cards
      if (reviewCards.length === 0) {
        const newCards = await flashcardService.getNewCards(deckId, 20);
        reviewCards = newCards.map(c => ({ ...c, progress: undefined }));
      }

      if (reviewCards.length === 0) {
        toast({
          title: 'No cards to study',
          description: 'This deck has no cards yet'
        });
        router.push(`/student/flashcards/${deckId}`);
        return;
      }

      setCards(reviewCards);

      // Start session
      const sid = await flashcardService.startSession(deckId, 'review');
      setSessionId(sid);
    } catch (error) {
      console.error('Error initializing study:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load flashcards'
      });
    } finally {
      setLoading(false);
    }
  }

  const handleRating = async (rating: Rating) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    // Update progress
    await flashcardService.reviewCard(currentCard.id, rating);

    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      studied: prev.studied + 1,
      correct: prev.correct + (rating >= 2 ? 1 : 0),
      wrong: prev.wrong + (rating < 2 ? 1 : 0)
    }));

    // Move to next card or complete
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
      setShowHint(false);
    } else {
      await completeSession();
    }
  };

  const completeSession = async () => {
    if (sessionId) {
      const timeSpent = Math.floor((Date.now() - sessionStats.startTime) / 1000);
      await flashcardService.updateSession(sessionId, {
        cards_studied: sessionStats.studied + 1,
        cards_correct: sessionStats.correct,
        cards_wrong: sessionStats.wrong,
        time_spent_seconds: timeSpent
      });
      await flashcardService.endSession(sessionId);
    }
    setIsComplete(true);
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (isComplete) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        setIsFlipped(prev => !prev);
        break;
      case '1':
        if (isFlipped) handleRating(0);
        break;
      case '2':
        if (isFlipped) handleRating(1);
        break;
      case '3':
        if (isFlipped) handleRating(2);
        break;
      case '4':
        if (isFlipped) handleRating(3);
        break;
      case 'h':
        setShowHint(true);
        break;
    }
  }, [isFlipped, isComplete, currentIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const currentCard = cards[currentIndex];
  const progressPercent = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (isComplete) {
    const timeSpent = Math.floor((Date.now() - sessionStats.startTime) / 1000);
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    const accuracy = sessionStats.studied > 0 
      ? Math.round((sessionStats.correct / sessionStats.studied) * 100) 
      : 0;

    return (
      <div className="max-w-2xl mx-auto">
        <Card className="text-center py-12">
          <CardContent className="space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-4">
              <Trophy className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold">Session Complete!</h1>
            <p className="text-muted-foreground">Great job studying today!</p>

            <div className="grid grid-cols-3 gap-4 py-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">{sessionStats.studied}</p>
                <p className="text-sm text-muted-foreground">Cards Studied</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{accuracy}%</p>
                <p className="text-sm text-muted-foreground">Accuracy</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{minutes}:{seconds.toString().padStart(2, '0')}</p>
                <p className="text-sm text-muted-foreground">Time Spent</p>
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" asChild>
                <Link href={`/student/flashcards/${deckId}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Deck
                </Link>
              </Button>
              <Button onClick={() => {
                setIsComplete(false);
                setCurrentIndex(0);
                setSessionStats({ studied: 0, correct: 0, wrong: 0, startTime: Date.now() });
                initializeStudy();
              }}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Study Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/student/flashcards/${deckId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Exit
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <Badge variant="secondary">
            {currentIndex + 1} / {cards.length}
          </Badge>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-green-600" />
            {sessionStats.correct}
            <X className="h-4 w-4 text-red-600 ml-2" />
            {sessionStats.wrong}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <Progress value={progressPercent} className="h-2" />

      {/* Flashcard */}
      {currentCard && (
        <div
          className="perspective-1000 cursor-pointer"
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <Card
            className={cn(
              "min-h-[400px] transition-all duration-500 transform-style-3d relative",
              isFlipped && "rotate-y-180"
            )}
          >
            {/* Front */}
            <CardContent
              className={cn(
                "absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 text-center",
                isFlipped && "invisible"
              )}
            >
              <Badge variant="outline" className="mb-4">Question</Badge>
              <div className="prose prose-lg max-w-none">
                <ReactMarkdown>{currentCard.front_content}</ReactMarkdown>
              </div>
              {currentCard.front_image_url && (
                <img
                  src={currentCard.front_image_url}
                  alt="Question"
                  className="max-h-48 mt-4 rounded-lg"
                />
              )}

              {/* Hint */}
              {currentCard.hints && currentCard.hints.length > 0 && (
                <div className="mt-6">
                  {showHint ? (
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      💡 {currentCard.hints[0]}
                    </p>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint(true);
                      }}
                    >
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Show Hint
                    </Button>
                  )}
                </div>
              )}

              <p className="text-sm text-muted-foreground mt-6">
                Click to reveal answer (or press Space)
              </p>
            </CardContent>

            {/* Back */}
            <CardContent
              className={cn(
                "absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-8 text-center bg-primary/5",
                !isFlipped && "invisible"
              )}
            >
              <Badge variant="default" className="mb-4">Answer</Badge>
              <div className="prose prose-lg max-w-none">
                <ReactMarkdown>{currentCard.back_content}</ReactMarkdown>
              </div>
              {currentCard.back_image_url && (
                <img
                  src={currentCard.back_image_url}
                  alt="Answer"
                  className="max-h-48 mt-4 rounded-lg"
                />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rating Buttons */}
      {isFlipped && (
        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            How well did you know this?
          </p>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="flex-col h-auto py-3 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => handleRating(0)}
            >
              <X className="h-5 w-5 mb-1 text-red-500" />
              <span className="text-xs">Again</span>
              <span className="text-xs text-muted-foreground">1 day</span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto py-3 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
              onClick={() => handleRating(1)}
            >
              <span className="text-lg mb-1">😐</span>
              <span className="text-xs">Hard</span>
              <span className="text-xs text-muted-foreground">~3 days</span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto py-3 border-green-200 hover:bg-green-50 hover:text-green-700"
              onClick={() => handleRating(2)}
            >
              <Check className="h-5 w-5 mb-1 text-green-500" />
              <span className="text-xs">Good</span>
              <span className="text-xs text-muted-foreground">~7 days</span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto py-3 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              onClick={() => handleRating(3)}
            >
              <Trophy className="h-5 w-5 mb-1 text-blue-500" />
              <span className="text-xs">Easy</span>
              <span className="text-xs text-muted-foreground">~14 days</span>
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Keyboard: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
          </p>
        </div>
      )}
    </div>
  );
}
