
'use client';

import { SubjectsGrid } from '@/components/subjects-grid';

export default function QuizzesPage() {
  return (
    <div className="py-4">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-foreground">Quizzes</h1>
            <p className="mt-4 text-lg text-muted-foreground">First, select a subject to find a quiz.</p>
        </div>
        <SubjectsGrid basePath="/subjects" pathSuffix="/quizzes" />
    </div>
  );
}

    