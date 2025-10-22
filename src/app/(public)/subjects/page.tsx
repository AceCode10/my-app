'use client';

import { SubjectsGrid } from '@/components/subjects-grid';

export default function SubjectsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-foreground">Our Subjects</h1>
            <p className="mt-4 text-lg text-muted-foreground">Select a subject to start exploring our resources.</p>
        </div>
        <SubjectsGrid basePath="/subjects" />
    </div>
  );
}
