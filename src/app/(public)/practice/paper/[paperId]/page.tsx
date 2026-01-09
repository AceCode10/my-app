'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Clock, 
  FileText, 
  Play, 
  Download, 
  CheckCircle,
  AlertCircle,
  Timer,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
  level?: string;
  subject_id?: string;
  subjects?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function PracticePaperPage({ 
  params 
}: { 
  params: Promise<{ paperId: string }>
}) {
  const { paperId } = use(params);
  const router = useRouter();
  const supabase = createClient();
  
  const [paper, setPaper] = useState<Paper | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [practiceMode, setPracticeMode] = useState<'timed' | 'untimed' | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    fetchPaper();
  }, [paperId]);

  async function fetchPaper() {
    try {
      setIsLoading(true);
      
      const { data, error: fetchError } = await supabase
        .from('past_papers')
        .select(`
          *,
          subjects:subject_id(id, name, slug)
        `)
        .eq('id', paperId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Paper not found');
      
      setPaper(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching paper:', err);
      setError(err.message || 'Failed to load paper');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStartPractice(mode: 'timed' | 'untimed') {
    setIsStarting(true);
    setPracticeMode(mode);
    
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to login if not authenticated
        router.push(`/login?redirect=/practice/paper/${paperId}`);
        return;
      }

      // Create a new attempt
      const { data: attempt, error } = await supabase
        .from('assessment_attempts')
        .insert({
          user_id: user.id,
          paper_id: paperId,
          practice_mode: mode,
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to the practice session with uploaded questions
      router.push(`/student/papers/${paperId}/practice?attempt=${attempt.id}`);
    } catch (err: any) {
      console.error('Error starting practice:', err);
      setIsStarting(false);
      setPracticeMode(null);
    }
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Paper Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => router.back()}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  const paperUrl = paper?.question_paper_url || paper?.paper_url;

  return (
    <div className="py-8">
      {/* Breadcrumb */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center text-sm text-muted-foreground">
          <Link href="/resources/past-papers" className="hover:text-primary">
            Past Papers
          </Link>
          <ChevronLeft className="h-4 w-4 mx-1 rotate-180" />
          {paper?.subjects && (
            <>
              <Link 
                href={`/resources/past-papers/${paper.subjects.slug}`} 
                className="hover:text-primary"
              >
                {paper.subjects.name}
              </Link>
              <ChevronLeft className="h-4 w-4 mx-1 rotate-180" />
            </>
          )}
          <span className="font-medium text-foreground">
            {paper?.title || 'Practice Paper'}
          </span>
        </div>
      </div>

      {/* Paper Info Card */}
      <div className="max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {paper?.title || `${paper?.year} ${paper?.session} Paper ${paper?.paper_number}`}
                </CardTitle>
                <CardDescription className="mt-2">
                  {paper?.subjects?.name} • {paper?.exam_board} • {paper?.year}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">
                {paper?.level?.toUpperCase() || 'IGCSE'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Paper Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">
                  {paper?.duration_minutes || '—'}
                </div>
                <div className="text-xs text-muted-foreground">Minutes</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">
                  {paper?.total_marks || '—'}
                </div>
                <div className="text-xs text-muted-foreground">Total Marks</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <FileText className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">
                  {paper?.paper_number || '—'}
                </div>
                <div className="text-xs text-muted-foreground">Paper</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg text-center">
                <BookOpen className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">
                  {paper?.variant || '—'}
                </div>
                <div className="text-xs text-muted-foreground">Variant</div>
              </div>
            </div>

            {/* Practice Mode Selection */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-foreground mb-4">Choose Practice Mode</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Timed Mode */}
                <button
                  onClick={() => handleStartPractice('timed')}
                  disabled={isStarting || !paperUrl}
                  className="p-6 border-2 rounded-xl text-left hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Timer className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Timed Exam</h4>
                      <p className="text-xs text-muted-foreground">
                        {paper?.duration_minutes ? (paper.duration_minutes >= 60 ? `${Math.floor(paper.duration_minutes / 60)}h ${paper.duration_minutes % 60 > 0 ? `${paper.duration_minutes % 60}m` : ''}` : `${paper.duration_minutes} minutes`) : 'Standard time'}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Practice under real exam conditions with a countdown timer. 
                    Best for final exam preparation.
                  </p>
                  {isStarting && practiceMode === 'timed' && (
                    <div className="mt-3 text-sm text-primary">Starting...</div>
                  )}
                </button>

                {/* Untimed Mode */}
                <button
                  onClick={() => handleStartPractice('untimed')}
                  disabled={isStarting || !paperUrl}
                  className="p-6 border-2 rounded-xl text-left hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Play className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Practice Mode</h4>
                      <p className="text-xs text-muted-foreground">No time limit</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Take your time to work through questions carefully. 
                    Ideal for learning and revision.
                  </p>
                  {isStarting && practiceMode === 'untimed' && (
                    <div className="mt-3 text-sm text-primary">Starting...</div>
                  )}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resources Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resources</CardTitle>
            <CardDescription>Download materials for offline study</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Question Paper */}
              {paperUrl ? (
                <a
                  href={paperUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground text-sm">Question Paper</div>
                    <div className="text-xs text-muted-foreground">PDF Download</div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg opacity-50">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium text-muted-foreground text-sm">Question Paper</div>
                    <div className="text-xs text-muted-foreground">Not available</div>
                  </div>
                </div>
              )}

              {/* Mark Scheme */}
              {paper?.mark_scheme_url ? (
                <a
                  href={paper.mark_scheme_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground text-sm">Mark Scheme</div>
                    <div className="text-xs text-muted-foreground">PDF Download</div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg opacity-50">
                  <CheckCircle className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium text-muted-foreground text-sm">Mark Scheme</div>
                    <div className="text-xs text-muted-foreground">Not available</div>
                  </div>
                </div>
              )}

              {/* Examiner Report */}
              {paper?.examiner_report_url ? (
                <a
                  href={paper.examiner_report_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <BookOpen className="w-5 h-5 text-purple-500" />
                  <div className="flex-1">
                    <div className="font-medium text-foreground text-sm">Examiner Report</div>
                    <div className="text-xs text-muted-foreground">PDF Download</div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground" />
                </a>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg opacity-50">
                  <BookOpen className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium text-muted-foreground text-sm">Examiner Report</div>
                    <div className="text-xs text-muted-foreground">Not available</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="mt-8">
          <Button variant="outline" onClick={() => router.back()}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Papers
          </Button>
        </div>
      </div>
    </div>
  );
}
