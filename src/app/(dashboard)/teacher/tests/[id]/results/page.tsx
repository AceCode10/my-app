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
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  TrendingUp,
  Award,
  FileText,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  assessment_id: string;
  target_class_id: string;
  show_results: string;
  results_released: boolean;
  results_released_at: string | null;
  due_at: string | null;
  created_at: string;
  class?: {
    id: string;
    name: string;
  };
  assessment?: {
    id: string;
    title: string;
    total_marks: number;
  };
}

interface Attempt {
  id: string;
  user_id: string;
  status: string;
  total_score: number | null;
  max_score: number | null;
  percentage: number | null;
  submitted_at: string | null;
  requires_manual_grading: boolean;
  user?: {
    id: string;
    display_name: string;
    email: string;
  };
}

export default function TestResultsPage() {
  const router = useRouter();
  const params = useParams();
  const testId = params.id as string;
  const { user } = useUser();
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [releasing, setReleasing] = useState(false);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [autoGrading, setAutoGrading] = useState(false);

  useEffect(() => {
    if (user && testId) {
      fetchData();
    }
  }, [user, testId]);

  async function fetchData() {
    setLoading(true);
    try {
      // Fetch assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          class:classes(id, name),
          assessment:assessments(id, title, total_marks)
        `)
        .eq('assessment_id', testId)
        .single();

      if (assignmentError && assignmentError.code !== 'PGRST116') {
        throw assignmentError;
      }

      if (assignmentData) {
        setAssignment(assignmentData);

        // Fetch attempts for this assignment
        const { data: attemptsData } = await supabase
          .from('test_attempts')
          .select('*')
          .eq('assignment_id', assignmentData.id)
          .order('submitted_at', { ascending: false });

        if (attemptsData && attemptsData.length > 0) {
          // Fetch user details
          const userIds = [...new Set(attemptsData.map(a => a.user_id))];
          const { data: usersData } = await supabase
            .from('users')
            .select('id, display_name, email')
            .in('id', userIds);

          const usersMap = new Map((usersData || []).map(u => [u.id, u]));
          
          const enrichedAttempts = attemptsData.map(a => ({
            ...a,
            user: usersMap.get(a.user_id)
          }));
          
          setAttempts(enrichedAttempts);
        }

        // Get grading summary
        const gradingSummary = await gradingService.getGradingSummary(assignmentData.id);
        setSummary(gradingSummary);
      } else {
        // No assignment yet - check if assessment exists
        const { data: assessmentData } = await supabase
          .from('assessments')
          .select('id, title, total_marks')
          .eq('id', testId)
          .single();

        if (assessmentData) {
          setAssignment({
            id: '',
            title: assessmentData.title,
            assessment_id: testId,
            target_class_id: '',
            show_results: 'after_due',
            results_released: false,
            results_released_at: null,
            due_at: null,
            created_at: '',
            assessment: assessmentData
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load results data'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleReleaseResults() {
    if (!assignment?.id || !user?.id) return;

    setReleasing(true);
    try {
      const success = await gradingService.releaseResults(assignment.id, user.id);
      
      if (success) {
        toast({
          title: 'Results Released',
          description: 'Students can now view their results'
        });
        await fetchData();
      } else {
        throw new Error('Failed to release results');
      }
    } catch (error) {
      console.error('Error releasing results:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to release results'
      });
    } finally {
      setReleasing(false);
      setReleaseDialogOpen(false);
    }
  }

  async function handleHideResults() {
    if (!assignment?.id) return;

    setReleasing(true);
    try {
      const success = await gradingService.hideResults(assignment.id);
      
      if (success) {
        toast({
          title: 'Results Hidden',
          description: 'Students can no longer view their results'
        });
        await fetchData();
      }
    } catch (error) {
      console.error('Error hiding results:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to hide results'
      });
    } finally {
      setReleasing(false);
    }
  }

  async function handleAutoGradeAll() {
    if (!assignment?.id) return;

    setAutoGrading(true);
    try {
      let gradedCount = 0;
      
      for (const attempt of attempts.filter(a => a.status === 'submitted')) {
        const result = await gradingService.gradeTestAttempt(attempt.id);
        if (result) gradedCount++;
      }

      toast({
        title: 'Auto-Grading Complete',
        description: `Successfully graded ${gradedCount} submissions`
      });
      
      await fetchData();
    } catch (error) {
      console.error('Error auto-grading:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to auto-grade submissions'
      });
    } finally {
      setAutoGrading(false);
    }
  }

  async function updateShowResults(value: string) {
    if (!assignment?.id) return;

    try {
      const { error } = await supabase
        .from('assignments')
        .update({ show_results: value })
        .eq('id', assignment.id);

      if (error) throw error;

      setAssignment(prev => prev ? { ...prev, show_results: value } : null);
      toast({
        title: 'Settings Updated',
        description: 'Results visibility setting has been updated'
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update settings'
      });
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">In Progress</Badge>;
      case 'submitted':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Submitted</Badge>;
      case 'grading':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Grading</Badge>;
      case 'graded':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Graded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScoreColor = (percentage: number | null) => {
    if (percentage === null) return 'text-muted-foreground';
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-blue-600';
    if (percentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Test not found</h3>
        <Button asChild>
          <Link href="/teacher/tests">Back to Tests</Link>
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
            <Link href="/teacher/tests">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{assignment.title || assignment.assessment?.title}</h1>
            <p className="text-muted-foreground">
              {assignment.class?.name || 'No class assigned'} • Results Management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleAutoGradeAll}
            disabled={autoGrading || attempts.filter(a => a.status === 'submitted').length === 0}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoGrading ? 'animate-spin' : ''}`} />
            {autoGrading ? 'Grading...' : 'Auto-Grade All'}
          </Button>
          {assignment.results_released ? (
            <Button variant="outline" onClick={handleHideResults} disabled={releasing}>
              <EyeOff className="h-4 w-4 mr-2" />
              Hide Results
            </Button>
          ) : (
            <Button onClick={() => setReleaseDialogOpen(true)} disabled={releasing}>
              <Send className="h-4 w-4 mr-2" />
              Release Results
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-3xl font-bold">{summary?.submitted_count || 0}</p>
              </div>
              <Users className="h-10 w-10 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Graded</p>
                <p className="text-3xl font-bold text-green-600">{summary?.graded_count || 0}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Review</p>
                <p className="text-3xl font-bold text-yellow-600">{summary?.needs_grading_count || 0}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-3xl font-bold">{summary?.average_score || 0}%</p>
              </div>
              <TrendingUp className="h-10 w-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Results Settings</CardTitle>
          <CardDescription>Control when and how students can view their results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Results Visibility</Label>
              <p className="text-sm text-muted-foreground">
                Choose when students can see their results
              </p>
            </div>
            <Select
              value={assignment.show_results}
              onValueChange={updateShowResults}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediately">Immediately after submit</SelectItem>
                <SelectItem value="after_submit">After submission</SelectItem>
                <SelectItem value="after_due">After due date</SelectItem>
                <SelectItem value="manual">Manual release only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              {assignment.results_released ? (
                <Eye className="h-5 w-5 text-green-600" />
              ) : (
                <EyeOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  Results are {assignment.results_released ? 'visible' : 'hidden'}
                </p>
                {assignment.results_released_at && (
                  <p className="text-sm text-muted-foreground">
                    Released {formatDistanceToNow(new Date(assignment.results_released_at), { addSuffix: true })}
                  </p>
                )}
              </div>
            </div>
            <Badge variant={assignment.results_released ? 'default' : 'secondary'}>
              {assignment.results_released ? 'Released' : 'Pending Release'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Score Distribution */}
      {summary && summary.graded_count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Score Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">Highest Score</p>
                <p className="text-3xl font-bold text-green-600">{summary.high_score}%</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">Average Score</p>
                <p className="text-3xl font-bold text-blue-600">{summary.average_score}%</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">Lowest Score</p>
                <p className="text-3xl font-bold text-red-600">{summary.low_score}%</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pass Rate (≥50%)</span>
              <div className="flex items-center gap-2">
                <Progress value={summary.pass_rate} className="w-32" />
                <span className="font-medium">{summary.pass_rate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Student Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Student Results</CardTitle>
          <CardDescription>
            {attempts.length} submission{attempts.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No submissions yet</h3>
              <p className="text-muted-foreground">
                Students haven't submitted this test yet
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt) => (
                  <TableRow key={attempt.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{attempt.user?.display_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{attempt.user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(attempt.status)}
                        {attempt.requires_manual_grading && (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700">
                            Needs Review
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {attempt.submitted_at
                        ? formatDistanceToNow(new Date(attempt.submitted_at), { addSuffix: true })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {attempt.total_score !== null && attempt.max_score !== null ? (
                        <span className="font-medium">
                          {attempt.total_score}/{attempt.max_score}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`font-bold ${getScoreColor(attempt.percentage)}`}>
                        {attempt.percentage !== null ? `${attempt.percentage}%` : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <Link href={`/teacher/tests/${testId}/grade/${attempt.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          {attempt.requires_manual_grading ? 'Grade' : 'View'}
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Release Results Dialog */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release Results</DialogTitle>
            <DialogDescription>
              Students will be notified and can view their results immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Submissions</span>
                <span className="font-medium">{summary?.submitted_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Graded</span>
                <span className="font-medium">{summary?.graded_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Average Score</span>
                <span className="font-medium">{summary?.average_score || 0}%</span>
              </div>
            </div>
            {summary?.needs_grading_count > 0 && (
              <p className="text-sm text-yellow-600 mt-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {summary.needs_grading_count} submission(s) still need manual grading
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleReleaseResults} disabled={releasing}>
              {releasing ? 'Releasing...' : 'Release Results'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
