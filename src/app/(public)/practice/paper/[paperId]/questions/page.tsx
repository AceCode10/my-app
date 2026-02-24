'use client';

import React, { useEffect, useState, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Clock, 
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  Flag,
  Eye,
  EyeOff,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { AnswerInput } from '@/components/assessment/AnswerInput';
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
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface Question {
  id: string;
  question_number: string;
  part_label?: string | null;
  stem_markdown?: string;
  stem_md?: string;
  marks: number;
  question_type: string;
  options?: any;
  correct_answer?: any;
  mark_scheme?: string;
  parent_question_id?: string | null;
  display_order?: number;
  context_text?: string;
}

interface Paper {
  id: string;
  title: string;
  duration_minutes?: number;
  total_marks?: number;
  subjects?: { name: string; slug: string };
}

interface QuestionStatus {
  answered: boolean;
  answer: string;
  flagged: boolean;
  showAnswer: boolean;
}

export default function PaperQuestionsPage({ 
  params 
}: { 
  params: Promise<{ paperId: string }>
}) {
  const { paperId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const attemptId = searchParams.get('attempt');
  const supabase = createClient();
  const { toast } = useToast();
  
  const [paper, setPaper] = useState<Paper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionStatus>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch paper and questions
  useEffect(() => {
    fetchData();
  }, [paperId]);

  // Timer
  useEffect(() => {
    if (timeRemaining <= 0 || isPaused) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowSubmitDialog(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining, isPaused]);

  async function fetchData() {
    try {
      setIsLoading(true);
      
      // Fetch paper
      const { data: paperData, error: paperError } = await supabase
        .from('past_papers')
        .select('id, title, duration_minutes, total_marks, subjects:subject_id(name, slug)')
        .eq('id', paperId)
        .single();

      if (paperError) throw paperError;
      setPaper(paperData);
      setTimeRemaining((paperData.duration_minutes || 60) * 60);

      // Fetch questions - only answerable ones (marks > 0)
      const { data: questionsData, error: questionsError } = await supabase
        .from('paper_questions')
        .select('*')
        .eq('paper_id', paperId)
        .gt('marks', 0)
        .order('display_order', { ascending: true });

      if (questionsError) throw questionsError;

      // Group questions: attach parent context to children
      const parentQuestions = (questionsData || []).filter(q => !q.parent_question_id);
      const childQuestions = (questionsData || []).filter(q => q.parent_question_id);
      
      const processedQuestions: Question[] = [];
      const parentContextMap = new Map<string, string>();
      
      // Build parent context map
      parentQuestions.forEach(p => {
        if (p.marks === 0) {
          // This is a context-only parent
          parentContextMap.set(p.id, p.stem_markdown || p.stem_md || '');
        }
      });
      
      // Process questions
      parentQuestions.forEach(parent => {
        const children = childQuestions
          .filter(c => c.parent_question_id === parent.id)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        
        if (children.length > 0) {
          // Parent has children - attach context to each child
          const parentContext = parent.stem_markdown || parent.stem_md || '';
          children.forEach(child => {
            if (child.marks > 0) {
              processedQuestions.push({
                ...child,
                context_text: parentContext
              });
            }
          });
        } else if (parent.marks > 0) {
          // Standalone question with marks
          processedQuestions.push(parent);
        }
      });
      
      // Add orphaned children
      const usedIds = new Set(processedQuestions.map(q => q.id));
      childQuestions.forEach(child => {
        if (!usedIds.has(child.id) && child.marks > 0) {
          processedQuestions.push(child);
        }
      });

      setQuestions(processedQuestions);
      
      // Initialize statuses
      const statuses: Record<string, QuestionStatus> = {};
      processedQuestions.forEach(q => {
        statuses[q.id] = { answered: false, answer: '', flagged: false, showAnswer: false };
      });
      setQuestionStatuses(statuses);
      
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  }

  const currentQuestion = questions[currentIndex];
  
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    const totalSeconds = (paper?.duration_minutes || 60) * 60;
    const percentRemaining = (timeRemaining / totalSeconds) * 100;
    if (percentRemaining <= 10) return 'text-red-600';
    if (percentRemaining <= 25) return 'text-orange-500';
    return 'text-foreground';
  };

  const handleAnswerChange = (answer: string) => {
    if (!currentQuestion) return;
    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        answer,
        answered: answer.trim().length > 0
      }
    }));
  };

  const handleToggleFlag = () => {
    if (!currentQuestion) return;
    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        flagged: !prev[currentQuestion.id]?.flagged
      }
    }));
  };

  const handleToggleAnswer = () => {
    if (!currentQuestion) return;
    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.id]: {
        ...prev[currentQuestion.id],
        showAnswer: !prev[currentQuestion.id]?.showAnswer
      }
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const totalSeconds = (paper?.duration_minutes || 60) * 60;
      const timeSpent = totalSeconds - timeRemaining;
      
      // Update attempt if exists
      if (attemptId) {
        await supabase
          .from('assessment_attempts')
          .update({
            submitted_at: new Date().toISOString(),
            time_spent_seconds: timeSpent,
            status: 'submitted'
          })
          .eq('id', attemptId);
      }
      
      toast({ title: 'Exam Submitted', description: `Time spent: ${formatTime(timeSpent)}` });
      router.push(`/practice/paper/${paperId}/results?time=${timeSpent}${attemptId ? `&attempt=${attemptId}` : ''}`);
    } catch (err) {
      console.error('Error submitting:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit' });
    } finally {
      setIsSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const handleExit = async () => {
    if (attemptId) {
      const totalSeconds = (paper?.duration_minutes || 60) * 60;
      const timeSpent = totalSeconds - timeRemaining;
      await supabase
        .from('assessment_attempts')
        .update({ status: 'abandoned', time_spent_seconds: timeSpent })
        .eq('id', attemptId);
    }
    router.push(`/practice/paper/${paperId}`);
  };

  const answeredCount = Object.values(questionStatuses).filter(s => s.answered).length;
  const flaggedCount = Object.values(questionStatuses).filter(s => s.flagged).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error || !paper || questions.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-muted-foreground mb-6">{error || 'No questions found for this paper'}</p>
          <Button onClick={() => router.back()}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setShowExitDialog(true)}>
            <X className="w-4 h-4 mr-2" />
            Exit
          </Button>
          <div className="hidden md:block">
            <h1 className="font-semibold text-foreground line-clamp-1">{paper.title}</h1>
            <p className="text-xs text-muted-foreground">
              {paper.subjects?.name} • {answeredCount}/{questions.length} answered
              {flaggedCount > 0 && ` • ${flaggedCount} flagged`}
            </p>
          </div>
        </div>
        
        {/* Timer */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 ${getTimeColor()}`}>
            <Clock className="w-5 h-5" />
            <span className="text-2xl font-mono font-bold">{formatTime(timeRemaining)}</span>
          </div>
          <Button size="sm" onClick={() => setShowSubmitDialog(true)}>
            <Send className="w-4 h-4 mr-2" />
            Submit
          </Button>
        </div>
      </div>
      
      {/* Progress */}
      <Progress value={progressPercent} className="h-1 rounded-none" />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto">
          {/* Question Navigator */}
          <div className="flex flex-wrap gap-1 mb-4 p-2 bg-muted/50 rounded-lg">
            {questions.map((q, idx) => {
              const status = questionStatuses[q.id];
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 text-xs font-medium rounded transition-colors
                    ${idx === currentIndex ? 'ring-2 ring-primary ring-offset-1' : ''}
                    ${status?.answered ? 'bg-green-500 text-white' : 'bg-background border'}
                    ${status?.flagged ? 'ring-2 ring-orange-500' : ''}
                  `}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
          
          {/* Question Card */}
          {currentQuestion && (
            <Card>
              <CardContent className="pt-6">
                {/* Question Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      Q{currentQuestion.question_number}
                      {currentQuestion.part_label && currentQuestion.part_label}
                    </Badge>
                    <Badge variant="secondary">
                      {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleFlag}
                      className={questionStatuses[currentQuestion.id]?.flagged ? 'text-orange-500' : ''}
                    >
                      <Flag className="w-4 h-4" />
                    </Button>
                    {currentQuestion.mark_scheme && (
                      <Button variant="ghost" size="sm" onClick={handleToggleAnswer}>
                        {questionStatuses[currentQuestion.id]?.showAnswer ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Context (if any) */}
                {currentQuestion.context_text && (
                  <div className="mb-4 p-3 bg-muted/30 rounded-lg border-l-4 border-primary/30">
                    <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">
                      {currentQuestion.context_text}
                    </p>
                  </div>
                )}
                
                {/* Question Text */}
                <div className="prose prose-sm max-w-none dark:prose-invert mb-6">
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {currentQuestion.stem_markdown || currentQuestion.stem_md || ''}
                  </ReactMarkdown>
                </div>
                
                {/* Answer Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Your Answer:</label>
                  <AnswerInput
                    value={questionStatuses[currentQuestion.id]?.answer || ''}
                    onChange={handleAnswerChange}
                    placeholder="Type your answer here..."
                    showFormatting={true}
                    autoResize={true}
                    maxHeight={400}
                    className="min-h-[120px]"
                  />
                </div>
                
                {/* Mark Scheme (if showing) */}
                {questionStatuses[currentQuestion.id]?.showAnswer && currentQuestion.mark_scheme && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-green-800 dark:text-green-200">Mark Scheme</span>
                    </div>
                    <div className="prose prose-sm max-w-none text-green-900 dark:text-green-100">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {currentQuestion.mark_scheme}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                
                {/* Navigation */}
                <div className="flex justify-between mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                  <Button
                    onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                    disabled={currentIndex === questions.length - 1}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Submit Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} of {questions.length} questions.
              {flaggedCount > 0 && ` ${flaggedCount} questions are flagged for review.`}
              {timeRemaining > 0 && ` You still have ${formatTime(timeRemaining)} remaining.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Exit Dialog */}
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
            <AlertDialogAction onClick={handleExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Exit Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
