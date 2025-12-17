'use client';

import { SubjectCard } from './subject-card';
import { Skeleton } from './ui/skeleton';
import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

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
}

interface SubjectsGridProps {
    basePath?: string;
    pathSuffix?: string;
    showAll?: boolean; // For admin view
    examBoard?: string; // Filter by exam board (name like 'cambridge')
    examBoardId?: string; // Filter by exam board UUID
    level?: string; // Filter by qualification level
    showAlphaFilter?: boolean; // Show alphabetic filter
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const STORAGE_KEY = 'subjects-alpha-filter';

export function SubjectsGrid({ 
  basePath = '/subjects', 
  pathSuffix = '', 
  showAll = false,
  examBoard,
  examBoardId,
  level,
  showAlphaFilter = true
}: SubjectsGridProps) {
  const supabase = createClient();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLetter, setSelectedLetter] = useState<string>('A');

  // Load saved letter from localStorage on mount
  useEffect(() => {
    if (showAlphaFilter && typeof window !== 'undefined') {
      const savedLetter = localStorage.getItem(STORAGE_KEY);
      if (savedLetter && ALPHABET.includes(savedLetter)) {
        setSelectedLetter(savedLetter);
      }
    }
  }, [showAlphaFilter]);

  // Save selected letter to localStorage
  const handleLetterSelect = (letter: string) => {
    setSelectedLetter(letter);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, letter);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [showAll, examBoard, examBoardId, level]);

  async function fetchSubjects() {
    try {
      setIsLoading(true);
      
      // Build query with optional filters
      // Use OR filter to include subjects with matching exam_board_id OR null (unassigned)
      let query = supabase
        .from('subjects')
        .select('*');

      // Filter by exam_board_id if provided - include both matching and unassigned subjects
      if (examBoardId) {
        query = query.or(`exam_board_id.eq.${examBoardId},exam_board_id.is.null`);
      }

      // Filter by level if provided - include both matching and unassigned subjects
      if (level) {
        query = query.or(`level.eq.${level},level.is.null`);
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

  // Filter subjects by selected letter
  const filteredSubjects = useMemo(() => {
    if (!showAlphaFilter || !selectedLetter) return subjects;
    return subjects.filter(s => 
      s.name.toUpperCase().startsWith(selectedLetter)
    );
  }, [subjects, selectedLetter, showAlphaFilter]);

  // Get letters that have subjects
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    subjects.forEach(s => {
      const firstLetter = s.name.charAt(0).toUpperCase();
      if (ALPHABET.includes(firstLetter)) {
        letters.add(firstLetter);
      }
    });
    return letters;
  }, [subjects]);

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
                    
                    return (
                        <SubjectCard 
                            key={subject.id}
                            name={subject.name}
                            code={subject.code || subject.exam_board || ''}
                            icon={subject.icon_url}
                            path={path}
                            color={subject.color || '#3b82f6'}
                        />
                    )
                })
            )}
        </div>
    </div>
  );
}
