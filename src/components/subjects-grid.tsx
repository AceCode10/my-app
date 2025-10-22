'use client';

import { SubjectCard } from './subject-card';
import { type Subject, allSubjects as localSubjects } from '@/lib/subjects.tsx';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { useEffect, useState, useMemo } from 'react';

interface SubjectsGridProps {
    basePath?: string;
    pathSuffix?: string;
}

export function SubjectsGrid({ basePath = '/subjects', pathSuffix = '' }: SubjectsGridProps) {
  const [subjectsWithIcons, setSubjectsWithIcons] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // This is a temporary solution to handle the fact that subjects are loaded from JSON
  // but we want to simulate a loading state. In a real app with Firestore as SoT,
  // the useCollection hook would handle this naturally.
  useEffect(() => {
    setTimeout(() => {
        setSubjectsWithIcons(localSubjects);
        setIsLoading(false);
    }, 500); // simulate network delay
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {isLoading ? (
                Array.from({length: 10}).map((_, i) => (
                    <div key={i} className="space-y-3">
                       <div className="bg-background p-6 rounded-2xl shadow-sm border flex flex-col text-left h-full">
                           <div className="flex-grow">
                               <Skeleton className="mb-4 w-14 h-14 rounded-lg" />
                               <Skeleton className="h-5 w-4/5 mb-2" />
                               <Skeleton className="h-4 w-3/5" />
                           </div>
                            <Skeleton className="h-10 w-full mt-4" />
                       </div>
                    </div>
                ))
            ) : (
                subjectsWithIcons.map((subject) => {
                    return (
                        <SubjectCard 
                            key={subject.slug}
                            name={subject.name}
                            code={subject.code}
                            icon={subject.icon}
                            path={`${basePath}/${subject.slug}${pathSuffix}`}
                            color={subject.color}
                        />
                    )
                })
            )}
             {!isLoading && subjectsWithIcons.length === 0 && (
                <div className="col-span-full text-center py-10">
                    <p className="text-muted-foreground">No subjects found.</p>
                </div>
            )}
        </div>
    </div>
  );
}
