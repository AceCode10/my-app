'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, CheckCircle, Building2, GraduationCap } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getIconComponent } from '@/lib/icon-mapper';
import { EXAM_BOARDS, getLevelsForBoard, getExamBoardById, getLevelById } from '@/lib/exam-boards';
import { Badge } from '@/components/ui/badge';

const supabase = createClient();
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

interface DbSubject {
  id: string;
  name: string;
  slug: string;
  code: string;
  icon_url?: string;
  color?: string;
  display_name?: string;
  exam_board_id?: string;
  level?: string;
}

export default function AddSubjectsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBoard, setSelectedBoard] = useState<string>('cambridge');
  const [selectedLevel, setSelectedLevel] = useState<string>('igcse');
  const [selectedLetter, setSelectedLetter] = useState<string>('all');

  // Fetch exam boards from database
  const { data: dbExamBoards = [] } = useQuery({
    queryKey: ['exam-boards'],
    queryFn: async () => {
      const { data } = await supabase
        .from('exam_boards')
        .select('id, code, name, color, is_active, display_order')
        .eq('is_active', true)
        .order('display_order');
      return data || [];
    },
    staleTime: 30 * 60 * 1000,
  });

  // Compute selectedBoardId from cached data
  const selectedBoardId = useMemo(() => {
    const codeMap: Record<string, string> = {
      'cambridge': 'CIE',
      'ib': 'IB',
      'edexcel': 'EDEX',
      'ocr': 'OCR',
      'aqa': 'AQA',
      'ap': 'AP'
    };
    const dbCode = codeMap[selectedBoard] || selectedBoard.toUpperCase();
    const board = dbExamBoards.find((b: any) => b.code === dbCode);
    return board?.id || '';
  }, [selectedBoard, dbExamBoards]);

  // Get available levels for the selected board
  const availableLevels = useMemo(() => {
    return getLevelsForBoard(selectedBoard);
  }, [selectedBoard]);

  // Reset level if current selection is not available for the new board
  useEffect(() => {
    const levelAvailable = availableLevels.some(l => l.id === selectedLevel);
    if (!levelAvailable && availableLevels.length > 0) {
      setSelectedLevel(availableLevels[0].id);
    }
  }, [selectedBoard, availableLevels, selectedLevel]);

  const selectedBoardData = getExamBoardById(selectedBoard);
  const selectedLevelData = getLevelById(selectedLevel);

  // Fetch available subjects - use EXACT same query as SubjectsGrid for consistency
  const { data: availableSubjects = [], isLoading: isFetching } = useQuery({
    queryKey: ['subjects-grid', selectedBoardId, selectedLevel, false],
    queryFn: async () => {
      let query = supabase
        .from('subjects')
        .select('id, name, slug, code, icon_url, color, display_name, exam_board_id, level, status, display_order')
        .order('display_order', { ascending: true });
      
      // Use EXACT same filtering as SubjectsGrid
      if (selectedBoardId) {
        query = query.or(`exam_board_id.eq.${selectedBoardId},exam_board_id.is.null`);
      }
      if (selectedLevel) {
        query = query.or(`level.eq.${selectedLevel},level.is.null`);
      }
      query = query.eq('status', 'published');
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch user's selected subjects
  const { data: userSubjects } = useQuery({
    queryKey: ['user-subjects', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('user_subjects')
        .select('subject_id')
        .eq('user_id', user.id);
      if (error) throw error;
      
      const selectedIds = (data || []).map((us: any) => us.subject_id);
      setSelectedSubjectIds(selectedIds);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Filter subjects based on search and alphabetic filter (board/level already filtered at DB level)
  const filteredSubjects = useMemo(() => {
    return availableSubjects.filter(subject => {
      // Search filter
      if (searchQuery.trim()) {
        const search = searchQuery.toLowerCase();
        const matchesSearch = 
          subject.name.toLowerCase().includes(search) ||
          subject.code.toLowerCase().includes(search) ||
          (subject.display_name?.toLowerCase().includes(search));
        if (!matchesSearch) return false;
      }
      
      // Alphabetic filter
      if (selectedLetter !== 'all') {
        const displayName = subject.display_name || subject.name;
        if (!displayName.toUpperCase().startsWith(selectedLetter)) {
          return false;
        }
      }
      
      return true;
    });
  }, [availableSubjects, searchQuery, selectedLetter]);

  // Mutation for saving subjects
  const saveMutation = useMutation({
    mutationFn: async (subjectIds: string[]) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get current subjects
      const { data: currentSubjects } = await supabase
        .from('user_subjects')
        .select('subject_id')
        .eq('user_id', user.id);

      const currentIds = (currentSubjects || []).map((s: any) => s.subject_id);
      const toAdd = subjectIds.filter(id => !currentIds.includes(id));
      const toRemove = currentIds.filter(id => !subjectIds.includes(id));

      // Execute deletions and insertions in parallel
      const operations = [];
      
      if (toRemove.length > 0) {
        operations.push(
          supabase
            .from('user_subjects')
            .delete()
            .eq('user_id', user.id)
            .in('subject_id', toRemove)
        );
      }

      if (toAdd.length > 0) {
        operations.push(
          supabase
            .from('user_subjects')
            .insert(toAdd.map(subject_id => ({ user_id: user.id, subject_id })))
        );
      }

      if (operations.length > 0) {
        const results = await Promise.all(operations);
        const errors = results.filter(r => r.error);
        if (errors.length > 0) throw errors[0].error;
      }

      return subjectIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subjects'] });
      toast({ title: 'Success!', description: 'Your subjects have been saved.' });
      router.push('/teacher/subjects');
    },
    onError: (error: any) => {
      console.error('Error saving subjects:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: error.message || 'Could not save subjects. Please try again.' 
      });
    },
  });

  const handleCheckboxChange = (subjectId: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSaveChanges = () => {
    saveMutation.mutate(selectedSubjectIds);
  };

  return (
    <div>
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/teacher/subjects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Subjects
          </Link>
        </Button>
        <h2 className="text-3xl font-bold text-foreground">Manage My Subjects</h2>
        <p className="text-muted-foreground mt-1">Select the subjects you teach to see them on your dashboard.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Available Subjects</span>
            {selectedSubjectIds.length > 0 && (
              <span className="text-sm font-normal text-primary flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                {selectedSubjectIds.length} selected
              </span>
            )}
          </CardTitle>
          
          {/* Search bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        
        {/* Exam Board & Level Selection - Same style as topical-questions */}
        <div className="px-6 pb-4">
          <div className="bg-muted/30 border rounded-xl p-6 space-y-6">
            {/* Exam Board Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Exam Board</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {EXAM_BOARDS.map((board) => (
                  <Button
                    key={board.id}
                    variant={selectedBoard === board.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedBoard(board.id)}
                    className={cn(
                      "transition-all",
                      selectedBoard === board.id && "ring-2 ring-offset-2 ring-primary"
                    )}
                  >
                    <span className={cn("w-2 h-2 rounded-full mr-2", board.color)} />
                    {board.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Level Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Qualification Level</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {availableLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevel(level.id)}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      selectedLevel === level.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="font-semibold text-foreground">{level.name}</div>
                    <div className="text-xs text-muted-foreground">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Current Selection Display */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Showing:</span>
              <Badge variant="secondary" className="font-medium">
                {selectedBoardData?.name}
              </Badge>
              <span className="text-muted-foreground">•</span>
              <Badge variant="secondary" className="font-medium">
                {selectedLevelData?.name}
              </Badge>
              <span className="text-muted-foreground">•</span>
              <Badge variant="outline" className="font-medium">
                {filteredSubjects.length} subjects
              </Badge>
            </div>
          </div>
        </div>

        {/* Alphabet Filter */}
        <div className="px-6 pb-4">
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-foreground">Select a Subject</h2>
            <p className="text-muted-foreground text-sm mt-1">Choose subjects to add to your teaching dashboard</p>
          </div>
          <div className="flex flex-wrap gap-1 justify-center">
            <button
              onClick={() => setSelectedLetter('all')}
              className={cn(
                "px-3 py-1.5 text-sm rounded font-medium transition-colors",
                selectedLetter === 'all'
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              )}
            >
              All
            </button>
            {ALPHABET.map((letter) => {
              const hasSubjects = availableSubjects.some(s => {
                const displayName = s.display_name || s.name;
                return displayName.toUpperCase().startsWith(letter);
              });
              const isSelected = selectedLetter === letter;
              
              return (
                <button
                  key={letter}
                  onClick={() => hasSubjects && setSelectedLetter(letter)}
                  disabled={!hasSubjects}
                  className={cn(
                    "w-9 h-9 text-sm rounded font-medium transition-colors",
                    isSelected && hasSubjects
                      ? "bg-primary text-primary-foreground"
                      : hasSubjects
                      ? "bg-muted hover:bg-muted/80 text-foreground"
                      : "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                  )}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        </div>
        <CardContent>
          {isFetching ? (
            <div className="text-center py-8 text-muted-foreground">Loading subjects...</div>
          ) : filteredSubjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? `No subjects found matching "${searchQuery}"` : 'No subjects available'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredSubjects.map(subject => {
                const IconComponent = getIconComponent(subject.icon_url);
                return (
                  <Label
                    key={subject.id}
                    htmlFor={subject.id}
                    className={cn(
                      "flex items-center p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer",
                      selectedSubjectIds.includes(subject.id) && "border-primary bg-primary/5"
                    )}
                  >
                    <Checkbox
                      id={subject.id}
                      checked={selectedSubjectIds.includes(subject.id)}
                      onCheckedChange={() => handleCheckboxChange(subject.id)}
                      className="mr-4 h-5 w-5"
                    />
                    <div className="flex items-center space-x-3">
                      <div 
                        className="p-2 rounded-lg text-white flex items-center justify-center w-10 h-10"
                        style={{ backgroundColor: subject.color || '#3b82f6' }}
                      >
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="font-semibold text-foreground block">{subject.name}</span>
                        <span className="text-xs text-muted-foreground">{subject.code}</span>
                      </div>
                    </div>
                  </Label>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-end gap-4">
        <Button variant="outline" asChild>
          <Link href="/teacher/subjects">Cancel</Link>
        </Button>
        <Button onClick={handleSaveChanges} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
