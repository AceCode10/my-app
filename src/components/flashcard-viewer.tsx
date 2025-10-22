'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import type { Flashcard } from '@/types';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';

interface FlashcardViewerProps {
  cards: Flashcard[];
}

export function FlashcardViewer({ cards }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!cards || cards.length === 0) {
    return <p>No cards in this deck.</p>;
  }

  const card = cards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6">
        <div className="w-full">
            <Progress value={((currentIndex + 1) / cards.length) * 100} />
            <p className="text-center text-sm text-muted-foreground mt-2">{currentIndex + 1} / {cards.length}</p>
        </div>
      
        <div
            className="w-full h-80 perspective-1000"
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div
            className={cn(
                'relative w-full h-full transform-style-3d transition-transform duration-700',
                isFlipped ? 'rotate-y-180' : ''
            )}
            >
                {/* Front of the card */}
                <Card className="absolute w-full h-full backface-hidden flex items-center justify-center p-6">
                    <CardContent className="text-center text-2xl font-semibold">
                        {card.front}
                    </CardContent>
                </Card>
                {/* Back of the card */}
                <Card className="absolute w-full h-full rotate-y-180 backface-hidden flex items-center justify-center p-6">
                    <CardContent className="text-center text-xl">
                        {card.back}
                    </CardContent>
                </Card>
            </div>
        </div>

      <div className="flex w-full justify-center items-center space-x-4">
        <Button variant="outline" size="lg" onClick={handlePrev}>
          <ArrowLeft className="mr-2 h-5 w-5" /> Prev
        </Button>
        <Button variant="ghost" onClick={() => setIsFlipped(!isFlipped)}>
           <RefreshCw className="mr-2 h-4 w-4"/> Flip
        </Button>
        <Button variant="outline" size="lg" onClick={handleNext}>
          Next <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
