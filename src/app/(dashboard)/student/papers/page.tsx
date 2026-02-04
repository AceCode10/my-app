'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  FileText,
  Clock,
  Play,
  History,
  Filter,
  ChevronRight,
  BookOpen,
  Target,
  Calendar
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PastPaper } from '@/types/paper-practice';

// Create supabase client outside component to prevent re-creation on every render
const supabase = createClient();

interface Subject {
  id: string;
  name: string;
  slug: string;
  level?: string;
}

interface ExamBoard {
  id: string;
  name: string;
  code: string;
}

const LEVELS = [
  { id: 'igcse', name: 'IGCSE' },
  { id: 'gcse', name: 'GCSE' },
  { id: 'as', name: 'AS Level' },
  { id: 'a2', name: 'A2 Level' },
  { id: 'alevel', name: 'A Level' },
  { id: 'ib_myp', name: 'IB MYP' },
  { id: 'ib_dp', name: 'IB DP' },
  { id: 'ap', name: 'AP' },
];

export default function StudentPapersPage() {
  const router = useRouter();

  const [papers, setPapers] = useState<(PastPaper & { question_count: number })[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [examBoards, setExamBoards] = useState<ExamBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterExamBoard, setFilterExamBoard] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [userAttempts, setUserAttempts] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    // Fetch all data in parallel for better performance
    async function loadAllData() {
      try {
        const [subjectsRes, examBoardsRes, userRes] = await Promise.all([
          supabase.from('subjects').select('id, name, slug, level').eq('status', 'published').order('name'),
          supabase.from('exam_boards').select('id, name, code').order('name'),
          supabase.auth.getUser()
        ]);
        
        setSubjects(subjectsRes.data || []);
        setExamBoards(examBoardsRes.data || []);
        
        // Fetch papers and user attempts in parallel (both depend on user for attempts)
        const papersPromise = fetchPapers();
        const attemptsPromise = userRes.data?.user ? fetchUserAttempts(userRes.data.user.id) : Promise.resolve();
        
        await Promise.all([papersPromise, attemptsPromise]);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    }
    
    loadAllData();
  }, []);

  async function fetchPapers() {
    try {
      // Fetch published papers with subjects in a single query - order ascending by year
      const { data: papersData, error } = await supabase
        .from('past_papers')
        .select(`
          *,
          subjects(id, name, slug)
        `)
        .eq('status', 'published')
        .order('year', { ascending: true })
        .order('session', { ascending: true })
        .order('paper_number', { ascending: true })
        .order('variant', { ascending: true });

      if (error) throw error;

      if (!papersData || papersData.length === 0) {
        setPapers([]);
        setLoading(false);
        return;
      }

      // Get question counts in a single query
      const paperIds = papersData.map(p => p.id);
      const { data: counts } = await supabase
        .from('paper_questions')
        .select('paper_id')
        .in('paper_id', paperIds);

      // Count questions per paper
      const questionCounts: Record<string, number> = {};
      (counts || []).forEach((q: any) => {
        questionCounts[q.paper_id] = (questionCounts[q.paper_id] || 0) + 1;
      });

      const papersWithCounts = papersData.map(p => ({
        ...p,
        question_count: questionCounts[p.id] || 0,
        subject: p.subjects
      }));

      // Only show papers that have questions
      setPapers(papersWithCounts.filter(p => p.question_count > 0));
    } catch (error) {
      console.error('Error fetching papers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUserAttempts(userId: string) {
    try {
      const { data } = await supabase
        .from('assessment_attempts')
        .select('paper_id, status, score, percentage, submitted_at')
        .eq('user_id', userId)
        .not('paper_id', 'is', null)
        .order('submitted_at', { ascending: false });

      const attemptsMap = new Map();
      (data || []).forEach((attempt: any) => {
        if (!attemptsMap.has(attempt.paper_id)) {
          attemptsMap.set(attempt.paper_id, attempt);
        }
      });

      setUserAttempts(attemptsMap);
    } catch (error) {
      console.error('Error fetching attempts:', error);
    }
  }

  // Filter subjects based on selected level - memoized for performance
  const filteredSubjects = useMemo(() => {
    return filterLevel === 'all' 
      ? subjects 
      : subjects.filter(s => s.level === filterLevel);
  }, [subjects, filterLevel]);

  // Memoized filtered papers for real-time search performance
  const filteredPapers = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return papers.filter(paper => {
      const matchesSearch = !searchQuery.trim() || 
        paper.title.toLowerCase().includes(searchLower) ||
        (paper.subject?.name || '').toLowerCase().includes(searchLower);
      const matchesSubject = filterSubject === 'all' || paper.subject_id === filterSubject;
      const matchesYear = filterYear === 'all' || paper.year.toString() === filterYear;
      const matchesExamBoard = filterExamBoard === 'all' || paper.exam_board_id === filterExamBoard;
      const matchesLevel = filterLevel === 'all' || paper.level === filterLevel || paper.subject?.level === filterLevel;
      
      return matchesSearch && matchesSubject && matchesYear && matchesExamBoard && matchesLevel;
    });
  }, [papers, searchQuery, filterSubject, filterYear, filterExamBoard, filterLevel]);

  // Memoized years for filter dropdown
  const years = useMemo(() => {
    return Array.from(new Set(papers.map(p => p.year))).sort((a, b) => b - a);
  }, [papers]);

  function getAttemptBadge(paperId: string) {
    const attempt = userAttempts.get(paperId);
    if (!attempt) return null;

    if (attempt.status === 'in_progress') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">In Progress</Badge>;
    }
    if (attempt.status === 'submitted' || attempt.status === 'graded') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          {attempt.percentage ? `${Math.round(attempt.percentage)}%` : 'Completed'}
        </Badge>
      );
    }
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          Full Paper Practice
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Full exam practice under timed conditions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 sm:pt-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search papers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Select value={filterExamBoard} onValueChange={setFilterExamBoard}>
                <SelectTrigger>
                  <SelectValue placeholder="All Boards" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Boards</SelectItem>
                  {examBoards.map(board => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterLevel} onValueChange={(value) => {
                setFilterLevel(value);
                // Reset subject filter when level changes if current subject doesn't match
                if (value !== 'all' && filterSubject !== 'all') {
                  const selectedSubject = subjects.find(s => s.id === filterSubject);
                  if (selectedSubject && selectedSubject.level !== value) {
                    setFilterSubject('all');
                  }
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {LEVELS.map(level => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {filteredSubjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Papers Grid */}
      {filteredPapers.length === 0 ? (
        <Card>
          <CardContent className="py-8 sm:py-12">
            <div className="text-center">
              <FileText className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No papers available</h3>
              <p className="text-muted-foreground text-sm">
                {searchQuery || filterSubject !== 'all' || filterYear !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Check back later for practice papers'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-card rounded-xl border divide-y overflow-hidden">
          {filteredPapers.map((paper) => (
            <div 
              key={paper.id} 
              className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => router.push(`/student/papers/${paper.id}`)}
            >
              {/* Year Badge */}
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-primary/10 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-primary">{paper.year}</span>
                <span className="text-[10px] text-muted-foreground uppercase">{paper.session?.substring(0, 3) || 'P'}{paper.paper_number}</span>
              </div>
              
              {/* Paper Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {/* Short title format: Subject P1 V12 Session Year */}
                    {paper.subject?.name || 'Paper'} P{paper.paper_number || '1'} V{paper.variant || '1'} {paper.session} {paper.year}
                  </h3>
                  {getAttemptBadge(paper.id)}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{paper.subject?.name}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {paper.duration_minutes || 90} min
                  </span>
                  <span>{paper.question_count || 0} Q</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  className="hidden sm:flex"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/student/papers/${paper.id}/practice`);
                  }}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Practice
                </Button>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {filteredPapers.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {filteredPapers.length} of {papers.length} papers
          </span>
          {(searchQuery || filterSubject !== 'all' || filterYear !== 'all' || filterExamBoard !== 'all' || filterLevel !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterSubject('all');
                setFilterYear('all');
                setFilterExamBoard('all');
                setFilterLevel('all');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
