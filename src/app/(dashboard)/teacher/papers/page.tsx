'use client';

import { useState, useMemo, Suspense, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/hooks/use-user';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Clock,
  Eye,
  ChevronRight,
  ArrowLeft,
  Calendar,
  BookOpen,
  Download,
} from 'lucide-react';

const supabase = createClient();

const SERIES_NAMES: Record<string, string> = {
  'fm': 'Feb/Mar',
  'mj': 'May/Jun',
  'on': 'Oct/Nov',
  'jan': 'January',
  'may': 'May',
  'jun': 'June',
  'am': 'Apr/May',
};

function formatDuration(minutes: number | null | undefined): string {
  const m = minutes || 90;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
  }
  return `${m} min`;
}

function TeacherPapersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const initialSubject = searchParams.get('subject');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialSubject);
  const [yearFilter, setYearFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');

  // Fetch teacher's subjects with paper counts
  const { data: userSubjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['teacher-subjects-with-papers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const [userSubsRes, papersRes] = await Promise.all([
        supabase.from('user_subjects')
          .select('subject_id, subjects(id, name, slug, code, icon_url, color, level, display_name)')
          .eq('user_id', user.id),
        supabase.from('past_papers')
          .select('subject_id')
          .eq('status', 'published'),
      ]);

      const paperCounts: Record<string, number> = {};
      (papersRes.data || []).forEach((p: any) => {
        paperCounts[p.subject_id] = (paperCounts[p.subject_id] || 0) + 1;
      });

      return (userSubsRes.data || [])
        .map((us: any) => {
          const s = Array.isArray(us.subjects) ? us.subjects[0] : us.subjects;
          if (!s) return null;
          return { ...s, paper_count: paperCounts[s.id] || 0 };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  const selectedSubject = userSubjects.find((s: any) => s.slug === selectedSlug);

  // Papers for selected subject
  const { data: papersData, isLoading: loadingPapers } = useQuery({
    queryKey: ['teacher-subject-papers', selectedSubject?.id],
    queryFn: async () => {
      if (!selectedSubject?.id) return { papers: [], questionCounts: {} };

      const { data: papers } = await supabase
        .from('past_papers')
        .select('id, title, paper_number, variant, session, year, duration_minutes, total_marks, question_paper_url, paper_url, mark_scheme_url, subjects(id, name, slug, code)')
        .eq('subject_id', selectedSubject.id)
        .eq('status', 'published')
        .order('year', { ascending: false })
        .order('session')
        .order('paper_number')
        .order('variant');

      if (!papers?.length) return { papers: [], questionCounts: {} };

      const paperIds = papers.map((p: any) => p.id);
      const { data: counts } = await supabase
        .from('paper_questions').select('paper_id').in('paper_id', paperIds);

      const questionCounts: Record<string, number> = {};
      (counts || []).forEach((q: any) => {
        questionCounts[q.paper_id] = (questionCounts[q.paper_id] || 0) + 1;
      });

      return {
        papers: papers.filter((p: any) => questionCounts[p.id] > 0),
        questionCounts,
      };
    },
    enabled: !!selectedSubject?.id,
    staleTime: 5 * 60 * 1000,
  });

  const papers = papersData?.papers || [];
  const questionCounts = papersData?.questionCounts || {};

  const filteredPapers = useMemo(() => {
    return papers.filter((p: any) => {
      if (yearFilter !== 'all' && p.year.toString() !== yearFilter) return false;
      if (sessionFilter !== 'all' && p.session !== sessionFilter) return false;
      return true;
    });
  }, [papers, yearFilter, sessionFilter]);

  const groupedPapers = useMemo(() => {
    const groups: Record<string, { year: number; session: string; sessionCode: string; papers: any[] }> = {};
    filteredPapers.forEach((paper: any) => {
      const sc = paper.session || 'Unknown';
      const key = `${paper.year}-${sc}`;
      if (!groups[key]) {
        groups[key] = { year: paper.year, session: SERIES_NAMES[sc] || sc, sessionCode: sc, papers: [] };
      }
      groups[key].papers.push(paper);
    });

    return Object.values(groups)
      .sort((a, b) => b.year !== a.year ? b.year - a.year : a.session.localeCompare(b.session))
      .map(g => ({
        ...g,
        papers: g.papers.sort((a, b) => {
          const aNum = parseInt(a.paper_number || '0') || 0;
          const bNum = parseInt(b.paper_number || '0') || 0;
          if (aNum !== bNum) return aNum - bNum;
          return (parseInt(a.variant || '0') || 0) - (parseInt(b.variant || '0') || 0);
        }),
      }));
  }, [filteredPapers]);

  const years = useMemo(() =>
    [...new Set(papers.map((p: any) => p.year))].sort((a: number, b: number) => b - a),
  [papers]);

  const sessions = useMemo(() =>
    [...new Set(papers.map((p: any) => p.session).filter(Boolean))],
  [papers]);

  const selectSubject = useCallback((slug: string) => {
    setSelectedSlug(slug);
    setYearFilter('all');
    setSessionFilter('all');
    window.history.replaceState(null, '', `/teacher/papers?subject=${slug}`);
  }, []);

  const goBack = useCallback(() => {
    setSelectedSlug(null);
    window.history.replaceState(null, '', '/teacher/papers');
  }, []);

  if (loadingSubjects) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  // PHASE 2: Subject selected → show papers
  if (selectedSubject) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <button onClick={goBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> All Subjects
          </button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{selectedSubject.name}</span>
          {selectedSubject.code && <Badge variant="secondary" className="text-xs">{selectedSubject.code}</Badge>}
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            {selectedSubject.name} Past Papers
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {papers.length} paper{papers.length !== 1 ? 's' : ''} available — view questions, mark schemes, and grade yourself
          </p>
        </div>

        {papers.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-32"><SelectValue placeholder="All Years" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((y: any) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All Sessions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {sessions.map((s: any) => <SelectItem key={s} value={s}>{SERIES_NAMES[s] || s}</SelectItem>)}
              </SelectContent>
            </Select>
            {(yearFilter !== 'all' || sessionFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setYearFilter('all'); setSessionFilter('all'); }}>
                Clear filters
              </Button>
            )}
          </div>
        )}

        {loadingPapers ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : groupedPapers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No papers available</h3>
              <p className="text-muted-foreground text-sm">
                {papers.length === 0 ? 'Papers for this subject are being added.' : 'Try adjusting your filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {groupedPapers.map(({ year, session, sessionCode, papers: groupPapers }) => (
              <div key={`${year}-${sessionCode}`}>
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-bold text-foreground">{year} — {session}</h2>
                  <Badge variant="secondary">{groupPapers.length} paper{groupPapers.length !== 1 ? 's' : ''}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupPapers.map((paper: any) => {
                    const qCount = questionCounts[paper.id] || 0;
                    const subjectCode = paper.subjects?.code || selectedSubject?.code || '0000';
                    let pNum = paper.paper_number || '1';
                    if (pNum.toLowerCase().startsWith('paper ')) pNum = pNum.substring(6).trim();
                    return (
                      <div key={paper.id} className="bg-card border rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-foreground">
                              Paper {pNum} ({subjectCode}/{paper.variant || '1'})
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDuration(paper.duration_minutes)}
                              </Badge>
                              {paper.total_marks && (
                                <Badge variant="outline" className="text-xs">{paper.total_marks} marks</Badge>
                              )}
                              <Badge variant="outline" className="text-xs">{qCount} Q</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 pt-1">
                          <Link
                            href={`/teacher/papers/${paper.id}`}
                            className="flex justify-between items-center bg-primary text-primary-foreground p-3 rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              <span className="text-sm font-medium">View Paper</span>
                            </div>
                            <ChevronRight className="w-4 h-4" />
                          </Link>

                          {(paper.question_paper_url || paper.paper_url) && (
                            <a href={paper.question_paper_url || paper.paper_url} target="_blank" rel="noopener noreferrer"
                              className="flex justify-between items-center bg-muted/50 p-3 rounded-lg hover:bg-muted transition-colors">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-foreground">Question Paper</span>
                              </div>
                              <Download className="w-4 h-4 text-muted-foreground" />
                            </a>
                          )}

                          {paper.mark_scheme_url && (
                            <a href={paper.mark_scheme_url} target="_blank" rel="noopener noreferrer"
                              className="flex justify-between items-center bg-muted/50 p-3 rounded-lg hover:bg-muted transition-colors">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-medium text-foreground">Mark Scheme</span>
                              </div>
                              <Download className="w-4 h-4 text-muted-foreground" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // PHASE 1: Show teacher's subjects
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          Past Papers
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Browse past papers, view mark schemes, and self-grade
        </p>
      </div>

      {userSubjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {userSubjects.map((subject: any) => (
            <button
              key={subject.id}
              onClick={() => selectSubject(subject.slug)}
              className="text-left p-5 rounded-xl border bg-card hover:bg-muted/50 hover:border-primary/30 hover:shadow-lg transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-base"
                  style={{ backgroundColor: subject.color || '#3b82f6' }}>
                  {subject.code ? subject.code.substring(0, 2) : subject.name.charAt(0)}
                </div>
                {subject.paper_count > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {subject.paper_count} paper{subject.paper_count !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-base line-clamp-2">
                {subject.display_name || subject.name}
              </h3>
              {subject.code && <p className="text-xs text-muted-foreground mt-1">{subject.code}</p>}
              <div className="mt-3 flex items-center text-sm text-primary font-medium">
                View Papers
                <ChevronRight className="h-4 w-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No subjects added yet</h3>
            <p className="text-muted-foreground text-sm mb-4">Add subjects to see past papers.</p>
            <Button asChild>
              <Link href="/teacher/subjects">Go to Subjects</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function TeacherPapersPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    }>
      <TeacherPapersContent />
    </Suspense>
  );
}
