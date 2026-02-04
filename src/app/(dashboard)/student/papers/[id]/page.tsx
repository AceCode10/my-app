'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Clock,
  Play,
  FileText,
  BookOpen,
  Target,
  Calendar,
  Download,
  Timer,
  TimerOff,
  History,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { PastPaper, PaperQuestion } from '@/types/paper-practice';

export default function PaperDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const paperId = params.id as string;
  const { toast } = useToast();

  const [paper, setPaper] = useState<PastPaper | null>(null);
  const [questions, setQuestions] = useState<PaperQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [practiceMode, setPracticeMode] = useState<'timed' | 'untimed'>('timed');
  const [starting, setStarting] = useState(false);
  const [previousAttempts, setPreviousAttempts] = useState<any[]>([]);
  const [inProgressAttempt, setInProgressAttempt] = useState<any>(null);

  useEffect(() => {
    fetchPaper();
    fetchQuestions();
  }, [paperId]);

  // Fetch previous attempts after paper is loaded (needed for duration check)
  useEffect(() => {
    if (paper) {
      fetchPreviousAttempts();
    }
  }, [paper]);

  async function fetchPaper() {
    try {
      const { data, error } = await supabase
        .from('past_papers')
        .select('*, subjects(id, name, slug)')
        .eq('id', paperId)
        .single();

      if (error) throw error;
      setPaper(data as any);
    } catch (error: any) {
      console.error('Error fetching paper:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load paper details'
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchQuestions() {
    try {
      const { data, error } = await supabase
        .from('paper_questions')
        .select('*')
        .eq('paper_id', paperId)
        .order('question_number', { ascending: true })
        .order('part_label', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
    }
  }

  async function fetchPreviousAttempts() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('paper_id', paperId)
        .order('started_at', { ascending: false })
        .limit(5);

      if (!data) {
        setPreviousAttempts([]);
        return;
      }

      // Check for expired timed attempts and auto-submit them
      const paperData = paper;
      const updatedAttempts = await Promise.all(data.map(async (attempt: any) => {
        if (attempt.status === 'in_progress' && attempt.practice_mode === 'timed' && paperData?.duration_minutes) {
          const startTime = new Date(attempt.started_at).getTime();
          const durationMs = paperData.duration_minutes * 60 * 1000;
          const elapsed = Date.now() - startTime;
          
          // If time has expired, auto-submit this attempt
          if (elapsed >= durationMs) {
            const timeSpent = Math.floor(elapsed / 1000);
            
            // Update the attempt to submitted status
            const { error } = await supabase
              .from('assessment_attempts')
              .update({
                status: 'submitted',
                submitted_at: new Date().toISOString(),
                time_spent_seconds: timeSpent,
                review_status: 'pending',
                auto_submitted: true
              })
              .eq('id', attempt.id);
            
            if (!error) {
              // Mark as closed
              await supabase
                .from('assessment_attempts')
                .update({
                  status: 'closed',
                  completed_at: new Date().toISOString()
                })
                .eq('id', attempt.id)
                .eq('status', 'submitted');
              
              // Show notification
              toast({
                title: 'Attempt Auto-Submitted',
                description: `Your timed attempt from ${new Date(attempt.started_at).toLocaleDateString()} has been automatically submitted because the time expired.`,
                variant: 'default'
              });
              
              return { ...attempt, status: 'closed', auto_submitted: true };
            }
          }
        }
        return attempt;
      }));

      setPreviousAttempts(updatedAttempts);
      
      // Check for in-progress attempt (only non-expired ones now)
      const inProgress = updatedAttempts.find((a: any) => a.status === 'in_progress');
      setInProgressAttempt(inProgress || null);
    } catch (error) {
      console.error('Error fetching attempts:', error);
    }
  }

  async function handleStartPractice() {
    setStarting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Not logged in',
          description: 'Please log in to start practice'
        });
        return;
      }

      // Check for existing in-progress attempts for this paper
      const { data: existingAttempts, error: checkError } = await supabase
        .from('assessment_attempts')
        .select('id, practice_mode, started_at')
        .eq('user_id', user.id)
        .eq('paper_id', paperId)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false });

      if (checkError) throw checkError;

      // If there's an existing attempt, ask user what to do
      if (existingAttempts && existingAttempts.length > 0) {
        const existingAttempt = existingAttempts[0];
        
        const shouldContinue = window.confirm(
          `You have an existing ${existingAttempt.practice_mode} practice session in progress. Would you like to continue it?\n\nClick OK to continue, or Cancel to start a new attempt (your previous attempt will be auto-submitted).`
        );

        if (shouldContinue) {
          // Continue existing attempt
          router.push(`/student/papers/${paperId}/practice?attempt=${existingAttempt.id}`);
          return;
        } else {
          // Auto-submit the previous attempt
          await supabase
            .from('assessment_attempts')
            .update({
              status: 'submitted',
              submitted_at: new Date().toISOString(),
              review_status: existingAttempt.practice_mode === 'timed' ? 'pending' : null
            })
            .eq('id', existingAttempt.id);

          // Then close it
          await supabase
            .from('assessment_attempts')
            .update({
              status: 'closed',
              completed_at: new Date().toISOString()
            })
            .eq('id', existingAttempt.id)
            .eq('status', 'submitted');

          toast({
            title: 'Previous attempt submitted',
            description: 'Your previous attempt has been auto-submitted. Starting new session...'
          });
        }
      }

      // Create a new attempt
      const { data: attempt, error } = await supabase
        .from('assessment_attempts')
        .insert({
          user_id: user.id,
          paper_id: paperId,
          practice_mode: practiceMode,
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to the practice session
      router.push(`/student/papers/${paperId}/practice?attempt=${attempt.id}`);
    } catch (error: any) {
      console.error('Error starting practice:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to start practice session'
      });
    } finally {
      setStarting(false);
    }
  }

  async function handleContinueAttempt(attemptId: string) {
    router.push(`/student/papers/${paperId}/practice?attempt=${attemptId}`);
  }

  async function handleViewResults(attemptId: string) {
    router.push(`/student/papers/${paperId}/results?attempt=${attemptId}`);
  }

  // Calculate stats
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const mcqCount = questions.filter(q => q.question_type === 'mcq').length;
  const structuredCount = questions.filter(q => q.question_type === 'structured' || q.question_type === 'essay').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Paper not found</h3>
        <Button onClick={() => router.push('/student/papers')}>
          Back to Papers
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/student/papers')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Papers
        </Button>
      </div>

      {/* Paper Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">
                {/* Short title format: Subject P1 V12 Session Year */}
                {(paper as any).subjects?.name || 'Paper'} P{paper.paper_number || '1'} V{paper.variant || '1'} {paper.session} {paper.year}
              </CardTitle>
              <CardDescription className="mt-2">
                {(paper as any).subjects?.name || 'General'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">
                <Calendar className="h-3 w-3 mr-1" />
                {paper.year}
              </Badge>
              {paper.session && (
                <Badge variant="outline">{paper.session}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{questions.length}</p>
              <p className="text-sm text-muted-foreground">Questions</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalMarks}</p>
              <p className="text-sm text-muted-foreground">Total Marks</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{paper.duration_minutes || '—'}</p>
              <p className="text-sm text-muted-foreground">Minutes</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <FileText className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{paper.paper_number || '—'}</p>
              <p className="text-sm text-muted-foreground">Paper</p>
            </div>
          </div>

          {/* Question Breakdown */}
          <div className="mb-6">
            <h4 className="font-medium mb-2">Question Types</h4>
            <div className="flex flex-wrap gap-2">
              {mcqCount > 0 && (
                <Badge variant="secondary">{mcqCount} Multiple Choice</Badge>
              )}
              {structuredCount > 0 && (
                <Badge variant="secondary">{structuredCount} Structured</Badge>
              )}
              {questions.length - mcqCount - structuredCount > 0 && (
                <Badge variant="secondary">
                  {questions.length - mcqCount - structuredCount} Other
                </Badge>
              )}
            </div>
          </div>

          {/* Resource Links */}
          <div className="flex flex-wrap gap-2 mb-6">
            {paper.question_paper_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={paper.question_paper_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Question Paper
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            )}
            {paper.mark_scheme_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={paper.mark_scheme_url} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Mark Scheme
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            )}
          </div>

          {/* Continue or Start Practice Button */}
          {inProgressAttempt ? (
            <div className="space-y-3">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium mb-2">
                  You have an in-progress session from {new Date(inProgressAttempt.started_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="lg" 
                    className="flex-1"
                    onClick={() => handleContinueAttempt(inProgressAttempt.id)}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Continue Session
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => setStartDialogOpen(true)}
                    disabled={questions.length === 0}
                  >
                    Start New
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button 
              size="lg" 
              className="w-full"
              onClick={() => setStartDialogOpen(true)}
              disabled={questions.length === 0}
            >
              <Play className="h-5 w-5 mr-2" />
              Start Practice Session
            </Button>
          )}

          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              No questions available for this paper yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Previous Attempts */}
      {previousAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Your Previous Attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {previousAttempts.map((attempt) => (
                <div 
                  key={attempt.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {new Date(attempt.started_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={attempt.status === 'in_progress' ? 'outline' : 'secondary'}
                        className={attempt.status === 'in_progress' ? 'bg-yellow-50 text-yellow-700' : ''}
                      >
                        {attempt.status === 'in_progress' ? 'In Progress' : 'Completed'}
                      </Badge>
                      <Badge variant="outline">
                        {attempt.practice_mode === 'timed' ? 'Timed' : 'Untimed'}
                      </Badge>
                      {/* Show Marked badge when graded */}
                      {(attempt.review_status === 'completed' || attempt.graded_at) && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          ✓ Marked
                        </Badge>
                      )}
                      {/* Show Pending Review badge when awaiting grading */}
                      {attempt.review_status === 'pending' && !attempt.graded_at && (
                        <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">
                          Pending Review
                        </Badge>
                      )}
                      {/* Show score if available */}
                      {attempt.percentage !== null && attempt.percentage !== undefined && (
                        <Badge variant="secondary" className="font-semibold">
                          {Math.round(attempt.percentage)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    {attempt.status === 'in_progress' ? (
                      <Button 
                        size="sm"
                        onClick={() => handleContinueAttempt(attempt.id)}
                      >
                        Continue
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewResults(attempt.id)}
                      >
                        View Results
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Practice Dialog */}
      <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Practice Session</DialogTitle>
            <DialogDescription>
              Choose how you want to practice this paper
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                practiceMode === 'timed' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted hover:border-muted-foreground/50'
              }`}
              onClick={() => setPracticeMode('timed')}
            >
              <div className="flex items-center gap-3">
                <Timer className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-medium">Timed Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Practice under exam conditions with a {paper.duration_minutes || 60} minute timer
                  </p>
                </div>
              </div>
            </div>

            <div 
              className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                practiceMode === 'untimed' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted hover:border-muted-foreground/50'
              }`}
              onClick={() => setPracticeMode('untimed')}
            >
              <div className="flex items-center gap-3">
                <TimerOff className="h-6 w-6 text-muted-foreground" />
                <div>
                  <p className="font-medium">Untimed Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Take your time to work through questions without pressure
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStartDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartPractice} disabled={starting}>
              {starting ? 'Starting...' : 'Start Practice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
