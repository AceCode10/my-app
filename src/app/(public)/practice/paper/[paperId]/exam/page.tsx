'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  X,
  FileText,
  Send,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface ExamState {
  status: 'not_started' | 'in_progress' | 'paused' | 'submitted' | 'time_up';
  startTime: Date | null;
  endTime: Date | null;
  timeRemaining: number; // in seconds
  isPaused: boolean;
}

export default function ExamPlayerPage({ 
  params 
}: { 
  params: Promise<{ paperId: string }>
}) {
  const { paperId } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  
  const [paper, setPaper] = useState<Paper | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [examState, setExamState] = useState<ExamState>({
    status: 'not_started',
    startTime: null,
    endTime: null,
    timeRemaining: 0,
    isPaused: false
  });
  
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Fetch current user
  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    }
    fetchUser();
  }, []);

  // Fetch paper data
  useEffect(() => {
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
        
        // Initialize timer with paper duration
        const durationSeconds = (data.duration_minutes || 60) * 60;
        setExamState(prev => ({
          ...prev,
          timeRemaining: durationSeconds
        }));
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching paper:', err);
        setError(err.message || 'Failed to load paper');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPaper();
  }, [paperId]);

  // Timer countdown
  useEffect(() => {
    if (examState.status !== 'in_progress' || examState.isPaused) return;
    
    const interval = setInterval(() => {
      setExamState(prev => {
        const newTimeRemaining = prev.timeRemaining - 1;
        
        if (newTimeRemaining <= 0) {
          clearInterval(interval);
          setShowTimeUpDialog(true);
          return {
            ...prev,
            timeRemaining: 0,
            status: 'time_up'
          };
        }
        
        return {
          ...prev,
          timeRemaining: newTimeRemaining
        };
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [examState.status, examState.isPaused]);

  // Format time display
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get time color based on remaining time
  const getTimeColor = useCallback(() => {
    const totalSeconds = (paper?.duration_minutes || 60) * 60;
    const percentRemaining = (examState.timeRemaining / totalSeconds) * 100;
    
    if (percentRemaining <= 10) return 'text-red-500';
    if (percentRemaining <= 25) return 'text-orange-500';
    return 'text-foreground';
  }, [examState.timeRemaining, paper?.duration_minutes]);

  // Start exam
  const handleStartExam = async () => {
    const startTime = new Date();
    
    // Create attempt record if user is logged in
    if (currentUser) {
      try {
        const { data: attempt, error: attemptError } = await supabase
          .from('assessment_attempts')
          .insert({
            user_id: currentUser.id,
            paper_id: paperId,
            started_at: startTime.toISOString(),
            status: 'in_progress',
            practice_mode: 'timed',
            max_score: paper?.total_marks || null
          })
          .select()
          .single();
        
        if (attemptError) {
          console.error('Error creating attempt:', attemptError);
          // Continue anyway - don't block the exam
        } else if (attempt) {
          setAttemptId(attempt.id);
        }
      } catch (err) {
        console.error('Error creating attempt:', err);
      }
    }
    
    setExamState({
      status: 'in_progress',
      startTime,
      endTime: null,
      timeRemaining: (paper?.duration_minutes || 60) * 60,
      isPaused: false
    });
    
    toast({
      title: 'Exam Started',
      description: `You have ${paper?.duration_minutes || 60} minutes to complete this paper.`
    });
  };

  // Pause/Resume exam
  const handleTogglePause = () => {
    setExamState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  };

  // Submit exam
  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    
    try {
      const endTime = new Date();
      const startTime = examState.startTime || new Date();
      const timeSpentSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      // Update attempt record if exists
      if (attemptId && currentUser) {
        const { error: updateError } = await supabase
          .from('assessment_attempts')
          .update({
            submitted_at: endTime.toISOString(),
            time_spent_seconds: timeSpentSeconds,
            status: 'submitted'
          })
          .eq('id', attemptId);
        
        if (updateError) {
          console.error('Error updating attempt:', updateError);
        }
      }
      
      setExamState(prev => ({
        ...prev,
        status: 'submitted',
        endTime
      }));
      
      toast({
        title: 'Exam Submitted',
        description: `Time spent: ${formatTime(timeSpentSeconds)}`
      });
      
      // Redirect to results page with attempt ID
      const params = new URLSearchParams({
        time: timeSpentSeconds.toString(),
        ...(attemptId && { attempt: attemptId })
      });
      router.push(`/practice/paper/${paperId}/results?${params.toString()}`);
      
    } catch (err: any) {
      console.error('Error submitting exam:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit exam. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
      setShowSubmitDialog(false);
      setShowTimeUpDialog(false);
    }
  };

  // Exit exam
  const handleExitExam = async () => {
    // Mark attempt as abandoned if exists
    if (attemptId && currentUser) {
      const endTime = new Date();
      const startTime = examState.startTime || new Date();
      const timeSpentSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      
      await supabase
        .from('assessment_attempts')
        .update({
          status: 'abandoned',
          time_spent_seconds: timeSpentSeconds
        })
        .eq('id', attemptId);
    }
    
    router.push(`/practice/paper/${paperId}`);
  };

  // Calculate progress
  const totalSeconds = (paper?.duration_minutes || 60) * 60;
  const progressPercent = ((totalSeconds - examState.timeRemaining) / totalSeconds) * 100;

  const paperUrl = paper?.question_paper_url || paper?.paper_url;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Error Loading Exam</h1>
          <p className="text-muted-foreground mb-6">{error || 'Paper not found'}</p>
          <Button onClick={() => router.back()}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Pre-exam start screen
  if (examState.status === 'not_started') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{paper.title}</CardTitle>
            <CardDescription>
              {paper.subjects?.name} • {paper.exam_board} • {paper.year}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-muted/50 p-4 rounded-lg">
                <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{paper.duration_minutes || 60}</div>
                <div className="text-xs text-muted-foreground">Minutes</div>
              </div>
              <div className="bg-muted/50 p-4 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{paper.total_marks || '—'}</div>
                <div className="text-xs text-muted-foreground">Total Marks</div>
              </div>
            </div>
            
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                <div>
                  <h4 className="font-medium text-foreground">Before You Start</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>• The timer will start immediately</li>
                    <li>• You can pause the exam if needed</li>
                    <li>• Make sure you have a stable connection</li>
                    <li>• Have pen and paper ready for working</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => router.back()}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                className="flex-1"
                onClick={handleStartExam}
                disabled={!paperUrl}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Exam in progress
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowExitDialog(true)}
          >
            <X className="w-4 h-4 mr-2" />
            Exit
          </Button>
          <div className="hidden md:block">
            <h1 className="font-semibold text-foreground">{paper.title}</h1>
            <p className="text-xs text-muted-foreground">
              {paper.subjects?.name} • {paper.year} {paper.session}
            </p>
          </div>
        </div>
        
        {/* Timer */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${getTimeColor()}`}>
            <Clock className="w-5 h-5" />
            <span className="text-2xl font-mono font-bold">
              {formatTime(examState.timeRemaining)}
            </span>
            {examState.isPaused && (
              <Badge variant="secondary">Paused</Badge>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePause}
          >
            {examState.isPaused ? (
              <>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            )}
          </Button>
          
          <Button
            size="sm"
            onClick={() => setShowSubmitDialog(true)}
          >
            <Send className="w-4 h-4 mr-2" />
            Submit
          </Button>
        </div>
      </div>
      
      {/* Progress Bar */}
      <Progress value={progressPercent} className="h-1 rounded-none" />
      
      {/* PDF Viewer */}
      <div className="flex-1 relative">
        {examState.isPaused ? (
          <div className="absolute inset-0 bg-background/95 flex items-center justify-center z-10">
            <div className="text-center">
              <Pause className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Exam Paused</h2>
              <p className="text-muted-foreground mb-6">
                Time remaining: {formatTime(examState.timeRemaining)}
              </p>
              <Button onClick={handleTogglePause}>
                <Play className="w-4 h-4 mr-2" />
                Resume Exam
              </Button>
            </div>
          </div>
        ) : null}
        
        {paperUrl ? (
          <iframe
            src={`${paperUrl}#toolbar=0`}
            className="w-full h-full border-0"
            title="Exam Paper"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Paper PDF not available</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You still have {formatTime(examState.timeRemaining)} remaining. 
              Are you sure you want to submit your exam?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleSubmitExam}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will not be saved. Are you sure you want to exit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleExitExam}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Exit Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Time Up Dialog */}
      <AlertDialog open={showTimeUpDialog} onOpenChange={setShowTimeUpDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-destructive" />
              Time's Up!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your exam time has ended. Your exam will now be submitted automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={handleSubmitExam}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'View Results'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
