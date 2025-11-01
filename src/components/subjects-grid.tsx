'use client';

import { SubjectCard } from './subject-card';
import { Skeleton } from './ui/skeleton';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Subject {
  id: string;
  name: string;
  slug: string;
  code?: string;
  icon_url?: string;
  color?: string;
  exam_board: string;
  status: string;
  display_order: number;
}

interface SubjectsGridProps {
    basePath?: string;
    pathSuffix?: string;
    showAll?: boolean; // For admin view
}

export function SubjectsGrid({ basePath = '/subjects', pathSuffix = '', showAll = false }: SubjectsGridProps) {
  const supabase = createClient();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjects();
  }, [showAll]);

  async function fetchSubjects() {
    try {
      setIsLoading(true);
      let query = supabase
        .from('subjects')
        .select('*')
        .order('display_order', { ascending: true });

      // Only show published subjects for public view
      if (!showAll) {
        query = query.eq('status', 'published');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching subjects:', fetchError);
        throw fetchError;
      }

      console.log('Subjects loaded:', data?.length || 0);
      setSubjects(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load subjects:', err);
      setError(err.message || 'Failed to load subjects');
    } finally {
      setIsLoading(false);
    }
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-10">
          <p className="text-destructive mb-4">Error loading subjects: {error}</p>
          <button 
            onClick={fetchSubjects}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
            ) : subjects.length === 0 ? (
                <div className="col-span-full text-center py-10">
                    <p className="text-muted-foreground">
                      {showAll ? 'No subjects created yet.' : 'No published subjects available.'}
                    </p>
                </div>
            ) : (
                subjects.map((subject) => {
                    return (
                        <SubjectCard 
                            key={subject.id}
                            name={subject.name}
                            code={subject.code || subject.exam_board}
                            icon={subject.icon_url}
                            path={`${basePath}/${subject.slug}${pathSuffix}`}
                            color={subject.color || '#3b82f6'}
                        />
                    )
                })
            )}
        </div>
    </div>
  );
}
