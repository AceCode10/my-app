'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  FileText, 
  CheckCircle,
  TrendingUp,
  Calendar,
  ChevronRight,
  Trophy,
  AlertCircle,
  BarChart3,
  Target,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';

interface PaperAttempt {
  id: string;
  paper_id: string;
  started_at: string;
  submitted_at: string | null;
  time_spent_seconds: number | null;
  practice_mode: string | null;
  self_score: number | null;
  score: number | null;
  percentage: number | null;
  max_score: number | null;
  status: string;
  notes: string | null;
  past_papers: {
    id: string;
    title: string;
    year: number;
    session: string | null;
    paper_number: string | null;
    variant: string | null;
    total_marks: number | null;
    duration_minutes: number | null;
    exam_board: string | null;
    subjects: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
}

interface SubjectStats {
  subject_name: string;
  subject_slug: string;
  attempts: number;
  avg_percentage: number;
  best_percentage: number;
}

export default function PracticeHistoryPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [attempts, setAttempts] = useState<PaperAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [subjectStats, setSubjectStats] = useState<SubjectStats[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/login?redirect=/practice/history');
          return;
        }
        
        setCurrentUser(user);
        
        // Fetch all paper attempts for this user
        const { data: attemptsData, error } = await supabase
          .from('assessment_attempts')
          .select(`
            id,
            paper_id,
            started_at,
            submitted_at,
            time_spent_seconds,
            practice_mode,
            self_score,
            score,
            percentage,
            max_score,
            status,
            notes,
            past_papers!inner (
              id,
              title,
              year,
              session,
              paper_number,
              variant,
              total_marks,
              duration_minutes,
              exam_board,
              subjects:subject_id (
                id,
                name,
                slug
              )
            )
          `)
          .eq('user_id', user.id)
          .not('paper_id', 'is', null)
          .order('started_at', { ascending: false });
        
        if (error) throw error;
        
        setAttempts(attemptsData || []);
        
        // Calculate subject stats
        const statsMap = new Map<string, { 
          subject_name: string; 
          subject_slug: string;
          percentages: number[]; 
          count: number 
        }>();
        
        (attemptsData || []).forEach((attempt: PaperAttempt) => {
          if (attempt.percentage && attempt.past_papers?.subjects) {
            const subjectName = attempt.past_papers.subjects.name;
            const subjectSlug = attempt.past_papers.subjects.slug;
            
            if (!statsMap.has(subjectName)) {
              statsMap.set(subjectName, { 
                subject_name: subjectName, 
                subject_slug: subjectSlug,
                percentages: [], 
                count: 0 
              });
            }
            
            const stat = statsMap.get(subjectName)!;
            stat.percentages.push(attempt.percentage);
            stat.count++;
          }
        });
        
        const stats: SubjectStats[] = Array.from(statsMap.values()).map(stat => ({
          subject_name: stat.subject_name,
          subject_slug: stat.subject_slug,
          attempts: stat.count,
          avg_percentage: Math.round(stat.percentages.reduce((a, b) => a + b, 0) / stat.percentages.length),
          best_percentage: Math.round(Math.max(...stat.percentages))
        }));
        
        setSubjectStats(stats.sort((a, b) => b.attempts - a.attempts));
        
      } catch (err) {
        console.error('Error fetching practice history:', err);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, []);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '—';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'graded':
        return <Badge className="bg-green-500">Scored</Badge>;
      case 'submitted':
        return <Badge variant="secondary">Completed</Badge>;
      case 'in_progress':
        return <Badge variant="outline">In Progress</Badge>;
      case 'abandoned':
        return <Badge variant="destructive">Abandoned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const completedAttempts = attempts.filter(a => a.status === 'submitted' || a.status === 'graded');
  const scoredAttempts = attempts.filter(a => a.percentage !== null);
  const avgScore = scoredAttempts.length > 0 
    ? Math.round(scoredAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / scoredAttempts.length)
    : null;

  if (isLoading) {
    return (
      <div className="py-12">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="py-12">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Login Required</h1>
          <p className="text-muted-foreground mb-6">
            Please log in to view your practice history.
          </p>
          <Button onClick={() => router.push('/login?redirect=/practice/history')}>
            Log In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Practice History</h1>
            <p className="text-muted-foreground mt-1">
              Track your progress across all paper attempts
            </p>
          </div>
          <Button onClick={() => router.push('/practice')}>
            <Target className="w-4 h-4 mr-2" />
            Practice More
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{attempts.length}</div>
                  <div className="text-xs text-muted-foreground">Total Attempts</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{completedAttempts.length}</div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Trophy className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{scoredAttempts.length}</div>
                  <div className="text-xs text-muted-foreground">Scored</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {avgScore !== null ? `${avgScore}%` : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Score</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="history" className="space-y-6">
          <TabsList>
            <TabsTrigger value="history">Recent Activity</TabsTrigger>
            <TabsTrigger value="subjects">By Subject</TabsTrigger>
          </TabsList>

          {/* Recent Activity Tab */}
          <TabsContent value="history">
            {attempts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Practice History</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't practiced any papers yet. Start practicing to track your progress!
                  </p>
                  <Button onClick={() => router.push('/resources/past-papers')}>
                    Browse Past Papers
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {attempts.map((attempt) => (
                  <Card key={attempt.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-foreground">
                              {attempt.past_papers?.title || 'Unknown Paper'}
                            </h3>
                            {getStatusBadge(attempt.status)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {formatDate(attempt.started_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatTime(attempt.time_spent_seconds)}
                            </span>
                            {attempt.past_papers?.subjects && (
                              <span>{attempt.past_papers.subjects.name}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {attempt.percentage !== null && (
                            <div className="text-right">
                              <div className="text-xl font-bold text-foreground">
                                {Math.round(attempt.percentage)}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {attempt.score}/{attempt.max_score || attempt.past_papers?.total_marks}
                              </div>
                            </div>
                          )}
                          
                          <Link href={`/practice/paper/${attempt.paper_id}/results?attempt=${attempt.id}`}>
                            <Button variant="ghost" size="sm">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      
                      {attempt.notes && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-muted-foreground italic">
                            "{attempt.notes}"
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* By Subject Tab */}
          <TabsContent value="subjects">
            {subjectStats.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Scored Attempts</h3>
                  <p className="text-muted-foreground">
                    Complete papers and record your scores to see subject-level analytics.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subjectStats.map((stat) => (
                  <Card key={stat.subject_name} className="hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{stat.subject_name}</CardTitle>
                      <CardDescription>{stat.attempts} paper{stat.attempts !== 1 ? 's' : ''} attempted</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/50 p-3 rounded-lg text-center">
                          <div className="text-xl font-bold text-foreground">{stat.avg_percentage}%</div>
                          <div className="text-xs text-muted-foreground">Average</div>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-lg text-center">
                          <div className="text-xl font-bold text-green-500">{stat.best_percentage}%</div>
                          <div className="text-xs text-muted-foreground">Best Score</div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Link href={`/resources/past-papers/${stat.subject_slug}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            Practice More
                            <ChevronRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
