'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { gradingService } from '@/lib/grading/grading-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  Send,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  MessageSquare,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface Question {
  id: string;
  stem_markdown: string;
  question_type: string;
  marks: number;
  correct_answer: string | null;
  explanation: string | null;
  choices?: {
    id: string;
    choice_text: string;
    is_correct: boolean;
  }[];
}

interface GradingDetail {
  question_id: string;
  is_correct: boolean | null;
  marks_awarded: number;
  max_marks: number;
  auto_graded: boolean;
  needs_manual_grading: boolean;
  confidence: number;
  feedback?: string;
}

interface Attempt {
  id: string;
  user_id: string;
  test_id: string;
  assignment_id: string;
  status: string;
  answers: Record<string, any>;
  grading_details: GradingDetail[];
  total_score: number | null;
  max_score: number | null;
  percentage: number | null;
  started_at: string;
  submitted_at: string | null;
  requires_manual_grading: boolean;
  user?: {
    id: string;
    display_name: string;
    email: string;
  };
}

export default function GradeAttemptPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;
  const attemptId = params.attemptId as string;
  const { user } = useUser();
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [autoGrading, setAutoGrading] = useState(false);

  // Local grading state
  const [localGrades, setLocalGrades] = useState<Map<string, { marks: number | null; feedback: string }>>(new Map());
  const [overallFeedback, setOverallFeedback] = useState('');

  useEffect(() => {
    if (user && attemptId) {
      fetchData();
    }
  }, [user, attemptId]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('test_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();

      if (attemptError) throw attemptError;

      // Fetch user
      const { data: userData } = await supabase
        .from('users')
        .select('id, display_name, email')
        .eq('id', attemptData.user_id)
        .single();

      setAttempt({
        ...attemptData,
        user: userData
      });

      setOverallFeedback(attemptData.teacher_feedback || '');

      // Fetch test questions
      const testIdToUse = attemptData.test_id;
      
      // Try assessment_questions first (new test builder)
      let { data: aqData } = await supabase
        .from('assessment_questions')
        .select(`
          *,
          question:questions(
            *,
            choices:question_choices(*)
          )
        `)
        .eq('assessment_id', testIdToUse)
        .order('question_order');

      if (aqData && aqData.length > 0) {
        const questionsData = aqData.map(aq => ({
          ...aq.question,
          custom_marks: aq.custom_marks
        }));
        setQuestions(questionsData);
      } else {
        // Fallback to test_questions (old structure)
        const { data: tqData } = await supabase
          .from('test_questions')
          .select(`
            *,
            question:questions(
              *,
              choices:question_choices(*)
            )
          `)
          .eq('test_id', testIdToUse)
          .order('question_order');

        if (tqData) {
          const questionsData = tqData.map(tq => ({
            ...tq.question,
            custom_marks: tq.custom_marks
          }));
          setQuestions(questionsData);
        }
      }

      // Initialize local grades from existing grading details
      const grades = new Map<string, { marks: number | null; feedback: string }>();
      const gradingDetails = attemptData.grading_details || [];
      
      for (const detail of gradingDetails) {
        grades.set(detail.question_id, {
          marks: detail.marks_awarded,
          feedback: detail.feedback || ''
        });
      }
      
      setLocalGrades(grades);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load attempt data'
      });
      router.push(`/teacher/tests/${testId}/results`);
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoGrade() {
    setAutoGrading(true);
    try {
      const result = await gradingService.gradeTestAttempt(attemptId);
      
      if (result) {
        toast({
          title: 'Auto-Grading Complete',
          description: `Graded ${result.auto_graded_count} questions automatically`
        });
        await fetchData();
      }
    } catch (error) {
      console.error('Error auto-grading:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to auto-grade'
      });
    } finally {
      setAutoGrading(false);
    }
  }

  async function saveQuestionGrade(questionId: string) {
    const grade = localGrades.get(questionId);
    if (!grade || grade.marks === null) return;

    setSaving(true);
    try {
      const success = await gradingService.manualGradeQuestion(
        attemptId,
        questionId,
        grade.marks,
        grade.feedback,
        user?.id
      );

      if (success) {
        toast({
          title: 'Grade Saved',
          description: 'Question grade has been saved'
        });
      } else {
        throw new Error('Failed to save grade');
      }
    } catch (error) {
      console.error('Error saving grade:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save grade'
      });
    } finally {
      setSaving(false);
    }
  }

  async function submitAllGrades() {
    setSaving(true);
    try {
      // Save all grades
      for (const [questionId, grade] of localGrades) {
        if (grade.marks !== null) {
          await gradingService.manualGradeQuestion(
            attemptId,
            questionId,
            grade.marks,
            grade.feedback,
            user?.id
          );
        }
      }

      // Update attempt with overall feedback
      await supabase
        .from('test_attempts')
        .update({
          teacher_feedback: overallFeedback,
          teacher_graded: true,
          graded_by: user?.id,
          graded_at: new Date().toISOString()
        })
        .eq('id', attemptId);

      toast({
        title: 'Grading Complete',
        description: 'All grades have been saved'
      });

      router.push(`/teacher/tests/${testId}/results`);
    } catch (error) {
      console.error('Error submitting grades:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit grades'
      });
    } finally {
      setSaving(false);
      setSubmitDialogOpen(false);
    }
  }

  const updateGrade = (questionId: string, marks: number | null, feedback?: string) => {
    setLocalGrades(prev => {
      const newGrades = new Map(prev);
      const existing = newGrades.get(questionId) || { marks: null, feedback: '' };
      newGrades.set(questionId, {
        marks: marks,
        feedback: feedback !== undefined ? feedback : existing.feedback
      });
      return newGrades;
    });
  };

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion && attempt?.answers ? attempt.answers[currentQuestion.id] : null;
  const currentGrade = currentQuestion ? localGrades.get(currentQuestion.id) : null;

  // Calculate progress
  const gradedCount = Array.from(localGrades.values()).filter(g => g.marks !== null).length;
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  const awardedMarks = Array.from(localGrades.values()).reduce((sum, g) => sum + (g.marks || 0), 0);

  const getQuestionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mcq: 'Multiple Choice',
      short_answer: 'Short Answer',
      essay: 'Essay',
      calculation: 'Calculation',
      true_false: 'True/False',
      fill_in_blank: 'Fill in Blank'
    };
    return labels[type] || type;
  };

  const getAnswerDisplay = (question: Question, answer: any) => {
    if (!answer) return <span className="text-muted-foreground italic">No answer provided</span>;

    if (question.question_type === 'mcq') {
      const selectedId = answer.selected_choice_id || answer;
      const selectedChoice = question.choices?.find(c => c.id === selectedId);
      
      if (selectedChoice) {
        return (
          <div className="flex items-center gap-2">
            <Badge variant={selectedChoice.is_correct ? 'default' : 'destructive'}>
              {selectedChoice.is_correct ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
              {selectedChoice.choice_text}
            </Badge>
          </div>
        );
      }
    }

    const textAnswer = answer.answer_text || answer.text || (typeof answer === 'string' ? answer : JSON.stringify(answer));
    return <p className="whitespace-pre-wrap">{textAnswer}</p>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-96 lg:col-span-1" />
          <Skeleton className="h-96 lg:col-span-3" />
        </div>
      </div>
    );
  }

  if (!attempt || !currentQuestion) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Attempt not found</h3>
        <Button asChild>
          <Link href={`/teacher/tests/${testId}/results`}>Back to Results</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/teacher/tests/${testId}/results`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Grade Submission</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              {attempt.user?.display_name || 'Unknown Student'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleAutoGrade}
            disabled={autoGrading}
          >
            <Sparkles className={`h-4 w-4 mr-2 ${autoGrading ? 'animate-pulse' : ''}`} />
            {autoGrading ? 'Auto-Grading...' : 'Auto-Grade'}
          </Button>
          <Button onClick={() => setSubmitDialogOpen(true)} disabled={saving}>
            <Send className="h-4 w-4 mr-2" />
            Submit Grades
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Grading Progress</span>
            <span className="text-sm font-medium">{gradedCount}/{questions.length} questions graded</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(gradedCount / questions.length) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-muted-foreground">Current Score</span>
            <span className="text-lg font-bold">{awardedMarks}/{totalMarks}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Question Navigator */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, idx) => {
                    const answer = attempt.answers?.[q.id];
                    const hasAnswer = !!answer;
                    const grade = localGrades.get(q.id);
                    const isGraded = grade?.marks !== null && grade?.marks !== undefined;
                    const isCurrent = idx === currentIndex;

                    return (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(idx)}
                        className={cn(
                          "w-8 h-8 rounded text-sm font-medium transition-colors",
                          isCurrent && "ring-2 ring-primary",
                          isGraded && !isCurrent && "bg-green-100 text-green-700",
                          hasAnswer && !isGraded && !isCurrent && "bg-blue-100 text-blue-700",
                          !hasAnswer && !isCurrent && "bg-gray-100 text-gray-500"
                        )}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 rounded" />
                  <span>Graded</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 rounded" />
                  <span>No Answer</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Grading Area */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-base px-3 py-1">
                    Q{currentIndex + 1}
                  </Badge>
                  <Badge variant="secondary">
                    {getQuestionTypeLabel(currentQuestion.question_type)}
                  </Badge>
                  <Badge variant="outline">
                    {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAnswer(!showAnswer)}
                >
                  {showAnswer ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {showAnswer ? 'Hide' : 'Show'} Answer
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question */}
              <div>
                <Label className="text-muted-foreground">Question</Label>
                <div className="mt-2 prose prose-sm max-w-none">
                  <ReactMarkdown>{currentQuestion.stem_markdown}</ReactMarkdown>
                </div>
                {currentQuestion.choices && currentQuestion.choices.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {currentQuestion.choices.map((choice, idx) => (
                      <div
                        key={choice.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          showAnswer && choice.is_correct && "bg-green-50 border-green-200"
                        )}
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                        {choice.choice_text}
                        {showAnswer && choice.is_correct && (
                          <CheckCircle className="inline h-4 w-4 ml-2 text-green-600" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Student's Answer */}
              <div>
                <Label className="text-muted-foreground">Student's Answer</Label>
                <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                  {getAnswerDisplay(currentQuestion, currentAnswer)}
                </div>
              </div>

              {/* Correct Answer / Mark Scheme */}
              {showAnswer && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <Label className="text-green-700 font-medium">Correct Answer / Mark Scheme</Label>
                  {currentQuestion.correct_answer ? (
                    <p className="mt-2 text-green-800">{currentQuestion.correct_answer}</p>
                  ) : currentQuestion.explanation ? (
                    <p className="mt-2 text-green-800">{currentQuestion.explanation}</p>
                  ) : (
                    <p className="mt-2 text-green-600 italic">No answer key available</p>
                  )}
                </div>
              )}

              <Separator />

              {/* Grading Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="marks">Marks Awarded</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="marks"
                        type="number"
                        min={0}
                        max={currentQuestion.marks}
                        value={currentGrade?.marks ?? ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : parseInt(e.target.value);
                          updateGrade(currentQuestion.id, value);
                        }}
                        className="w-24"
                      />
                      <span className="text-muted-foreground">/ {currentQuestion.marks}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateGrade(currentQuestion.id, currentQuestion.marks)}
                    >
                      Full Marks
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateGrade(currentQuestion.id, 0)}
                    >
                      Zero
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="feedback">Feedback (optional)</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Add feedback for this answer..."
                    value={currentGrade?.feedback || ''}
                    onChange={(e) => {
                      const existing = localGrades.get(currentQuestion.id);
                      updateGrade(currentQuestion.id, existing?.marks ?? null, e.target.value);
                    }}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <Button
                  variant="secondary"
                  onClick={() => saveQuestionGrade(currentQuestion.id)}
                  disabled={saving || currentGrade?.marks === null}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save This Grade
                </Button>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                  {currentIndex + 1} of {questions.length}
                </span>

                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
                  disabled={currentIndex === questions.length - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Overall Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Overall Feedback
              </CardTitle>
              <CardDescription>
                Provide general feedback for the student
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write overall feedback..."
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Grades</DialogTitle>
            <DialogDescription>
              Confirm your grading for this submission.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Final Score</p>
                <p className="text-2xl font-bold">{awardedMarks}/{totalMarks}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Percentage</p>
                <p className="text-2xl font-bold">{Math.round((awardedMarks / totalMarks) * 100)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Graded</p>
                <p className="text-2xl font-bold">{gradedCount}/{questions.length}</p>
              </div>
            </div>
            {gradedCount < questions.length && (
              <p className="text-sm text-yellow-600 mt-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Not all questions have been graded. Ungraded questions will receive 0 marks.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitAllGrades} disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Grades'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
