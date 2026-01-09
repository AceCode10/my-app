'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, AlertCircle, PlayCircle, CheckCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Assignment {
  id: string;
  title: string;
  instructions: string;
  due_at: string;
  start_at: string;
  time_limit_minutes: number;
  test_id: string | null;
  assessment_id: string | null;
  paper_id: string | null;
  show_results: string;
  created_at: string;
  target_class_id: string;
  classes?: {
    name: string;
    subjects?: { name: string };
  };
}

interface TestAttempt {
  id: string;
  assignment_id: string;
  user_id: string;
  status: string;
  score: number;
  total_questions: number;
  started_at: string;
  submitted_at: string;
}

export default function AssignmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assignmentId = params.id as string;
  const { user } = useUser();
  const supabase = createClient();
  const { toast } = useToast();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (assignmentId && user) {
      fetchAssignment();
      fetchAttempts();
    }
  }, [assignmentId, user]);

  async function fetchAssignment() {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*, classes(name, subjects(name))')
        .eq('id', assignmentId)
        .single();

      if (error) {
        console.error('Error fetching assignment:', error);
        toast({
          variant: 'destructive',
          title: 'Assignment Not Found',
          description: 'This assignment does not exist or you do not have access to it.'
        });
      } else {
        setAssignment(data);
      }
    } catch (err) {
      console.error('Exception fetching assignment:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not load the assignment. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchAttempts() {
    if (!user) return;

    const { data, error } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false });

    if (error) {
      console.error('Error fetching attempts:', error);
    } else {
      setAttempts(data || []);
    }
  }

  async function handleStartAssignment() {
    if (!user || !assignment) return;
    setIsStarting(true);

    try {
      const now = new Date();
      
      // Check if assignment has started (only if valid start date)
      if (assignment.start_at) {
        const assignmentStartDate = new Date(assignment.start_at);
        if (assignmentStartDate.getFullYear() > 1980 && assignmentStartDate > now) {
          toast({
            variant: 'destructive',
            title: 'Not Available Yet',
            description: `This assignment will be available ${formatDistanceToNow(assignmentStartDate, { addSuffix: true })}.`
          });
          setIsStarting(false);
          return;
        }
      }

      // Check if assignment is overdue (only if valid due date)
      if (assignment.due_at) {
        const assignmentDueDate = new Date(assignment.due_at);
        if (assignmentDueDate.getFullYear() > 1980 && assignmentDueDate < now) {
          toast({
            variant: 'destructive',
            title: 'Assignment Overdue',
            description: 'This assignment is past its due date.'
          });
          setIsStarting(false);
          return;
        }
      }

      // Create a new attempt - only include non-null fields
      const attemptData: any = {
        assignment_id: assignmentId,
        user_id: user.id,
        status: 'in_progress',
        started_at: new Date().toISOString()
      };

      // Add test_id or paper_id only if they exist
      if (assignment.test_id) {
        attemptData.test_id = assignment.test_id;
      }
      if (assignment.paper_id) {
        attemptData.paper_id = assignment.paper_id;
      }

      const { data: newAttempt, error } = await supabase
        .from('test_attempts')
        .insert(attemptData)
        .select()
        .single();

      if (error) {
        console.error('Insert error details:', error);
        throw error;
      }

      // Navigate to the test taking page
      router.push(`/student/assessments/${assignmentId}/take/${newAttempt.id}`);
    } catch (error) {
      console.error('Error starting assignment:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not start the assignment. Please try again.'
      });
    } finally {
      setIsStarting(false);
    }
  }

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-9 w-48 mb-4" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div>
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="text-center py-20 bg-background rounded-2xl shadow-sm border border-dashed">
          <h3 className="text-xl font-semibold text-foreground">Assignment Not Found</h3>
          <p className="text-muted-foreground mt-2">This assignment does not exist or you don't have access to it.</p>
        </div>
      </div>
    );
  }

  const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
  const startDate = assignment.start_at ? new Date(assignment.start_at) : null;
  const now = new Date();
  
  // Check if due date is valid (not null, not epoch time like 1970)
  const hasValidDueDate = dueDate && dueDate.getFullYear() > 1980;
  const hasValidStartDate = startDate && startDate.getFullYear() > 1980;
  
  const isOverdue = hasValidDueDate && dueDate < now;
  const notStartedYet = hasValidStartDate && startDate > now;
  const completedAttempt = attempts.find(a => a.status === 'submitted' || a.status === 'graded');
  const inProgressAttempt = attempts.find(a => a.status === 'in_progress');

  return (
    <div>
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Class
      </Button>

      <div className="mb-8">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-3xl font-bold text-foreground">{assignment.title}</h2>
          {completedAttempt && (
            <Badge variant="default" className="ml-4">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
          {inProgressAttempt && (
            <Badge variant="secondary" className="ml-4">
              In Progress
            </Badge>
          )}
          {isOverdue && !completedAttempt && (
            <Badge variant="destructive" className="ml-4">
              Overdue
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {assignment.classes && (
            <>
              <span>{assignment.classes.name}</span>
              <span>•</span>
              <span>{assignment.classes.subjects?.name}</span>
              <span>•</span>
            </>
          )}
          {hasValidDueDate ? (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                Due {formatDistanceToNow(dueDate, { addSuffix: true })}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="text-muted-foreground">No due date</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignment.instructions && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Instructions</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{assignment.instructions}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Start Date</p>
                  <p className="text-foreground">
                    {hasValidStartDate ? `${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString()}` : 'Available now'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Due Date</p>
                  <p className="text-foreground">
                    {hasValidDueDate ? `${dueDate.toLocaleDateString()} at ${dueDate.toLocaleTimeString()}` : 'No due date'}
                  </p>
                </div>
                {assignment.time_limit_minutes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Time Limit</p>
                    <p className="text-foreground">{assignment.time_limit_minutes} minutes</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Results</p>
                  <p className="text-foreground capitalize">{assignment.show_results?.replace('_', ' ') || 'After submission'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {attempts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Attempts</CardTitle>
                <CardDescription>View your previous attempts at this assignment.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attempts.map((attempt, index) => (
                    <div
                      key={attempt.id}
                      className="p-4 rounded-lg border bg-muted/50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-foreground">Attempt {attempts.length - index}</p>
                        <p className="text-sm text-muted-foreground">
                          {attempt.status === 'submitted' || attempt.status === 'graded'
                            ? `Score: ${attempt.score}/${attempt.total_questions}`
                            : 'In Progress'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Started {formatDistanceToNow(new Date(attempt.started_at), { addSuffix: true })}
                        </p>
                      </div>
                      {(attempt.status === 'submitted' || attempt.status === 'graded') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/student/assessments/${assignmentId}/results/${attempt.id}`)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Results
                        </Button>
                      )}
                      {attempt.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/student/assessments/${assignmentId}/take/${attempt.id}`)}
                        >
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Continue
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Start Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {notStartedYet && hasValidStartDate && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Not Available Yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This assignment will be available {formatDistanceToNow(startDate, { addSuffix: true })}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isOverdue && !completedAttempt && hasValidDueDate && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Assignment Overdue</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This assignment was due {formatDistanceToNow(dueDate, { addSuffix: true })}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {completedAttempt && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Assignment Completed</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        You have completed this assignment.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {inProgressAttempt ? (
                <Button
                  className="w-full"
                  onClick={() => router.push(`/student/assessments/${assignmentId}/take/${inProgressAttempt.id}`)}
                >
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Continue Assignment
                </Button>
              ) : (
                <Button
                  className="w-full"
                  onClick={handleStartAssignment}
                  disabled={isStarting || (notStartedYet && hasValidStartDate) || (isOverdue && hasValidDueDate && !completedAttempt) || !!completedAttempt}
                >
                  {isStarting ? (
                    <>Starting...</>
                  ) : (
                    <>
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Start Assignment
                    </>
                  )}
                </Button>
              )}

              {assignment.time_limit_minutes && (
                <div className="pt-4 border-t">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <p>
                      You have <strong>{assignment.time_limit_minutes} minutes</strong> to complete this assignment once you start.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
