'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Flag,
  CheckCircle,
  AlertCircle,
  Send,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Image as ImageIcon,
  BookOpen
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PastPaper, PaperQuestion, PaperAttemptAnswer } from '@/types/paper-practice';
import { QuestionTextRenderer } from '@/components/questions/question-text-renderer';
import { FullQuestionView } from '@/components/questions/full-question-view';

export default function PaperPracticePage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const paperId = params.id as string;
  const attemptId = searchParams.get('attempt');
  const { toast } = useToast();

  const [paper, setPaper] = useState<PastPaper | null>(null);
  const [questions, setQuestions] = useState<PaperQuestion[]>([]);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Group questions by question number for full-question view
  const questionGroups = useMemo(() => {
    const groups = new Map<number, PaperQuestion[]>();
    questions.forEach(q => {
      const num = q.question_number;
      if (!groups.has(num)) groups.set(num, []);
      groups.get(num)!.push(q);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [questions]);

  // Navigation - now by question number, not individual parts
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  // Timer
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerWarning, setTimerWarning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Dialogs
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [timeUpDialogOpen, setTimeUpDialogOpen] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);

  useEffect(() => {
    if (!attemptId) {
      router.push(`/student/papers/${paperId}`);
      return;
    }
    fetchData();
  }, [paperId, attemptId]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || attempt?.practice_mode !== 'timed') return;

    if (timeRemaining <= 0) {
      handleTimeUp();
      return;
    }

    if (timeRemaining <= 300 && !timerWarning) {
      setTimerWarning(true);
      toast({
        title: '5 minutes remaining!',
        description: 'Please finish up your answers.',
        variant: 'destructive'
      });
    }

    timerRef.current = setTimeout(() => {
      setTimeRemaining(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeRemaining, attempt?.practice_mode]);

  // Prevent accessing closed attempts
  useEffect(() => {
    if (attempt && (attempt.status === 'submitted' || attempt.status === 'completed' || attempt.status === 'closed')) {
      router.push(`/student/papers/${paperId}/results?attempt=${attemptId}`);
    }
  }, [attempt, paperId, attemptId, router]);

  async function fetchData() {
    try {
      // Fetch paper
      const { data: paperData, error: paperError } = await supabase
        .from('past_papers')
        .select('*')
        .eq('id', paperId)
        .single();

      if (paperError) throw paperError;
      setPaper(paperData as any);

      // Fetch questions with optimized ordering
      const { data: questionsData, error: questionsError } = await supabase
        .from('paper_questions')
        .select('*')
        .eq('paper_id', paperId)
        .order('question_number', { ascending: true })
        .order('display_order', { ascending: true })
        .order('part_label', { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Fetch attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;
      setAttempt(attemptData);

      // Check if attempt is already submitted/closed - redirect to results
      if (attemptData.status === 'submitted' || attemptData.status === 'completed' || attemptData.status === 'closed') {
        router.push(`/student/papers/${paperId}/results?attempt=${attemptId}`);
        return;
      }

      // Calculate remaining time for timed mode
      if (attemptData.practice_mode === 'timed' && paperData.duration_minutes) {
        const startTime = new Date(attemptData.started_at).getTime();
        const durationMs = paperData.duration_minutes * 60 * 1000;
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, Math.floor((durationMs - elapsed) / 1000));
        setTimeRemaining(remaining);
      }

      // Fetch existing answers
      const { data: answersData } = await supabase
        .from('paper_attempt_answers')
        .select('*')
        .eq('attempt_id', attemptId);

      const answersMap = new Map();
      (answersData || []).forEach((answer: any) => {
        answersMap.set(answer.paper_question_id, answer);
      });
      setAnswers(answersMap);

      // Restore flagged questions from local storage
      const savedFlags = localStorage.getItem(`flags_${attemptId}`);
      if (savedFlags) {
        setFlaggedQuestions(new Set(JSON.parse(savedFlags)));
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load practice session'
      });
      router.push(`/student/papers/${paperId}`);
    } finally {
      setLoading(false);
    }
  }

  // Save answer to database
  async function saveAnswerToDb(questionId: string, answerText: string | null, selectedOption: string | null) {
    if (!attemptId) return;
    if (!answerText && !selectedOption) return; // Don't save empty answers

    setSaving(true);
    try {
      const existingAnswer = answers.get(questionId);

      if (existingAnswer?.id) {
        // Update existing answer
        const { error } = await supabase
          .from('paper_attempt_answers')
          .update({
            answer_text: answerText,
            selected_option: selectedOption,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAnswer.id);

        if (error) throw error;
      } else {
        // Create new answer
        const { data, error } = await supabase
          .from('paper_attempt_answers')
          .insert({
            attempt_id: attemptId,
            paper_question_id: questionId,
            answer_text: answerText,
            selected_option: selectedOption
          })
          .select()
          .single();

        if (error) throw error;

        setAnswers(prev => {
          const newMap = new Map(prev);
          newMap.set(questionId, data);
          return newMap;
        });
      }

      // Update local answers state
      setAnswers(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(questionId);
        if (existing) {
          newMap.set(questionId, { ...existing, answer_text: answerText, selected_option: selectedOption });
        }
        return newMap;
      });
    } catch (error: any) {
      console.error('Error saving answer:', error);
    } finally {
      setSaving(false);
    }
  }

  // Save all current question's answers to database
  async function saveCurrentQuestionAnswers() {
    if (!currentQuestionParts.length) return;
    
    setSaving(true);
    try {
      // Save each part's answer
      for (const part of currentQuestionParts) {
        const answer = answers.get(part.id);
        if (answer && (answer.answer_text || answer.selected_option)) {
          await saveAnswerToDb(part.id, answer.answer_text, answer.selected_option);
        }
      }
    } catch (error) {
      console.error('Error saving answers:', error);
    } finally {
      setSaving(false);
    }
  }

  // Navigate to a different question group (saves current answers first)
  async function navigateToQuestion(newIndex: number) {
    // Save current question's answers before navigating
    await saveCurrentQuestionAnswers();
    setCurrentQuestionIndex(newIndex);
  }

  // Handle answer change - only updates local state, does NOT save to DB
  function handleAnswerChange(questionId: string, text: string | null, option: string | null) {
    // Update local state only - saving happens on navigation
    setAnswers(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(questionId) || {};
      newMap.set(questionId, { ...existing, answer_text: text, selected_option: option });
      return newMap;
    });
  }

  function toggleFlag(questionId: string) {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      // Save to local storage
      localStorage.setItem(`flags_${attemptId}`, JSON.stringify([...newSet]));
      return newSet;
    });
  }

  function handleTimeUp() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setTimeUpDialogOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);

    try {
      // Save current question's answers before submitting
      await saveCurrentQuestionAnswers();

      // Calculate time spent
      const startTime = new Date(attempt.started_at).getTime();
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      // Auto-grade MCQ questions and assign 0 marks to unattempted questions
      let totalScore = 0;
      let maxScore = 0;
      let allMcq = true;
      let gradedCount = 0;

      for (const question of questions) {
        if (question.marks <= 0) continue; // Skip context questions
        
        maxScore += question.marks;
        const answer = answers.get(question.id);
        const hasAnswer = answer && (answer.answer_text || answer.selected_option);
        
        // Check if this is an MCQ with a correct answer set
        if (question.question_type === 'mcq' && question.correct_answer) {
          // Auto-grade MCQ
          const isCorrect = answer?.selected_option === question.correct_answer;
          const earnedMarks = isCorrect ? question.marks : 0;
          totalScore += earnedMarks;
          gradedCount++;
          
          // Update the answer record with grading
          await supabase
            .from('assessment_answers')
            .upsert({
              attempt_id: attemptId,
              question_id: question.id,
              selected_option: answer?.selected_option || null,
              answer_text: answer?.answer_text || null,
              is_correct: isCorrect,
              marks_awarded: earnedMarks,
              graded_at: new Date().toISOString(),
              auto_graded: true
            }, {
              onConflict: 'attempt_id,question_id'
            });
        } else {
          allMcq = false;
          
          // For non-MCQ questions without answers, assign 0 marks
          if (!hasAnswer) {
            await supabase
              .from('assessment_answers')
              .upsert({
                attempt_id: attemptId,
                question_id: question.id,
                selected_option: null,
                answer_text: null,
                is_correct: false,
                marks_awarded: 0,
                graded_at: new Date().toISOString(),
                auto_graded: true
              }, {
                onConflict: 'attempt_id,question_id'
              });
          }
        }
      }

      // Determine if this needs manual review (has non-MCQ questions)
      const needsReview = !allMcq;
      const reviewStatus = needsReview ? 'pending' : 'completed';
      const isFullyGraded = allMcq && gradedCount > 0;

      // Update attempt status
      const { error } = await supabase
        .from('assessment_attempts')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          time_spent_seconds: timeSpent,
          review_status: reviewStatus,
          // Store score for fully MCQ papers
          ...(isFullyGraded && {
            score: totalScore,
            max_score: maxScore,
            percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
            graded_at: new Date().toISOString()
          })
        })
        .eq('id', attemptId);

      if (error) throw error;

      // Mark as closed to prevent re-entry
      await supabase
        .from('assessment_attempts')
        .update({
          status: 'closed',
          completed_at: new Date().toISOString()
        })
        .eq('id', attemptId)
        .eq('status', 'submitted');

      // Clear flags from local storage
      localStorage.removeItem(`flags_${attemptId}`);

      const submissionMessage = isFullyGraded
        ? `Your answers have been graded. Score: ${totalScore}/${maxScore} (${Math.round((totalScore / maxScore) * 100)}%)`
        : needsReview 
          ? 'Your answers have been submitted for review. MCQ questions were auto-graded.'
          : 'Your answers have been saved.';

      toast({
        title: isFullyGraded ? 'Graded!' : 'Submitted!',
        description: submissionMessage
      });

      // Navigate to results
      router.push(`/student/papers/${paperId}/results?attempt=${attemptId}`);
    } catch (error: any) {
      console.error('Error submitting:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit. Please try again.'
      });
    } finally {
      setSubmitting(false);
      setSubmitDialogOpen(false);
      setTimeUpDialogOpen(false);
    }
  }

  function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // Current question group (all parts of current question number)
  const currentGroup = questionGroups[currentQuestionIndex];
  const currentQuestionNumber = currentGroup?.[0];
  const currentQuestionParts = currentGroup?.[1] || [];
  
  // Count answered questions - use needs_answer field if available, fallback to marks > 0
  const answerableQuestions = questions.filter(q => 
    q.needs_answer === true || (q.needs_answer !== false && q.marks > 0)
  );
  const answeredCount = answerableQuestions.filter(q => {
    const ans = answers.get(q.id);
    return ans && (ans.answer_text || ans.selected_option);
  }).length;
  const totalAnswerableParts = answerableQuestions.length;
  const progress = totalAnswerableParts > 0 ? (answeredCount / totalAnswerableParts) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!paper || questionGroups.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Session not found</h3>
        <Button onClick={() => router.push('/student/papers')}>
          Back to Papers
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Exit & Paper Title */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setExitDialogOpen(true)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Exit
              </Button>
              <div className="hidden sm:block">
                <p className="text-sm font-medium truncate max-w-[200px]">{paper?.title}</p>
                <p className="text-xs text-muted-foreground">
                  {attempt?.practice_mode === 'timed' ? 'Timed Exam' : 'Practice Mode'}
                </p>
              </div>
            </div>

            {/* Center: Timer & Progress */}
            <div className="flex items-center gap-4">
              {attempt?.practice_mode === 'timed' && timeRemaining !== null && (
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-bold shadow-sm",
                  timerWarning 
                    ? "bg-red-100 text-red-700 animate-pulse" 
                    : "bg-primary/10 text-primary"
                )}>
                  <Clock className={cn("h-5 w-5", timerWarning && "animate-bounce")} />
                  {formatTime(timeRemaining)}
                </div>
              )}
              <div className="hidden md:flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm font-medium">
                    {answeredCount}/{totalAnswerableParts}
                  </span>
                  <p className="text-xs text-muted-foreground">answered</p>
                </div>
                <Progress value={progress} className="w-32 h-2" />
              </div>
            </div>

            {/* Right: Submit */}
            <Button 
              onClick={() => setSubmitDialogOpen(true)}
              disabled={submitting}
              className="shadow-sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Horizontal Question Navigator - At the top like topical questions */}
        <Card className="mb-6">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground shrink-0">Questions</span>
              <div className="flex-1 overflow-x-auto">
                <div className="flex gap-2 pb-1">
                  {questionGroups.map(([qNum, parts], idx) => {
                    const isAnyAnswered = parts.some(p => {
                      const ans = answers.get(p.id);
                      return ans && (ans.answer_text || ans.selected_option);
                    });
                    const answerableParts = parts.filter(p => p.marks > 0);
                    const allAnswered = answerableParts.length > 0 && answerableParts.every(p => {
                      const ans = answers.get(p.id);
                      return ans && (ans.answer_text || ans.selected_option);
                    });
                    const isFlagged = parts.some(p => flaggedQuestions.has(p.id));
                    const isCurrent = idx === currentQuestionIndex;

                    return (
                      <button
                        key={qNum}
                        onClick={() => navigateToQuestion(idx)}
                        disabled={saving}
                        className={cn(
                          "w-9 h-9 rounded border text-sm font-medium transition-colors relative shrink-0",
                          isCurrent && "border-primary bg-primary/10 text-primary ring-1 ring-primary",
                          allAnswered && !isCurrent && "bg-green-50 border-green-200 text-green-700",
                          isAnyAnswered && !allAnswered && !isCurrent && "bg-yellow-50 border-yellow-200 text-yellow-700",
                          !isAnyAnswered && !isCurrent && "bg-background border-muted-foreground/20 hover:border-muted-foreground/40",
                          isFlagged && "ring-1 ring-yellow-500"
                        )}
                      >
                        {qNum}
                        {isFlagged && (
                          <Flag className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500 fill-yellow-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Question Area - Full width now */}
        <div>
            <Card className="shadow-lg border-2">
              <CardContent className="pt-6">
                {/* Full Question with All Parts */}
                <FullQuestionView
                  questionParts={currentQuestionParts}
                  answers={answers}
                  onAnswerChange={handleAnswerChange}
                />

                {/* Saving indicator */}
                {saving && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t mt-6">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigateToQuestion(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0 || saving}
                    className="min-w-[120px]"
                  >
                    <ChevronLeft className="h-5 w-5 mr-2" />
                    Previous
                  </Button>

                  <div className="flex flex-col items-center">
                    <span className="text-lg font-semibold">
                      Question {currentQuestionNumber} of {questionGroups.length}
                    </span>
                    <Progress value={((currentQuestionIndex + 1) / questionGroups.length) * 100} className="w-24 h-1 mt-1" />
                  </div>

                  {currentQuestionIndex === questionGroups.length - 1 ? (
                    <Button
                      size="lg"
                      onClick={() => setSubmitDialogOpen(true)}
                      disabled={saving}
                      className="min-w-[120px] bg-green-600 hover:bg-green-700"
                    >
                      {saving ? 'Saving...' : 'Finish'}
                      <CheckCircle className="h-5 w-5 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="lg"
                      onClick={() => navigateToQuestion(Math.min(questionGroups.length - 1, currentQuestionIndex + 1))}
                      disabled={saving}
                      className="min-w-[120px]"
                    >
                      {saving ? 'Saving...' : 'Next'}
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your answers?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} of {totalAnswerableParts} question parts.
              {flaggedQuestions.size > 0 && (
                <span className="block mt-2 text-yellow-600">
                  You have {flaggedQuestions.size} flagged question(s) for review.
                </span>
              )}
              {answeredCount < totalAnswerableParts && (
                <span className="block mt-2 text-red-600">
                  {totalAnswerableParts - answeredCount} question part(s) are unanswered.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Practice</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Time Up Dialog */}
      <AlertDialog open={timeUpDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Time's Up!</AlertDialogTitle>
            <AlertDialogDescription>
              Your time has expired. Your answers will be submitted automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Answers'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit practice session?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress has been saved. You can continue this session later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Practice</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(`/student/papers/${paperId}`)}>
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
