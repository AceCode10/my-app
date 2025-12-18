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
  component_code?: string;
  paper_number?: string;
  variant?: string;
  paper_url?: string;
  question_paper_url?: string;
  mark_scheme_url?: string;
  examiner_report_url?: string;
  insert_url?: string;
  grade_thresholds_url?: string;
  specimen_url?: string;
  source_files_url?: string;
  duration_minutes?: number;
  total_marks?: number;
  exam_board?: string;
  exam_board_id?: string;
  level?: string;
  resource_type?: string;
  status?: string;
}

interface PaperComponent {
  component_code: string;
  component_name: string;
  component_description?: string;
}

// Series name mapping for display
const SERIES_NAMES: Record<string, string> = {
  'fm': 'February/March',
  'mj': 'May/June',
  'on': 'October/November',
  'jan': 'January',
  'may': 'May',
  'jun': 'June',
  'am': 'April/May',
};

// Resource type names for display
const RESOURCE_TYPE_NAMES: Record<string, string> = {
  'question_paper': 'Question Paper',
  'mark_scheme': 'Mark Scheme',
  'insert': 'Insert/Source Booklet',
  'source_files': 'Source Files',
  'examiner_report': 'Examiner Report',
  'grade_thresholds': 'Grade Thresholds',
  'specimen': 'Specimen Paper',
  'syllabus': 'Syllabus',
};

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
  const [componentFilter, setComponentFilter] = useState<string>('all');
  const [resourceTypeFilter, setResourceTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Subject-specific configuration
  const [paperComponents, setPaperComponents] = useState<PaperComponent[]>([]);

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

      // Fetch paper components for this subject (for filter options)
      const { data: componentsData } = await supabase
        .from('subject_paper_components')
        .select('component_code, component_name, component_description')
        .eq('subject_id', subjectData.id)
        .order('display_order');
      
      setPaperComponents(componentsData || []);

      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  // Get unique years, sessions, components, and resource types for filters
  const years = [...new Set(papers.map(p => p.year))].sort((a, b) => b - a);
  const sessions = [...new Set(papers.map(p => p.session).filter((s): s is string => Boolean(s)))];
  const components = [...new Set(papers.map(p => p.component_code).filter((c): c is string => Boolean(c)))];
  const resourceTypes = [...new Set(papers.map(p => p.resource_type).filter((r): r is string => Boolean(r)))];

  // Get component name for display
  const getComponentName = (code: string) => {
    const comp = paperComponents.find(c => c.component_code === code);
    return comp?.component_name || `Paper ${code}`;
  };

  // Filter papers
  const filteredPapers = papers.filter(paper => {
    if (yearFilter !== 'all' && paper.year !== parseInt(yearFilter)) return false;
    if (sessionFilter !== 'all' && paper.session !== sessionFilter) return false;
    if (componentFilter !== 'all' && paper.component_code !== componentFilter) return false;
    if (resourceTypeFilter !== 'all' && paper.resource_type !== resourceTypeFilter) return false;
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

  // Group papers by year and session, then sort by component within each group
  const groupedPapers = filteredPapers.reduce((acc, paper) => {
    const sessionCode = paper.session || 'Unknown';
    const sessionName = SERIES_NAMES[sessionCode] || sessionCode;
    const key = `${paper.year}-${sessionCode}`;
    if (!acc[key]) {
      acc[key] = {
        year: paper.year,
        session: sessionName,
        sessionCode: sessionCode,
        papers: []
      };
    }
    acc[key].papers.push(paper);
    return acc;
  }, {} as Record<string, { year: number; session: string; sessionCode: string; papers: Paper[] }>);

  // Sort groups by year (descending) then session, and sort papers within each group by component
  const sortedGroups = Object.values(groupedPapers)
    .sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return (a.session || '').localeCompare(b.session || '');
    })
    .map(group => ({
      ...group,
      // Sort papers by component_code numerically, then by variant numerically
      papers: group.papers.sort((a, b) => {
        // First sort by component code (e.g., 1, 2, 3, 4)
        const aCode = parseInt(a.component_code || '0') || 0;
        const bCode = parseInt(b.component_code || '0') || 0;
        if (aCode !== bCode) return aCode - bCode;
        
        // Then sort by variant (e.g., 11, 12, 13 or 1, 2, 3)
        const aVariant = parseInt(a.variant || '0') || 0;
        const bVariant = parseInt(b.variant || '0') || 0;
        if (aVariant !== bVariant) return aVariant - bVariant;
        
        // Finally by paper_number as fallback
        return (a.paper_number || '').localeCompare(b.paper_number || '');
      })
    }));

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
            <div className="text-muted-foreground mt-2 flex items-center flex-wrap gap-2">
              {subject?.code && <Badge variant="outline">{subject.code}</Badge>}
              <span>Download question papers and mark schemes for {subject?.name}</span>
            </div>
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
            <SelectValue placeholder="Series" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Series</SelectItem>
            {sessions.map(session => (
              <SelectItem key={session} value={session}>
                {SERIES_NAMES[session] || session}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {components.length > 0 && (
          <Select value={componentFilter} onValueChange={setComponentFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Paper" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Papers</SelectItem>
              {components.map(code => (
                <SelectItem key={code} value={code}>
                  {getComponentName(code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={resourceTypeFilter} onValueChange={setResourceTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Resource Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Resources</SelectItem>
            {resourceTypes.map(type => (
              <SelectItem key={type} value={type}>
                {RESOURCE_TYPE_NAMES[type] || type}
              </SelectItem>
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

                      {/* Insert (if available) */}
                      {paper.insert_url && (
                        <a 
                          href={paper.insert_url} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex justify-between items-center bg-muted/50 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-purple-500" />
                            <span className="text-sm font-medium text-foreground">Insert</span>
                          </div>
                          <Download className="w-4 h-4 text-muted-foreground" />
                        </a>
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

                      {/* Source Files ZIP (if available) - auto-download on click */}
                      {paper.source_files_url && (
                        <a 
                          href={paper.source_files_url} 
                          download
                          className="flex justify-between items-center bg-muted/50 p-3 rounded-lg hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <FileArchive className="w-5 h-5 text-orange-500" />
                            <span className="text-sm font-medium text-foreground">Source Files (ZIP)</span>
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
