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
  const supabase = createClient();
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
    fetchSubjects();
    fetchExamBoards();
    fetchPapers();
    fetchUserAttempts();
  }, []);

  async function fetchExamBoards() {
    const { data } = await supabase
      .from('exam_boards')
      .select('id, name, code')
      .order('name');
    
    setExamBoards(data || []);
  }

  async function fetchSubjects() {
    const { data } = await supabase
      .from('subjects')
      .select('id, name, slug, level')
      .eq('status', 'published')
      .order('name');
    
    setSubjects(data || []);
  }

  async function fetchPapers() {
    try {
      // Fetch published papers with subjects in a single query
      const { data: papersData, error } = await supabase
        .from('past_papers')
        .select(`
          *,
          subjects(id, name, slug)
        `)
        .eq('status', 'published')
        .order('year', { ascending: false })
        .order('session', { ascending: true });

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

  async function fetchUserAttempts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('assessment_attempts')
        .select('paper_id, status, score, percentage, submitted_at')
        .eq('user_id', user.id)
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Full Paper Practice
        </h1>
        <p className="text-muted-foreground mt-1">
          Full exam practice under timed conditions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search papers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

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
        </CardContent>
      </Card>

      {/* Papers Grid */}
      {filteredPapers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No papers available</h3>
              <p className="text-muted-foreground">
                {searchQuery || filterSubject !== 'all' || filterYear !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Check back later for practice papers'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPapers.map((paper) => (
            <Card 
              key={paper.id} 
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => router.push(`/student/papers/${paper.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                      {paper.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {paper.subject?.name || 'General'}
                    </CardDescription>
                  </div>
                  {getAttemptBadge(paper.id)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Paper Info */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      <Calendar className="h-3 w-3 mr-1" />
                      {paper.year}
                    </Badge>
                    {paper.session && (
                      <Badge variant="outline">{paper.session}</Badge>
                    )}
                    {paper.paper_number && (
                      <Badge variant="secondary">{paper.paper_number}</Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      <span>{paper.question_count} questions</span>
                    </div>
                    {paper.duration_minutes && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>{paper.duration_minutes} min</span>
                      </div>
                    )}
                    {paper.total_marks && (
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        <span>{paper.total_marks} marks</span>
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <Button className="w-full mt-2" variant="outline">
                    <Play className="h-4 w-4 mr-2" />
                    Start Practice
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
