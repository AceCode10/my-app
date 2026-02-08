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
import { SubjectCard } from '@/components/subject-card';
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
  Play,
  ChevronRight,
  ArrowLeft,
  Calendar,
  BookOpen,
  Download,
  Plus,
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

function StudentPapersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();

  const initialSubject = searchParams.get('subject');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialSubject);

  // Filters for paper listing
  const [yearFilter, setYearFilter] = useState('all');
  const [sessionFilter, setSessionFilter] = useState('all');

  // ── DATA FETCHING ──

  // 1. User's added subjects with paper counts
  const { data: userSubjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['user-subjects-with-papers', user?.id],
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

  // Find selected subject object
  const selectedSubject = userSubjects.find((s: any) => s.slug === selectedSlug);

  // 2. Papers for selected subject (only fetched when subject is selected)
  const { data: papersData, isLoading: loadingPapers } = useQuery({
    queryKey: ['subject-papers', selectedSubject?.id, user?.id],
    queryFn: async () => {
      if (!selectedSubject?.id) return { papers: [], questionCounts: {}, attempts: {} };

      const { data: papers } = await supabase
        .from('past_papers')
        .select('id, title, paper_number, variant, session, year, duration_minutes, total_marks, question_paper_url, paper_url, mark_scheme_url, subjects(id, name, slug, code)')
        .eq('subject_id', selectedSubject.id)
        .eq('status', 'published')
        .order('year', { ascending: false })
        .order('session')
        .order('paper_number')
        .order('variant');

      if (!papers?.length) return { papers: [], questionCounts: {}, attempts: {} };

      const paperIds = papers.map((p: any) => p.id);
      const [countsRes, attemptsRes] = await Promise.all([
        supabase.from('paper_questions').select('paper_id').in('paper_id', paperIds),
        user?.id
          ? supabase.from('assessment_attempts')
              .select('paper_id, status, percentage, submitted_at')
              .eq('user_id', user.id)
              .not('paper_id', 'is', null)
              .in('paper_id', paperIds)
              .order('submitted_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);

      const questionCounts: Record<string, number> = {};
      (countsRes.data || []).forEach((q: any) => {
        questionCounts[q.paper_id] = (questionCounts[q.paper_id] || 0) + 1;
      });

      const attempts: Record<string, any> = {};
      ((attemptsRes as any).data || []).forEach((a: any) => {
        if (!attempts[a.paper_id]) attempts[a.paper_id] = a;
      });

      return {
        papers: papers.filter((p: any) => questionCounts[p.id] > 0),
        questionCounts,
        attempts,
      };
    },
    enabled: !!selectedSubject?.id,
    staleTime: 2 * 60 * 1000,
  });

  // ── COMPUTED VALUES ──

  const papers = papersData?.papers || [];
  const questionCounts = papersData?.questionCounts || {};
  const attempts = papersData?.attempts || {};

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

  // ── HANDLERS ──

  const selectSubject = useCallback((slug: string) => {
    setSelectedSlug(slug);
    setYearFilter('all');
    setSessionFilter('all');
    window.history.replaceState(null, '', `/student/papers?subject=${slug}`);
  }, []);

  const goBack = useCallback(() => {
    setSelectedSlug(null);
    window.history.replaceState(null, '', '/student/papers');
  }, []);

  const getAttemptBadge = (paperId: string) => {
    const attempt = attempts[paperId];
    if (!attempt) return null;
    if (attempt.status === 'in_progress') {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs">In Progress</Badge>;
    }
    if (attempt.status === 'submitted' || attempt.status === 'graded') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
          {attempt.percentage ? `${Math.round(attempt.percentage)}%` : 'Completed'}
        </Badge>
      );
    }
    return null;
  };

  // ── LOADING ──

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

  // ══════════════════════════════════════
  // PHASE 2: Subject selected → show papers as cards
  // ══════════════════════════════════════
  if (selectedSubject) {
    return (
      <div className="space-y-5">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            All Subjects
          </button>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{selectedSubject.name}</span>
          {selectedSubject.code && (
            <Badge variant="secondary" className="text-xs">{selectedSubject.code}</Badge>
          )}
        </div>

        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            {selectedSubject.name} Past Papers
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {papers.length} paper{papers.length !== 1 ? 's' : ''} available for practice
          </p>
        </div>

        {/* Filters */}
        {papers.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map((y: any) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {sessions.map((s: any) => (
                  <SelectItem key={s} value={s}>{SERIES_NAMES[s] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(yearFilter !== 'all' || sessionFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setYearFilter('all'); setSessionFilter('all'); }}
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Papers Cards */}
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
                {papers.length === 0
                  ? 'Papers for this subject are being added. Check back soon!'
                  : 'Try adjusting your filters.'}
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
                    return (
                      <div key={paper.id} className="bg-card border rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
                        {/* Paper header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-foreground">
                              {(() => {
                                const subjectCode = paper.subjects?.code || selectedSubject?.code || '0000';
                                let pNum = paper.paper_number || '1';
                                if (pNum.toLowerCase().startsWith('paper ')) pNum = pNum.substring(6).trim();
                                return `Paper ${pNum} (${subjectCode}/${paper.variant || '1'})`;
                              })()}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDuration(paper.duration_minutes)}
                              </Badge>
                              {paper.total_marks && (
                                <Badge variant="outline" className="text-xs">
                                  {paper.total_marks} marks
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {qCount} Q
                              </Badge>
                            </div>
                          </div>
                          {getAttemptBadge(paper.id)}
                        </div>

                        {/* Action buttons */}
                        <div className="space-y-2 pt-1">
                          <Link
                            href={`/student/papers/${paper.id}`}
                            className="flex justify-between items-center bg-primary text-primary-foreground p-3 rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <Play className="w-4 h-4" />
                              <span className="text-sm font-medium">Take Paper</span>
                            </div>
                            <ChevronRight className="w-4 h-4" />
                          </Link>

                          {/* Question Paper Download */}
                          {(paper.question_paper_url || paper.paper_url) && (
                            <a
                              href={paper.question_paper_url || paper.paper_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex justify-between items-center bg-muted/50 p-3 rounded-lg hover:bg-muted transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-foreground">Question Paper</span>
                              </div>
                              <Download className="w-4 h-4 text-muted-foreground" />
                            </a>
                          )}

                          {/* Mark Scheme Download */}
                          {paper.mark_scheme_url && (
                            <a
                              href={paper.mark_scheme_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex justify-between items-center bg-muted/50 p-3 rounded-lg hover:bg-muted transition-colors"
                            >
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

        {/* Stats */}
        {filteredPapers.length > 0 && filteredPapers.length !== papers.length && (
          <p className="text-sm text-muted-foreground">
            Showing {filteredPapers.length} of {papers.length} papers
          </p>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════
  // PHASE 1: Show user's added subjects
  // ══════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          Past Papers
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Select a subject to browse available past papers for practice
        </p>
      </div>

      {/* User's Subjects */}
      {userSubjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {userSubjects.map((subject: any) => (
            <SubjectCard
              key={subject.id}
              name={subject.display_name || subject.name}
              code={subject.code}
              icon={subject.icon_url}
              path=""
              color={subject.color || '#3b82f6'}
              showProgress={false}
              progress={0}
              onClick={() => selectSubject(subject.slug)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No subjects added yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Add subjects to your profile to see available past papers.
            </p>
            <Button asChild>
              <Link href="/student/subjects/add">
                <Plus className="h-4 w-4 mr-2" />
                Add Subjects
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function StudentPapersPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    }>
      <StudentPapersContent />
    </Suspense>
  );
}
