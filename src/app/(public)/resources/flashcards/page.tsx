'use client';

import { SubjectsGrid } from '@/components/subjects-grid';

export default function FlashcardsPage() {
  return (
    <div className="py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-foreground">Flashcards</h1>
            <p className="mt-4 text-lg text-muted-foreground">First, select a subject to see available flashcard decks.</p>
        </div>
        <SubjectsGrid />
    </div>
  );
}
