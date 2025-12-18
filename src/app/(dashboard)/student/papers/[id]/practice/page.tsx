'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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

  // Navigation
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());

  // Local answer state (not saved until navigation)
  const [localAnswer, setLocalAnswer] = useState<{ text: string | null; option: string | null }>({ text: null, option: null });

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

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('paper_questions')
        .select('*')
        .eq('paper_id', paperId)
        .order('question_number', { ascending: true })
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

      // Check if attempt is already submitted - redirect to results
      if (attemptData.status === 'submitted' || attemptData.status === 'completed') {
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

  // Save current answer and navigate
  async function saveAndNavigate(newIndex: number) {
    if (currentQuestion) {
      await saveAnswerToDb(currentQuestion.id, localAnswer.text, localAnswer.option);
    }
    setCurrentIndex(newIndex);
    // Reset local answer for new question
    const nextQuestion = questions[newIndex];
    if (nextQuestion) {
      const existingAnswer = answers.get(nextQuestion.id);
      setLocalAnswer({
        text: existingAnswer?.answer_text || null,
        option: existingAnswer?.selected_option || null
      });
    }
  }

  // Update local answer (no database call)
  function updateLocalAnswer(answerText: string | null, selectedOption: string | null) {
    setLocalAnswer({ text: answerText, option: selectedOption });
  }

  // Initialize local answer when question changes
  useEffect(() => {
    const question = questions[currentIndex];
    if (question) {
      const existingAnswer = answers.get(question.id);
      setLocalAnswer({
        text: existingAnswer?.answer_text || null,
        option: existingAnswer?.selected_option || null
      });
    }
  }, [currentIndex, questions, answers]);

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
      // Save current answer first
      if (currentQuestion) {
        await saveAnswerToDb(currentQuestion.id, localAnswer.text, localAnswer.option);
      }

      // Calculate time spent
      const startTime = new Date(attempt.started_at).getTime();
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);

      // Update attempt status
      const { error } = await supabase
        .from('assessment_attempts')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          time_spent_seconds: timeSpent
        })
        .eq('id', attemptId);

      if (error) throw error;

      // Clear flags from local storage
      localStorage.removeItem(`flags_${attemptId}`);

      toast({
        title: 'Submitted!',
        description: 'Your answers have been saved.'
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

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : null;
  const answeredCount = questions.filter(q => {
    const ans = answers.get(q.id);
    return ans && (ans.answer_text || ans.selected_option);
  }).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!paper || !currentQuestion) {
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
                    {answeredCount}/{questions.length}
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question Navigator (Sidebar) */}
          <div className="hidden lg:block">
            <Card className="sticky top-24">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, idx) => {
                    const ans = answers.get(q.id);
                    const isAnswered = ans && (ans.answer_text || ans.selected_option);
                    const isFlagged = flaggedQuestions.has(q.id);
                    const isCurrent = idx === currentIndex;

                    return (
                      <button
                        key={q.id}
                        onClick={() => saveAndNavigate(idx)}
                        disabled={saving}
                        className={cn(
                          "w-8 h-8 rounded text-sm font-medium transition-colors relative",
                          isCurrent && "ring-2 ring-primary",
                          isAnswered && !isCurrent && "bg-green-100 text-green-700",
                          !isAnswered && !isCurrent && "bg-muted hover:bg-muted-foreground/20",
                          isFlagged && "ring-2 ring-yellow-500"
                        )}
                      >
                        {q.question_number}
                        {q.part_label && <span className="text-xs">{q.part_label}</span>}
                        {isFlagged && (
                          <Flag className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500 fill-yellow-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-muted rounded" />
                    <span>Not answered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flag className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <span>Flagged for review</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg border-2">
              <CardHeader className="bg-muted/30">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default" className="text-base px-3 py-1">
                        Q{currentQuestion.question_number}
                        {currentQuestion.part_label && ` (${currentQuestion.part_label})`}
                      </Badge>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                      </Badge>
                      {currentQuestion.section_name && (
                        <Badge variant="outline">{currentQuestion.section_name}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant={flaggedQuestions.has(currentQuestion.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleFlag(currentQuestion.id)}
                    className={cn(
                      "transition-all",
                      flaggedQuestions.has(currentQuestion.id) 
                        ? "bg-yellow-500 hover:bg-yellow-600 text-white" 
                        : "hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-300"
                    )}
                  >
                    <Flag className={cn("h-4 w-4", flaggedQuestions.has(currentQuestion.id) && "fill-white")} />
                    <span className="ml-1 hidden sm:inline">
                      {flaggedQuestions.has(currentQuestion.id) ? 'Flagged' : 'Flag'}
                    </span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Question Text */}
                <div className="prose prose-lg max-w-none">
                  <p className="whitespace-pre-wrap text-foreground leading-relaxed">{currentQuestion.question_text}</p>
                </div>

                {/* Question Image */}
                {currentQuestion.image_url && (
                  <div className="rounded-lg border overflow-hidden">
                    <img
                      src={currentQuestion.image_url}
                      alt="Question diagram"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                  </div>
                )}

                {/* Answer Input */}
                <div className="pt-4 border-t">
                  {currentQuestion.question_type === 'mcq' && currentQuestion.options ? (
                    <RadioGroup
                      value={localAnswer.option || ''}
                      onValueChange={(value) => updateLocalAnswer(null, value)}
                      className="space-y-3"
                    >
                      {currentQuestion.options.map((option, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer",
                            localAnswer.option === option.label
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/50"
                          )}
                          onClick={() => updateLocalAnswer(null, option.label)}
                        >
                          <RadioGroupItem value={option.label} id={`option-${idx}`} />
                          <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer font-normal">
                            <span className="font-medium mr-2">{option.label}.</span>
                            {option.text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : currentQuestion.question_type === 'true_false' ? (
                    <RadioGroup
                      value={localAnswer.text || ''}
                      onValueChange={(value) => updateLocalAnswer(value, null)}
                      className="space-y-3"
                    >
                      {['True', 'False'].map((option) => (
                        <div
                          key={option}
                          className={cn(
                            "flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors cursor-pointer",
                            localAnswer.text === option
                              ? "border-primary bg-primary/5"
                              : "border-muted hover:border-muted-foreground/50"
                          )}
                          onClick={() => updateLocalAnswer(option, null)}
                        >
                          <RadioGroupItem value={option} id={option} />
                          <Label htmlFor={option} className="cursor-pointer font-medium">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : currentQuestion.question_type === 'short_answer' || currentQuestion.question_type === 'calculation' ? (
                    <div className="space-y-2">
                      <Label>Your Answer</Label>
                      <Input
                        value={localAnswer.text || ''}
                        onChange={(e) => updateLocalAnswer(e.target.value, null)}
                        placeholder="Type your answer here"
                        className="text-lg"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Your Answer</Label>
                      <Textarea
                        value={localAnswer.text || ''}
                        onChange={(e) => updateLocalAnswer(e.target.value, null)}
                        placeholder="Write your answer here..."
                        rows={8}
                        className="resize-none"
                      />
                      <p className="text-sm text-muted-foreground">
                        {(localAnswer.text || '').length} characters
                      </p>
                    </div>
                  )}
                </div>

                {/* Saving indicator */}
                {saving && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-6 border-t mt-6">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => saveAndNavigate(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0 || saving}
                    className="min-w-[120px]"
                  >
                    <ChevronLeft className="h-5 w-5 mr-2" />
                    Previous
                  </Button>

                  <div className="flex flex-col items-center">
                    <span className="text-lg font-semibold">
                      {currentIndex + 1} / {questions.length}
                    </span>
                    <Progress value={((currentIndex + 1) / questions.length) * 100} className="w-24 h-1 mt-1" />
                  </div>

                  {currentIndex === questions.length - 1 ? (
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
                      onClick={() => saveAndNavigate(Math.min(questions.length - 1, currentIndex + 1))}
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

            {/* Mobile Question Navigator */}
            <div className="lg:hidden mt-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-2">
                    {questions.map((q, idx) => {
                      const ans = answers.get(q.id);
                      const isAnswered = ans && (ans.answer_text || ans.selected_option);
                      const isFlagged = flaggedQuestions.has(q.id);
                      const isCurrent = idx === currentIndex;

                      return (
                        <button
                          key={q.id}
                          onClick={() => saveAndNavigate(idx)}
                          disabled={saving}
                          className={cn(
                            "w-8 h-8 rounded text-sm font-medium transition-colors relative",
                            isCurrent && "ring-2 ring-primary",
                            isAnswered && !isCurrent && "bg-green-100 text-green-700",
                            !isAnswered && !isCurrent && "bg-muted",
                            isFlagged && "ring-2 ring-yellow-500"
                          )}
                        >
                          {q.question_number}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit your answers?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} of {questions.length} questions.
              {flaggedQuestions.size > 0 && (
                <span className="block mt-2 text-yellow-600">
                  You have {flaggedQuestions.size} flagged question(s) for review.
                </span>
              )}
              {answeredCount < questions.length && (
                <span className="block mt-2 text-red-600">
                  {questions.length - answeredCount} question(s) are unanswered.
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
