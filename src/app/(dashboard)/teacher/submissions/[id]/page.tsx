'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  User,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Save,
  Send,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Award,
  Eye,
  EyeOff
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
import { cn } from '@/lib/utils';

interface Answer {
  id: string;
  paper_question_id: string;
  answer_text: string | null;
  selected_option: string | null;
  marks_awarded: number | null;
  feedback: string | null;
}

interface Question {
  id: string;
  question_number: number;
  part_label: string | null;
  question_text: string;
  question_type: string;
  marks: number;
  correct_answer: string | null;
  mark_scheme: string | null;
  options: { label: string; text: string }[] | null;
}

export default function SubmissionReviewPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const submissionId = params.id as string;
  const { toast } = useToast();

  const [submission, setSubmission] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMarkScheme, setShowMarkScheme] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  // Local grading state
  const [localMarks, setLocalMarks] = useState<Map<string, number | null>>(new Map());
  const [localFeedback, setLocalFeedback] = useState<Map<string, string>>(new Map());
  const [overallFeedback, setOverallFeedback] = useState('');

  useEffect(() => {
    fetchSubmission();
  }, [submissionId]);

  async function fetchSubmission() {
    try {
      // Fetch attempt
      const { data: attemptData, error: attemptError } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (attemptError) throw attemptError;

      // Fetch user
      const { data: userData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('id', attemptData.user_id)
        .single();

      // Fetch paper
      const { data: paperData } = await supabase
        .from('past_papers')
        .select('*')
        .eq('id', attemptData.paper_id)
        .single();

      // Fetch class if exists
      let classData = null;
      if (attemptData.class_id) {
        const { data } = await supabase
          .from('classes')
          .select('id, name')
          .eq('id', attemptData.class_id)
          .single();
        classData = data;
      }

      setSubmission({
        ...attemptData,
        user: userData,
        paper: paperData,
        class: classData
      });

      setOverallFeedback(attemptData.reviewer_feedback || '');

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('paper_questions')
        .select('*')
        .eq('paper_id', attemptData.paper_id)
        .order('question_number', { ascending: true })
        .order('part_label', { ascending: true });

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Fetch answers
      const { data: answersData } = await supabase
        .from('paper_attempt_answers')
        .select('*')
        .eq('attempt_id', submissionId);

      const answersMap = new Map();
      const marksMap = new Map();
      const feedbackMap = new Map();
      
      (answersData || []).forEach((answer: any) => {
        answersMap.set(answer.paper_question_id, answer);
        marksMap.set(answer.paper_question_id, answer.marks_awarded);
        feedbackMap.set(answer.paper_question_id, answer.feedback || '');
      });
      
      setAnswers(answersMap);
      setLocalMarks(marksMap);
      setLocalFeedback(feedbackMap);

      // Mark as in_review if pending
      if (attemptData.review_status === 'pending') {
        await supabase
          .from('assessment_attempts')
          .update({ review_status: 'in_review' })
          .eq('id', submissionId);
      }
    } catch (error: any) {
      console.error('Error fetching submission:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load submission'
      });
      router.push('/teacher/submissions');
    } finally {
      setLoading(false);
    }
  }

  async function saveQuestionGrade(questionId: string) {
    const answer = answers.get(questionId);
    if (!answer) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('paper_attempt_answers')
        .update({
          marks_awarded: localMarks.get(questionId),
          feedback: localFeedback.get(questionId)
        })
        .eq('id', answer.id);

      if (error) throw error;

      toast({
        title: 'Saved',
        description: 'Grade saved successfully'
      });
    } catch (error: any) {
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

  async function submitReview() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Calculate total awarded marks
      let totalAwarded = 0;
      localMarks.forEach((marks) => {
        if (marks !== null) totalAwarded += marks;
      });

      // Save all grades
      for (const [questionId, marks] of localMarks) {
        const answer = answers.get(questionId);
        if (answer) {
          await supabase
            .from('paper_attempt_answers')
            .update({
              marks_awarded: marks,
              feedback: localFeedback.get(questionId)
            })
            .eq('id', answer.id);
        }
      }

      // Update attempt
      const { error } = await supabase
        .from('assessment_attempts')
        .update({
          review_status: 'reviewed',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          reviewer_feedback: overallFeedback,
          awarded_marks: totalAwarded
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast({
        title: 'Review Submitted',
        description: 'The submission has been reviewed and the student will be notified.'
      });

      router.push('/teacher/submissions');
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit review'
      });
    } finally {
      setSaving(false);
      setSubmitDialogOpen(false);
    }
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers.get(currentQuestion.id) : null;

  // Calculate progress
  const gradedCount = Array.from(localMarks.values()).filter(m => m !== null).length;
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const awardedMarks = Array.from(localMarks.values()).reduce((sum, m) => sum + (m || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!submission || !currentQuestion) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Submission not found</h3>
        <Button onClick={() => router.push('/teacher/submissions')}>
          Back to Submissions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/teacher/submissions')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Review Submission</h1>
            <p className="text-muted-foreground">
              {submission.user?.full_name} - {submission.paper?.title}
            </p>
          </div>
        </div>
        <Button onClick={() => setSubmitDialogOpen(true)} disabled={saving}>
          <Send className="h-4 w-4 mr-2" />
          Submit Review
        </Button>
      </div>

      {/* Student & Paper Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><span className="text-muted-foreground">Name:</span> {submission.user?.full_name}</p>
              <p><span className="text-muted-foreground">Email:</span> {submission.user?.email}</p>
              {submission.class && (
                <p><span className="text-muted-foreground">Class:</span> {submission.class.name}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Submission Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><span className="text-muted-foreground">Paper:</span> {submission.paper?.title}</p>
              <p><span className="text-muted-foreground">Submitted:</span> {new Date(submission.submitted_at).toLocaleString()}</p>
              <p><span className="text-muted-foreground">Time Spent:</span> {Math.floor((submission.time_spent_seconds || 0) / 60)} minutes</p>
            </div>
          </CardContent>
        </Card>
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
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const answer = answers.get(q.id);
                  const hasAnswer = answer && (answer.answer_text || answer.selected_option);
                  const isGraded = localMarks.get(q.id) !== null && localMarks.get(q.id) !== undefined;
                  const isCurrent = idx === currentIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={cn(
                        "w-8 h-8 rounded text-sm font-medium transition-colors relative",
                        isCurrent && "ring-2 ring-primary",
                        isGraded && !isCurrent && "bg-green-100 text-green-700",
                        hasAnswer && !isGraded && !isCurrent && "bg-blue-100 text-blue-700",
                        !hasAnswer && !isCurrent && "bg-gray-100 text-gray-500"
                      )}
                    >
                      {q.question_number}
                      {q.part_label && <span className="text-xs">{q.part_label}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 rounded" />
                  <span>Graded</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-100 rounded" />
                  <span>Answered (not graded)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 rounded" />
                  <span>Not answered</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Review Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Question Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-base px-3 py-1">
                    Q{currentQuestion.question_number}
                    {currentQuestion.part_label && ` (${currentQuestion.part_label})`}
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMarkScheme(!showMarkScheme)}
                >
                  {showMarkScheme ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {showMarkScheme ? 'Hide' : 'Show'} Mark Scheme
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question Text */}
              <div>
                <Label className="text-muted-foreground">Question</Label>
                <p className="mt-1 whitespace-pre-wrap">{currentQuestion.question_text}</p>
              </div>

              <Separator />

              {/* Student's Answer */}
              <div>
                <Label className="text-muted-foreground">Student's Answer</Label>
                <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                  {currentAnswer ? (
                    currentQuestion.question_type === 'mcq' && currentAnswer.selected_option ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          {currentAnswer.selected_option}
                        </Badge>
                        {currentQuestion.options && (
                          <span>
                            {currentQuestion.options.find(o => o.label === currentAnswer.selected_option)?.text}
                          </span>
                        )}
                      </div>
                    ) : currentAnswer.answer_text ? (
                      <p className="whitespace-pre-wrap">{currentAnswer.answer_text}</p>
                    ) : (
                      <p className="text-muted-foreground italic">No answer provided</p>
                    )
                  ) : (
                    <p className="text-muted-foreground italic">No answer provided</p>
                  )}
                </div>
              </div>

              {/* Mark Scheme (collapsible) */}
              {showMarkScheme && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <Label className="text-green-700 font-medium">Mark Scheme</Label>
                  {currentQuestion.mark_scheme ? (
                    <p className="mt-2 whitespace-pre-wrap text-green-800">{currentQuestion.mark_scheme}</p>
                  ) : currentQuestion.correct_answer ? (
                    <p className="mt-2 text-green-800">Correct Answer: {currentQuestion.correct_answer}</p>
                  ) : (
                    <p className="mt-2 text-green-600 italic">No mark scheme available</p>
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
                        value={localMarks.get(currentQuestion.id) ?? ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : parseInt(e.target.value);
                          setLocalMarks(prev => new Map(prev).set(currentQuestion.id, value));
                        }}
                        className="w-24"
                      />
                      <span className="text-muted-foreground">/ {currentQuestion.marks}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocalMarks(prev => new Map(prev).set(currentQuestion.id, currentQuestion.marks))}
                  >
                    Full Marks
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocalMarks(prev => new Map(prev).set(currentQuestion.id, 0))}
                  >
                    Zero
                  </Button>
                </div>

                <div>
                  <Label htmlFor="feedback">Feedback for this question (optional)</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Add feedback for the student..."
                    value={localFeedback.get(currentQuestion.id) || ''}
                    onChange={(e) => {
                      setLocalFeedback(prev => new Map(prev).set(currentQuestion.id, e.target.value));
                    }}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <Button
                  variant="secondary"
                  onClick={() => saveQuestionGrade(currentQuestion.id)}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Grade
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
                Provide general feedback for the student's submission
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Write overall feedback for the student..."
                value={overallFeedback}
                onChange={(e) => setOverallFeedback(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Review Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit this review? The student will be notified.
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
                <p className="text-sm text-muted-foreground">Questions Graded</p>
                <p className="text-2xl font-bold">{gradedCount}/{questions.length}</p>
              </div>
            </div>
            {gradedCount < questions.length && (
              <p className="text-sm text-yellow-600 mt-2">
                ⚠️ Not all questions have been graded. Ungraded questions will receive 0 marks.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReview} disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
