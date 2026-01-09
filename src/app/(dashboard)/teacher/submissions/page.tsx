'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ClipboardCheck,
  Search,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  FileText,
  Calendar,
  ChevronRight,
  ChevronDown,
  Users,
  TrendingUp,
  Award,
  Send,
  BarChart3
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { useUser } from '@/hooks/use-user';
import Link from 'next/link';

const supabase = createClient();

interface Assignment {
  id: string;
  title: string;
  assessment_id: string;
  target_class_id: string;
  due_at: string | null;
  created_at: string;
  results_released: boolean;
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
  assignment_id: string;
  test_id: string;
  status: string;
  total_score: number | null;
  max_score: number | null;
  percentage: number | null;
  submitted_at: string | null;
  started_at: string;
  requires_manual_grading: boolean;
  teacher_graded: boolean;
  user?: {
    id: string;
    display_name: string;
    email: string;
  };
}

interface AssignmentWithAttempts extends Assignment {
  attempts: Attempt[];
  stats: {
    total: number;
    submitted: number;
    graded: number;
    needsGrading: number;
    averageScore: number;
  };
}

export default function TeacherSubmissionsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [expandedAssignments, setExpandedAssignments] = useState<Set<string>>(new Set());

  const toggleAssignment = (id: string) => {
    setExpandedAssignments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Cached classes query
  const { data: classes = [] } = useQuery({
    queryKey: ['teacher-classes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch assignments with their attempts grouped together
  const { data: assignmentsWithAttempts = [], isLoading: loading } = useQuery({
    queryKey: ['teacher-assignments-submissions', user?.id, selectedClass],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get teacher's class IDs
      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id);

      if (!teacherClasses || teacherClasses.length === 0) return [];
      const classIds = teacherClasses.map(c => c.id);

      // Fetch assignments for teacher's classes
      let assignmentsQuery = supabase
        .from('assignments')
        .select(`
          *,
          class:classes(id, name),
          assessment:assessments(id, title, total_marks)
        `)
        .in('target_class_id', classIds)
        .order('created_at', { ascending: false });

      if (selectedClass !== 'all') {
        assignmentsQuery = assignmentsQuery.eq('target_class_id', selectedClass);
      }

      const { data: assignmentsData, error: assignmentsError } = await assignmentsQuery;
      if (assignmentsError) throw assignmentsError;
      if (!assignmentsData || assignmentsData.length === 0) return [];

      // Fetch all attempts for these assignments
      const assignmentIds = assignmentsData.map(a => a.id);
      const { data: attemptsData } = await supabase
        .from('test_attempts')
        .select('*')
        .in('assignment_id', assignmentIds)
        .in('status', ['submitted', 'graded', 'in_progress'])
        .order('submitted_at', { ascending: false });

      // Fetch user details for all attempts
      const userIds = [...new Set((attemptsData || []).map(a => a.user_id))];
      const { data: usersData } = userIds.length > 0
        ? await supabase.from('users').select('id, display_name, email').in('id', userIds)
        : { data: [] };

      const usersMap = new Map((usersData || []).map(u => [u.id, u]));

      // Group attempts by assignment and calculate stats
      const attemptsMap = new Map<string, Attempt[]>();
      (attemptsData || []).forEach(attempt => {
        const list = attemptsMap.get(attempt.assignment_id) || [];
        list.push({
          ...attempt,
          user: usersMap.get(attempt.user_id)
        });
        attemptsMap.set(attempt.assignment_id, list);
      });

      // Build final data structure
      const result: AssignmentWithAttempts[] = assignmentsData.map(assignment => {
        const attempts = attemptsMap.get(assignment.id) || [];
        const submitted = attempts.filter(a => a.status === 'submitted' || a.status === 'graded');
        const graded = attempts.filter(a => a.status === 'graded' || a.teacher_graded);
        const needsGrading = attempts.filter(a => 
          (a.status === 'submitted' && !a.teacher_graded) || a.requires_manual_grading
        );
        
        const scores = submitted
          .filter(a => a.percentage !== null)
          .map(a => a.percentage as number);
        const averageScore = scores.length > 0 
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
          : 0;

        return {
          ...assignment,
          attempts,
          stats: {
            total: attempts.length,
            submitted: submitted.length,
            graded: graded.length,
            needsGrading: needsGrading.length,
            averageScore
          }
        };
      });

      // Sort by those needing grading first, then by date
      return result.sort((a, b) => {
        if (a.stats.needsGrading > 0 && b.stats.needsGrading === 0) return -1;
        if (a.stats.needsGrading === 0 && b.stats.needsGrading > 0) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    },
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000,
  });

  // Filter assignments by search
  const filteredAssignments = useMemo(() => {
    if (!searchQuery) return assignmentsWithAttempts;
    const query = searchQuery.toLowerCase();
    return assignmentsWithAttempts.filter(a =>
      a.title?.toLowerCase().includes(query) ||
      a.class?.name?.toLowerCase().includes(query) ||
      a.assessment?.title?.toLowerCase().includes(query) ||
      a.attempts.some(att => 
        att.user?.display_name?.toLowerCase().includes(query) ||
        att.user?.email?.toLowerCase().includes(query)
      )
    );
  }, [assignmentsWithAttempts, searchQuery]);

  const getStatusBadge = (status: string, teacherGraded?: boolean) => {
    if (teacherGraded || status === 'graded') {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Graded</Badge>;
    }
    switch (status) {
      case 'submitted':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Needs Review</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Progress</Badge>;
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

  // Overall stats
  const totalSubmissions = assignmentsWithAttempts.reduce((sum, a) => sum + a.stats.submitted, 0);
  const totalNeedsGrading = assignmentsWithAttempts.reduce((sum, a) => sum + a.stats.needsGrading, 0);
  const totalGraded = assignmentsWithAttempts.reduce((sum, a) => sum + a.stats.graded, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          Student Submissions
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and grade student submissions organized by assignment
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Assignments</p>
                <p className="text-3xl font-bold">{assignmentsWithAttempts.length}</p>
              </div>
              <FileText className="h-10 w-10 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-3xl font-bold">{totalSubmissions}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className={totalNeedsGrading > 0 ? 'border-yellow-300 bg-yellow-50/50' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Needs Grading</p>
                <p className="text-3xl font-bold text-yellow-600">{totalNeedsGrading}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Graded</p>
                <p className="text-3xl font-bold text-green-600">{totalGraded}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search assignments or students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Assignments with Submissions */}
      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assignments found</h3>
              <p className="text-muted-foreground">
                {assignmentsWithAttempts.length === 0 
                  ? "You haven't assigned any tests yet"
                  : "No assignments match your search"}
              </p>
              <Button className="mt-4" asChild>
                <Link href="/teacher/tests">Go to Tests</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((assignment) => {
            const isExpanded = expandedAssignments.has(assignment.id);
            
            return (
              <Collapsible
                key={assignment.id}
                open={isExpanded}
                onOpenChange={() => toggleAssignment(assignment.id)}
              >
                <Card className={assignment.stats.needsGrading > 0 ? 'border-l-4 border-l-yellow-500' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{assignment.title}</CardTitle>
                          {assignment.stats.needsGrading > 0 && (
                            <Badge variant="destructive" className="bg-yellow-500">
                              {assignment.stats.needsGrading} needs grading
                            </Badge>
                          )}
                          {assignment.results_released && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              Results Released
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {assignment.class?.name}
                          </span>
                          {assignment.due_at && new Date(assignment.due_at).getFullYear() > 1980 && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Due {formatDistanceToNow(new Date(assignment.due_at), { addSuffix: true })}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            {assignment.assessment?.total_marks} marks
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/teacher/tests/${assignment.assessment_id}/results`}>
                            <BarChart3 className="h-4 w-4 mr-1" />
                            View Results
                          </Link>
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* Stats Row - Always visible */}
                  <CardContent className="pb-3">
                    <div className="grid grid-cols-4 gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{assignment.stats.submitted}</p>
                        <p className="text-xs text-muted-foreground">Submitted</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{assignment.stats.graded}</p>
                        <p className="text-xs text-muted-foreground">Graded</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-yellow-600">{assignment.stats.needsGrading}</p>
                        <p className="text-xs text-muted-foreground">Needs Grading</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${getScoreColor(assignment.stats.averageScore)}`}>
                          {assignment.stats.averageScore}%
                        </p>
                        <p className="text-xs text-muted-foreground">Average</p>
                      </div>
                    </div>
                  </CardContent>

                  {/* Collapsible Submissions Table */}
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      {assignment.attempts.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/30">
                                <TableHead>Student</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {assignment.attempts
                                .filter(a => a.status === 'submitted' || a.status === 'graded')
                                .map((attempt) => (
                                <TableRow key={attempt.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-4 w-4 text-primary" />
                                      </div>
                                      <div>
                                        <p className="font-medium">{attempt.user?.display_name || 'Unknown'}</p>
                                        <p className="text-xs text-muted-foreground">{attempt.user?.email}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1 text-sm">
                                      <Calendar className="h-3 w-3" />
                                      {attempt.submitted_at 
                                        ? formatDistanceToNow(new Date(attempt.submitted_at), { addSuffix: true })
                                        : '—'}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {getStatusBadge(attempt.status, attempt.teacher_graded)}
                                  </TableCell>
                                  <TableCell>
                                    {attempt.total_score !== null && attempt.max_score !== null ? (
                                      <div>
                                        <span className="font-medium">
                                          {attempt.total_score}/{attempt.max_score}
                                        </span>
                                        <span className={`ml-2 font-bold ${getScoreColor(attempt.percentage)}`}>
                                          ({attempt.percentage}%)
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      size="sm"
                                      variant={attempt.teacher_graded ? 'outline' : 'default'}
                                      asChild
                                    >
                                      <Link href={`/teacher/tests/${assignment.assessment_id}/grade/${attempt.id}`}>
                                        <Eye className="h-4 w-4 mr-1" />
                                        {attempt.teacher_graded ? 'View' : 'Grade'}
                                      </Link>
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <div className="text-center py-8 border rounded-lg border-dashed">
                          <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">No submissions yet</p>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
