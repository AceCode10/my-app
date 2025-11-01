
'use client';

import { SubjectCard } from '@/components/subject-card';
import { allSubjects } from '@/lib/subjects';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function SubjectsPage() {
    // For this page, we can show all subjects available, not just the ones the user has added.
    // This makes it a discovery page.
    const isLoading = false; // We are using local data for now

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-foreground">All Subjects</h2>
                <Button asChild>
                    <Link href="/student/subjects/add">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Manage My Subjects
                    </Link>
                </Button>
            </div>
            <p className="text-muted-foreground mb-8">Select a subject to view its learning resources.</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {isLoading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="space-y-3">
                           <Skeleton className="h-[125px] w-full rounded-xl" />
                           <div className="space-y-2">
                             <Skeleton className="h-4 w-4/5" />
                             <Skeleton className="h-4 w-3/5" />
                           </div>
                           <Skeleton className="h-10 w-full" />
                        </div>
                    ))
                ) : (
                    allSubjects.map((subject) => {
                        return (
                            <SubjectCard 
                                key={subject.slug}
                                name={subject.name}
                                code={subject.code}
                                icon={subject.icon}
                                path={`/student/subjects/${subject.slug}`}
                                color={subject.color}
                            />
                        )
                    })
                )}
            </div>
        </div>
    );
}
