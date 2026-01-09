'use client';

import { SubjectCard } from './subject-card';
import { Skeleton } from './ui/skeleton';
import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { memo } from 'react';

interface Subject {
  id: string;
  name: string;
  slug: string;
  code?: string;
  icon_url?: string;
  color?: string;
  exam_board?: string;
  exam_board_id?: string;
  level?: string;
  status?: string;
  display_order?: number;
  display_name?: string;
}

interface SubjectsGridProps {
    basePath?: string;
    pathSuffix?: string;
    showAll?: boolean;
    examBoard?: string;
    examBoardId?: string;
    level?: string;
    showAlphaFilter?: boolean;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const STORAGE_KEY = 'subjects-alpha-filter';
const supabase = createClient();

export const SubjectsGrid = memo(function SubjectsGrid({ 
  basePath = '/subjects', 
  pathSuffix = '', 
  showAll = false,
  examBoard,
  examBoardId,
  level,
  showAlphaFilter = true
}: SubjectsGridProps) {
  const [selectedLetter, setSelectedLetter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ALPHABET.includes(saved)) return saved;
    }
    return 'A';
  });
  
  const isStudentDashboard = basePath.includes('/student/');

  // Cached subjects query
  const { data: subjects = [], isLoading, error, refetch } = useQuery({
    queryKey: ['subjects-grid', examBoardId, level, showAll],
    queryFn: async () => {
      let query = supabase
        .from('subjects')
        .select('id, name, slug, code, icon_url, color, exam_board, exam_board_id, level, status, display_order, display_name')
        .order('display_order', { ascending: true });

      if (examBoardId) {
        query = query.or(`exam_board_id.eq.${examBoardId},exam_board_id.is.null`);
      }
      if (level) {
        query = query.or(`level.eq.${level},level.is.null`);
      }
      if (!showAll) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  // Cached user progress query (only for student dashboard)
  const { data: userProgress = new Map() } = useQuery({
    queryKey: ['user-progress', isStudentDashboard],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Map();

      const { data } = await supabase
        .from('user_subject_progress')
        .select('subject_id, progress_percentage')
        .eq('user_id', user.id);

      const progressMap = new Map<string, number>();
      data?.forEach((item: any) => {
        progressMap.set(item.subject_id, item.progress_percentage);
      });
      return progressMap;
    },
    enabled: isStudentDashboard,
    staleTime: 5 * 60 * 1000,
  });

  const handleLetterSelect = useCallback((letter: string) => {
    setSelectedLetter(letter);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, letter);
    }
  }, []);

  // Memoized filtered subjects to prevent recalculation
  const filteredSubjects = useMemo(() => {
    if (!showAlphaFilter || selectedLetter === 'All') {
      return subjects;
    }
    return subjects.filter(subject => {
      const displayName = subject.display_name || subject.name;
      return displayName.toUpperCase().startsWith(selectedLetter);
    });
  }, [subjects, selectedLetter, showAlphaFilter]);

  // Memoized available letters
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    subjects.forEach(subject => {
      const displayName = subject.display_name || subject.name;
      if (displayName && displayName.length > 0) {
        letters.add(displayName.toUpperCase()[0]);
      }
    });
    return letters;
  }, [subjects]);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-10">
          <p className="text-destructive mb-4">Error loading subjects: {(error as Error).message}</p>
          <button 
            onClick={() => refetch()}
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
        {/* Alphabetic Filter */}
        {showAlphaFilter && !isLoading && subjects.length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap justify-center gap-1 sm:gap-2 p-3 bg-card border rounded-xl">
              {ALPHABET.map((letter) => {
                const hasSubjects = availableLetters.has(letter);
                const isSelected = selectedLetter === letter;
                
                return (
                  <button
                    key={letter}
                    onClick={() => hasSubjects && handleLetterSelect(letter)}
                    disabled={!hasSubjects}
                    className={cn(
                      "w-8 h-8 sm:w-9 sm:h-9 rounded-lg font-semibold text-sm transition-all",
                      isSelected && hasSubjects
                        ? "bg-primary text-primary-foreground shadow-md"
                        : hasSubjects
                        ? "bg-muted hover:bg-primary/20 text-foreground"
                        : "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                    )}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-2">
              Showing {filteredSubjects.length} subject{filteredSubjects.length !== 1 ? 's' : ''} starting with "{selectedLetter}"
            </p>
          </div>
        )}

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
            ) : filteredSubjects.length === 0 ? (
                <div className="col-span-full text-center py-10">
                    <p className="text-muted-foreground">
                      {showAlphaFilter 
                        ? `No subjects starting with "${selectedLetter}".`
                        : showAll 
                        ? 'No subjects created yet.' 
                        : 'No published subjects available.'}
                    </p>
                </div>
            ) : (
                filteredSubjects.map((subject) => {
                    // Build path with optional query params for exam board and level
                    let path = `${basePath}/${subject.slug}${pathSuffix}`;
                    const params = new URLSearchParams();
                    if (examBoard) params.set('board', examBoard);
                    if (level) params.set('level', level);
                    if (params.toString()) path += `?${params.toString()}`;
                    
                    const progress = userProgress.get(subject.id) || 0;
                    
                    // Format subject name with syllabus code
                    const displayName = subject.display_name || subject.name;
                    const syllabusCode = subject.code || '';
                    
                    return (
                        <SubjectCard 
                            key={subject.id}
                            name={syllabusCode ? `${displayName} (${syllabusCode})` : displayName}
                            code={subject.exam_board || ''}
                            icon={subject.icon_url}
                            path={path}
                            color={subject.color || '#3b82f6'}
                            progress={progress}
                            showProgress={isStudentDashboard}
                        />
                    )
                })
            )}
        </div>
    </div>
  );
});
