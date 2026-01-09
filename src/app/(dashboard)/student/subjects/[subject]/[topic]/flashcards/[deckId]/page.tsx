'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Flashcard, FlashcardDeck } from '@/types';
import { FlashcardViewer } from '@/components/flashcard-viewer';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { allSubjects } from '@/lib/subjects';

export default function FlashcardDeckPage({ params }: { params: { subject: string; topic: string, deckId: string }}) {
  const { subject: subjectSlug, topic: topicSlug, deckId } = params;
  const supabase = createClient();

  const [deck, setDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const subjectData = allSubjects.find(s => s.slug === subjectSlug);
  const topicName = useMemo(() => topicSlug.replace(/-/g, ' '), [topicSlug]);

  useEffect(() => {
    async function fetchDeckAndCards() {
      // Fetch deck
      const { data: deckData, error: deckError } = await supabase
        .from('flashcard_decks')
        .select('*')
        .eq('id', deckId)
        .single();

      if (deckError) {
        console.error('Error fetching deck:', deckError);
        setIsLoading(false);
        return;
      }

      setDeck(deckData);

      // Fetch cards
      const { data: cardsData, error: cardsError } = await supabase
        .from('flashcards')
        .select('*')
        .eq('deck_id', deckId)
        .order('order', { ascending: true });

      if (cardsError) {
        console.error('Error fetching cards:', cardsError);
      } else {
        setCards(cardsData || []);
      }

      setIsLoading(false);
    }

    if (deckId) {
      fetchDeckAndCards();
    }
  }, [deckId]);

  if (!subjectData) {
    return <div>Subject not found.</div>;
  }

  return (
    <div>
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Link href="/student/subjects" className="hover:text-primary">Subjects</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/student/subjects/${subjectSlug}`} className="hover:text-primary">{subjectData.name}</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/student/subjects/${subjectSlug}/${topicSlug}`} className="hover:text-primary capitalize">{topicName}</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/student/subjects/${subjectSlug}/${topicSlug}/flashcards`} className="hover:text-primary">Flashcards</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground truncate">{isLoading ? '...' : deck?.title}</span>
      </div>

      <div className="mb-8 text-center">
        {isLoading ? (
          <div className="space-y-2 max-w-lg mx-auto">
            <Skeleton className="h-9 w-3/4 mx-auto" />
            <Skeleton className="h-5 w-1/2 mx-auto" />
          </div>
        ) : deck ? (
          <>
            <h1 className="text-4xl font-extrabold text-foreground">{deck.title}</h1>
            <p className="text-muted-foreground mt-2">{deck.description || `Flashcards for the topic of ${topicName}`}</p>
          </>
        ) : (
          <h1 className="text-4xl font-extrabold text-destructive">Deck not found</h1>
        )}
      </div>

      {isLoading ? (
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-80 w-full" />
          <div className="flex w-full justify-center items-center space-x-4">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-12 w-32" />
          </div>
        </div>
      ) : cards.length > 0 ? (
        <FlashcardViewer cards={cards} />
      ) : (
        <p className="text-center text-muted-foreground">No cards found in this deck.</p>
      )}
    </div>
  );
}
