'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, FileText, CheckCircle, Download, FileArchive, Calendar, Filter, Search, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';

interface Paper {
  id: string;
  title: string;
  year: number;
  session?: string;
  paper_number?: string;
  variant?: string;
  paper_url?: string;
  question_paper_url?: string;
  mark_scheme_url?: string;
  examiner_report_url?: string;
  duration_minutes?: number;
  total_marks?: number;
  exam_board?: string;
  exam_board_id?: string;
  level?: string;
  status?: string;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  code?: string;
}

export default function SubjectPastPapersPage({ 
  params 
}: { 
  params: Promise<{ subject: string }>
}) {
  const { subject: subjectSlug } = use(params);
  const supabase = createClient();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [subjectSlug]);

  async function fetchData() {
    try {
      setIsLoading(true);
      
      // Fetch subject
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('slug', subjectSlug)
        .single();

      if (subjectError) throw subjectError;
      if (!subjectData) throw new Error('Subject not found');
      
      setSubject(subjectData);

      // Fetch papers for this subject from past_papers table
      const { data: papersData, error: papersError } = await supabase
        .from('past_papers')
        .select('*')
        .eq('subject_id', subjectData.id)
        .eq('status', 'published')
        .order('year', { ascending: false })
        .order('session', { ascending: true });

      if (papersError) throw papersError;
      setPapers(papersData || []);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  // Get unique years and sessions for filters
  const years = [...new Set(papers.map(p => p.year))].sort((a, b) => b - a);
  const sessions = [...new Set(papers.map(p => p.session).filter((s): s is string => Boolean(s)))];

  // Filter papers
  const filteredPapers = papers.filter(paper => {
    if (yearFilter !== 'all' && paper.year !== parseInt(yearFilter)) return false;
    if (sessionFilter !== 'all' && paper.session !== sessionFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        paper.title?.toLowerCase().includes(query) ||
        paper.paper_number?.toLowerCase().includes(query) ||
        paper.variant?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Group papers by year and session
  const groupedPapers = filteredPapers.reduce((acc, paper) => {
    const sessionKey = paper.session || 'Unknown';
    const key = `${paper.year}-${sessionKey}`;
    if (!acc[key]) {
      acc[key] = {
        year: paper.year,
        session: sessionKey,
        papers: []
      };
    }
    acc[key].papers.push(paper);
    return acc;
  }, {} as Record<string, { year: number; session: string; papers: Paper[] }>);

  const sortedGroups = Object.values(groupedPapers).sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return (a.session || '').localeCompare(b.session || '');
  });

  const ResourceIcon = ({ type }: { type: 'qp' | 'ms' | 'er' }) => {
    switch (type) {
      case 'qp': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'ms': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'er': return <FileArchive className="w-5 h-5 text-yellow-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  if (error) {
    return (
      <div className="py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Error</h1>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button onClick={fetchData} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground mb-6">
        <Link href="/resources/past-papers" className="hover:text-primary">
          Past Papers
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground">
          {isLoading ? <Skeleton className="h-4 w-24 inline-block" /> : subject?.name}
        </span>
      </div>

      {/* Header */}
      <div className="mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold text-foreground">
              {subject?.name} Past Papers
            </h1>
            <p className="text-muted-foreground mt-2">
              {subject?.code && <Badge variant="outline" className="mr-2">{subject.code}</Badge>}
              Download question papers and mark schemes for {subject?.name}
            </p>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8 p-4 bg-card rounded-xl border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Filters:</span>
        </div>
        
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {years.map(year => (
              <SelectItem key={year} value={String(year)}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sessionFilter} onValueChange={setSessionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            {sessions.map(session => (
              <SelectItem key={session} value={session}>{session}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-grow max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search papers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Papers List */}
      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card p-6 rounded-xl border">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedGroups.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border">
          <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No Papers Found</h3>
          <p className="text-muted-foreground mt-2">
            {papers.length === 0 
              ? `Past papers for ${subject?.name} are being added. Check back soon!`
              : 'No papers match your current filters. Try adjusting your search.'}
          </p>
          {papers.length > 0 && (
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => {
                setYearFilter('all');
                setSessionFilter('all');
                setSearchQuery('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(({ year, session, papers: groupPapers }) => (
            <div key={`${year}-${session}`} className="bg-card p-6 rounded-xl border">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">{year} - {session}</h2>
                <Badge variant="secondary">{groupPapers.length} paper{groupPapers.length !== 1 ? 's' : ''}</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupPapers.map((paper) => (
                  <div key={paper.id} className="bg-muted/30 p-4 rounded-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-foreground text-sm">
                          {paper.title || `Paper ${paper.paper_number || ''} ${paper.variant ? `(Variant ${paper.variant})` : ''}`}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {paper.duration_minutes && (
                            <Badge variant="outline" className="text-xs">
                              {paper.duration_minutes} min
                            </Badge>
                          )}
                          {paper.total_marks && (
                            <Badge variant="outline" className="text-xs">
                              {paper.total_marks} marks
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      {/* Take Paper Button - Primary Action */}
                      <Link 
                        href={`/practice/paper/${paper.id}`}
                        className="flex justify-between items-center bg-primary text-primary-foreground p-3 rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Play className="w-4 h-4" />
                          <span className="text-sm font-medium">Take Paper</span>
                        </div>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                      
                      {/* Question Paper Download */}
                      {(paper.question_paper_url || paper.paper_url) ? (
                        <a 
                          href={paper.question_paper_url || paper.paper_url} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex justify-between items-center bg-muted/50 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <ResourceIcon type="qp" />
                            <span className="text-sm font-medium text-foreground">Question Paper</span>
                          </div>
                          <Download className="w-4 h-4 text-muted-foreground" />
                        </a>
                      ) : (
                        <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg opacity-50">
                          <div className="flex items-center gap-3">
                            <ResourceIcon type="qp" />
                            <span className="text-sm font-medium text-muted-foreground">Question Paper (Coming Soon)</span>
                          </div>
                        </div>
                      )}

                      {/* Mark Scheme */}
                      {paper.mark_scheme_url ? (
                        <a 
                          href={paper.mark_scheme_url} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex justify-between items-center bg-muted/50 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <ResourceIcon type="ms" />
                            <span className="text-sm font-medium text-foreground">Mark Scheme</span>
                          </div>
                          <Download className="w-4 h-4 text-muted-foreground" />
                        </a>
                      ) : (
                        <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg opacity-50">
                          <div className="flex items-center gap-3">
                            <ResourceIcon type="ms" />
                            <span className="text-sm font-medium text-muted-foreground">Mark Scheme (Coming Soon)</span>
                          </div>
                        </div>
                      )}

                      {/* Examiner Report (if available) */}
                      {paper.examiner_report_url && (
                        <a 
                          href={paper.examiner_report_url} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex justify-between items-center bg-muted/50 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <ResourceIcon type="er" />
                            <span className="text-sm font-medium text-foreground">Examiner Report</span>
                          </div>
                          <Download className="w-4 h-4 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
