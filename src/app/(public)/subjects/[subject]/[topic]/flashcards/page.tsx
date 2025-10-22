'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { FlashcardDeck } from '@/types';
import Link from 'next/link';
import { ChevronRight, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { allSubjects } from '@/lib/subjects';

export default function PublicFlashcardsDeckListPage({ params }: { params: { subject: string; topic: string }}) {
  const { subject: subjectSlug, topic: topicSlug } = params;
  const firestore = useFirestore(true);
  const pathname = usePathname();

  const subjectData = allSubjects.find(s => s.slug === subjectSlug);
  const topicName = useMemo(() => topicSlug.replace(/-/g, ' '), [topicSlug]);

  const decksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Assuming flashcard decks have subject and topic slugs stored for querying
    return query(
        collection(firestore, 'flashcardDecks'),
        where('subject', '==', subjectSlug),
        where('topic', '==', topicSlug)
    );
  }, [firestore, subjectSlug, topicSlug]);

  const { data: decks, isLoading } = useCollection<FlashcardDeck>(decksQuery);

  if (!subjectData) {
    return <div>Subject not found.</div>;
  }
  
  const topicData = subjectData.topics?.find(t => t.name.toLowerCase().replace(/ /g, '-') === topicSlug);

  return (
    <div>
      <div className="flex items-center text-sm text-muted-foreground mb-6">
        <Link href="/resources" className="hover:text-primary">Resources</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/subjects/${subjectSlug}`} className="hover:text-primary">{subjectData.name}</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/subjects/${subjectSlug}/${topicSlug}`} className="hover:text-primary capitalize">{topicName}</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground">Flashcard Decks</span>
      </div>

       <div className="mb-8 text-center">
          <h1 className="text-4xl font-extrabold text-foreground capitalize">Flashcard Decks for {topicName}</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">{topicData?.description}</p>
      </div>

       {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
      ) : decks && decks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {decks.map(deck => (
                  <Link key={deck.id} href={`/dashboard/subjects/${subjectSlug}/${topicSlug}/flashcards/${deck.id}`}>
                      <Card className="hover:border-primary transition-colors h-full">
                          <CardHeader>
                              <CardTitle className="flex items-start gap-3"><Layers className="h-6 w-6 text-primary mt-1 flex-shrink-0" />{deck.title}</CardTitle>
                          </CardHeader>
                          <CardContent>
                              <CardDescription>{deck.description || 'A set of flashcards to help you master this topic.'}</CardDescription>
                          </CardContent>
                      </Card>
                  </Link>
              ))}
          </div>
      ) : (
          <div className="text-center py-20 border-2 border-dashed rounded-lg bg-card">
              <h3 className="text-lg font-semibold text-foreground">No Decks Found</h3>
              <p className="text-muted-foreground mt-2">There are no public flashcard decks for this topic yet.</p>
          </div>
      )}
    </div>
  );
}
