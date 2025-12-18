'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  BookOpen,
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Award,
  TrendingUp,
  FileText,
  ExternalLink,
  Save,
  Loader2
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PastPaper, PaperQuestion, PaperAttemptAnswer } from '@/types/paper-practice';

export default function PaperResultsPage() {
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
  const [answers, setAnswers] = useState<Map<string, PaperAttemptAnswer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showMarkScheme, setShowMarkScheme] = useState(false);
  const [selfScore, setSelfScore] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!attemptId) {
      router.push(`/student/papers/${paperId}`);
      return;
    }
    fetchData();
  }, [paperId, attemptId]);

  async function fetchData() {
    try {
      // Fetch paper
      const { data: paperData, error: paperError } = await supabase
        .from('past_papers')
        .select('*, subjects(id, name, slug)')
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
      setSelfScore(attemptData.self_score);
      setNotes(attemptData.notes || '');

      // Fetch answers
      const { data: answersData } = await supabase
        .from('paper_attempt_answers')
        .select('*')
        .eq('attempt_id', attemptId);

      const answersMap = new Map();
      (answersData || []).forEach((answer: any) => {
        answersMap.set(answer.paper_question_id, answer);
      });
      setAnswers(answersMap);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load results'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSelfAssessment() {
    if (!attemptId) return;
    setSaving(true);

    try {
      const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
      const percentage = selfScore !== null ? (selfScore / totalMarks) * 100 : null;

      const { error } = await supabase
        .from('assessment_attempts')
        .update({
          self_score: selfScore,
          percentage: percentage,
          notes: notes,
          status: 'graded'
        })
        .eq('id', attemptId);

      if (error) throw error;

      toast({
        title: 'Saved!',
        description: 'Your self-assessment has been saved.'
      });
    } catch (error: any) {
      console.error('Error saving:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save self-assessment'
      });
    } finally {
      setSaving(false);
    }
  }

  function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  }

  function getAnswerStatus(question: PaperQuestion, answer: PaperAttemptAnswer | undefined) {
    if (!answer || (!answer.answer_text && !answer.selected_option)) {
      return 'unanswered';
    }
    
    if (question.question_type === 'mcq' && question.correct_answer) {
      return answer.selected_option === question.correct_answer ? 'correct' : 'incorrect';
    }
    
    return 'answered';
  }

  // Calculate stats
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const answeredCount = questions.filter(q => {
    const ans = answers.get(q.id);
    return ans && (ans.answer_text || ans.selected_option);
  }).length;
  
  const mcqQuestions = questions.filter(q => q.question_type === 'mcq' && q.correct_answer);
  const mcqCorrect = mcqQuestions.filter(q => {
    const ans = answers.get(q.id);
    return ans?.selected_option === q.correct_answer;
  }).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!paper || !attempt) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Results not found</h3>
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
          onClick={() => router.push(`/student/papers/${paperId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Paper
        </Button>
      </div>

      {/* Results Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Award className="h-6 w-6 text-primary" />
                Practice Results
              </CardTitle>
              <CardDescription className="mt-1">
                {paper.title}
              </CardDescription>
            </div>
            <Badge variant={attempt.practice_mode === 'timed' ? 'default' : 'secondary'}>
              {attempt.practice_mode === 'timed' ? 'Timed' : 'Untimed'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-muted rounded-lg">
              <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{answeredCount}/{questions.length}</p>
              <p className="text-sm text-muted-foreground">Answered</p>
            </div>
            {mcqQuestions.length > 0 && (
              <div className="text-center p-4 bg-muted rounded-lg">
                <CheckCircle className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">{mcqCorrect}/{mcqQuestions.length}</p>
                <p className="text-sm text-muted-foreground">MCQ Correct</p>
              </div>
            )}
            <div className="text-center p-4 bg-muted rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {attempt.time_spent_seconds ? formatTime(attempt.time_spent_seconds) : '—'}
              </p>
              <p className="text-sm text-muted-foreground">Time Spent</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalMarks}</p>
              <p className="text-sm text-muted-foreground">Total Marks</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Completion</span>
              <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
            </div>
            <Progress value={(answeredCount / questions.length) * 100} className="h-3" />
          </div>

          {/* Resource Links */}
          <div className="flex flex-wrap gap-2">
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
        </CardContent>
      </Card>

      {/* Self Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Self Assessment
          </CardTitle>
          <CardDescription>
            Mark your own work using the mark scheme and record your score
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Your Score</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max={totalMarks}
                  value={selfScore ?? ''}
                  onChange={(e) => setSelfScore(e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Enter your score"
                  className="w-32"
                />
                <span className="text-muted-foreground">/ {totalMarks}</span>
                {selfScore !== null && (
                  <Badge variant="secondary" className="ml-2">
                    {Math.round((selfScore / totalMarks) * 100)}%
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes & Reflections</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you learn? What topics need more practice?"
              rows={3}
            />
          </div>
          <Button onClick={handleSaveSelfAssessment} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Save Self Assessment
          </Button>
        </CardContent>
      </Card>

      {/* Toggle Mark Scheme */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setShowMarkScheme(!showMarkScheme)}
        >
          {showMarkScheme ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Hide Mark Schemes
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Show Mark Schemes
            </>
          )}
        </Button>
      </div>

      {/* Questions Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Question Review</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-2">
            {questions.map((question, idx) => {
              const answer = answers.get(question.id);
              const status = getAnswerStatus(question, answer);

              return (
                <AccordionItem 
                  key={question.id} 
                  value={question.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                        status === 'correct' && "bg-green-100 text-green-700",
                        status === 'incorrect' && "bg-red-100 text-red-700",
                        status === 'answered' && "bg-blue-100 text-blue-700",
                        status === 'unanswered' && "bg-gray-100 text-gray-500"
                      )}>
                        {question.question_number}
                        {question.part_label}
                      </div>
                      <div className="flex-1">
                        <p className="line-clamp-1 text-sm">
                          {question.question_text?.substring(0, 100)}...
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                      </Badge>
                      {status === 'correct' && <CheckCircle className="h-5 w-5 text-green-500" />}
                      {status === 'incorrect' && <XCircle className="h-5 w-5 text-red-500" />}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4 space-y-4">
                    {/* Question */}
                    <div>
                      <h4 className="font-medium mb-2">Question</h4>
                      <p className="whitespace-pre-wrap text-sm bg-muted p-3 rounded">
                        {question.question_text}
                      </p>
                      {question.image_url && (
                        <img 
                          src={question.image_url} 
                          alt="Question diagram" 
                          className="mt-2 max-h-48 rounded border"
                        />
                      )}
                    </div>

                    {/* Your Answer */}
                    <div>
                      <h4 className="font-medium mb-2">Your Answer</h4>
                      {answer?.answer_text || answer?.selected_option ? (
                        <div className={cn(
                          "p-3 rounded border-2",
                          status === 'correct' && "border-green-500 bg-green-50",
                          status === 'incorrect' && "border-red-500 bg-red-50",
                          status === 'answered' && "border-blue-500 bg-blue-50"
                        )}>
                          {question.question_type === 'mcq' ? (
                            <p className="font-medium">
                              {answer.selected_option}. {
                                question.options?.find(o => o.label === answer.selected_option)?.text
                              }
                            </p>
                          ) : (
                            <p className="whitespace-pre-wrap">{answer.answer_text}</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic">No answer provided</p>
                      )}
                    </div>

                    {/* Correct Answer (for MCQ) */}
                    {question.question_type === 'mcq' && question.correct_answer && (
                      <div>
                        <h4 className="font-medium mb-2 text-green-700">Correct Answer</h4>
                        <div className="p-3 rounded bg-green-50 border border-green-200">
                          <p className="font-medium">
                            {question.correct_answer}. {
                              question.options?.find(o => o.label === question.correct_answer)?.text
                            }
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Mark Scheme */}
                    {showMarkScheme && question.mark_scheme && (
                      <div>
                        <h4 className="font-medium mb-2 text-purple-700">Mark Scheme</h4>
                        <div className="p-3 rounded bg-purple-50 border border-purple-200">
                          <p className="whitespace-pre-wrap text-sm">{question.mark_scheme}</p>
                        </div>
                      </div>
                    )}

                    {/* Model Answer */}
                    {showMarkScheme && question.correct_answer && question.question_type !== 'mcq' && (
                      <div>
                        <h4 className="font-medium mb-2 text-green-700">Model Answer</h4>
                        <div className="p-3 rounded bg-green-50 border border-green-200">
                          <p className="whitespace-pre-wrap text-sm">{question.correct_answer}</p>
                        </div>
                      </div>
                    )}

                    {/* Examiner Tips */}
                    {showMarkScheme && question.examiner_tips && (
                      <div>
                        <h4 className="font-medium mb-2 text-amber-700">Examiner Tips</h4>
                        <div className="p-3 rounded bg-amber-50 border border-amber-200">
                          <p className="whitespace-pre-wrap text-sm">{question.examiner_tips}</p>
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => router.push(`/student/papers/${paperId}`)}>
          Try Again
        </Button>
        <Button onClick={() => router.push('/student/papers')}>
          Back to Papers
        </Button>
      </div>
    </div>
  );
}
