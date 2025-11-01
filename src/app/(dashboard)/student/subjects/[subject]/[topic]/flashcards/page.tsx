
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { FlashcardDeck } from '@/types';
import Link from 'next/link';
import { ChevronRight, Layers } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { allSubjects as localSubjects } from '@/lib/subjects.tsx';

export default function FlashcardsDeckListPage({ params }: { params: { subject: string; topic: string }}) {
  const { subject: subjectSlug, topic: topicSlug } = params;
  const firestore = useFirestore();
  const pathname = usePathname();

  const [subjects, setSubjects] = useState(localSubjects);

  const subjectData = subjects.find(s => s.slug === subjectSlug);
  const topicName = useMemo(() => topicSlug.replace(/-/g, ' '), [topicSlug]);

  const decksQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'flashcardDecks'),
        where('subject', '==', subjectSlug),
        where('topic', '==', topicSlug),
    );
  }, [firestore, subjectSlug, topicSlug]);

  const { data: decks, isLoading } = useCollection<FlashcardDeck>(decksQuery);

  if (!subjectData) {
    return <div>Subject not found.</div>;
  }

  return (
    <div>
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Link href="/dashboard/subjects" className="hover:text-primary">Subjects</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/dashboard/subjects/${subjectSlug}`} className="hover:text-primary">{subjectData.name}</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/dashboard/subjects/${subjectSlug}/${topicSlug}`} className="hover:text-primary capitalize">{topicName}</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground">Flashcard Decks</span>
      </div>
      
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            <aside className="lg:col-span-1 bg-card p-4 rounded-2xl shadow-sm border sticky top-24">
                <h3 className="font-bold text-lg text-foreground px-2 mb-2">{subjectData.name} Topics</h3>
                <nav className="flex flex-col space-y-1">
                    {subjectData.topics?.map(t => {
                        const currentTopicSlug = t.name.toLowerCase().replace(/ /g, '-');
                        const href = `/dashboard/subjects/${subjectSlug}/${currentTopicSlug}/flashcards`;
                        const isActive = pathname === href;
                        return (
                            <Link href={href} key={t.name}>
                                <div className={cn(
                                    "p-2 rounded-md text-sm font-medium transition-colors",
                                    isActive 
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}>
                                    {t.name}
                                </div>
                            </Link>
                        )
                    })}
                </nav>
            </aside>
            <main className="lg:col-span-3">
                 <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-foreground capitalize">Flashcard Decks for {topicName}</h1>
                    <p className="text-muted-foreground mt-2">Select a deck to start practicing.</p>
                </div>
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full" />)}
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
                                        <CardDescription>{deck.description || 'A set of flashcards for this topic.'}</CardDescription>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 border-2 border-dashed rounded-lg bg-card">
                        <h3 className="text-lg font-semibold text-foreground">No Decks Found</h3>
                        <p className="text-muted-foreground mt-2">There are no flashcard decks for this topic yet. Check back later!</p>
                    </div>
                )}
            </main>
        </div>
    </div>
  );
}
