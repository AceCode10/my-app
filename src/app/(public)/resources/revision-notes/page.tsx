'use client';

import { SubjectsGrid } from '@/components/subjects-grid';

export default function RevisionNotesPage() {
  return (
    <div className="py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-foreground">Revision Notes</h1>
            <p className="mt-4 text-lg text-muted-foreground">First, select a subject to see the available notes.</p>
        </div>
        <SubjectsGrid />
    </div>
  );
}
