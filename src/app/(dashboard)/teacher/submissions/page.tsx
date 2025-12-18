'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Filter,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  FileText,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Submission {
  id: string;
  user_id: string;
  paper_id: string;
  class_id: string | null;
  status: string;
  review_status: string;
  practice_mode: string;
  started_at: string;
  submitted_at: string | null;
  time_spent_seconds: number | null;
  awarded_marks: number | null;
  reviewer_feedback: string | null;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
  paper: {
    id: string;
    title: string;
    year: number;
    session: string;
    total_marks: number;
  };
  class: {
    id: string;
    name: string;
  } | null;
}

export default function TeacherSubmissionsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { toast } = useToast();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchClasses();
    fetchSubmissions();
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [selectedClass, selectedStatus]);

  async function fetchClasses() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user.id);

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }

  async function fetchSubmissions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get teacher's class IDs
      const { data: teacherClasses } = await supabase
        .from('classes')
        .select('id')
        .eq('teacher_id', user.id);

      if (!teacherClasses || teacherClasses.length === 0) {
        setSubmissions([]);
        setLoading(false);
        return;
      }

      const classIds = teacherClasses.map(c => c.id);

      // Build query
      let query = supabase
        .from('assessment_attempts')
        .select(`
          id,
          user_id,
          paper_id,
          class_id,
          status,
          review_status,
          practice_mode,
          started_at,
          submitted_at,
          time_spent_seconds,
          awarded_marks,
          reviewer_feedback
        `)
        .in('class_id', classIds)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });

      if (selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('review_status', selectedStatus);
      }

      const { data: attemptsData, error } = await query;

      if (error) throw error;

      // Fetch related data
      const enrichedSubmissions = await Promise.all(
        (attemptsData || []).map(async (attempt) => {
          // Fetch user
          const { data: userData } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('id', attempt.user_id)
            .single();

          // Fetch paper
          const { data: paperData } = await supabase
            .from('past_papers')
            .select('id, title, year, session, total_marks')
            .eq('id', attempt.paper_id)
            .single();

          // Fetch class
          let classData = null;
          if (attempt.class_id) {
            const { data } = await supabase
              .from('classes')
              .select('id, name')
              .eq('id', attempt.class_id)
              .single();
            classData = data;
          }

          return {
            ...attempt,
            user: userData,
            paper: paperData,
            class: classData
          };
        })
      );

      setSubmissions(enrichedSubmissions.filter(s => s.user && s.paper) as Submission[]);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load submissions'
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredSubmissions = submissions.filter(s => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.user?.full_name?.toLowerCase().includes(query) ||
      s.user?.email?.toLowerCase().includes(query) ||
      s.paper?.title?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending Review</Badge>;
      case 'in_review':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Review</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Reviewed</Badge>;
      case 'returned':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Returned</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Stats
  const pendingCount = submissions.filter(s => s.review_status === 'pending').length;
  const reviewedCount = submissions.filter(s => s.review_status === 'reviewed').length;

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
          Review and grade student paper submissions from your classes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reviewed</p>
                <p className="text-3xl font-bold text-green-600">{reviewedCount}</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Submissions</p>
                <p className="text-3xl font-bold">{submissions.length}</p>
              </div>
              <FileText className="h-10 w-10 text-primary opacity-50" />
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
                  placeholder="Search by student name or paper..."
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
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>
            {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No submissions found</h3>
              <p className="text-muted-foreground">
                {submissions.length === 0 
                  ? "Students haven't submitted any papers yet"
                  : "No submissions match your filters"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Paper</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Time Spent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{submission.user?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{submission.user?.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{submission.paper?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {submission.paper?.year} {submission.paper?.session}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{submission.class?.name || '—'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {submission.submitted_at 
                          ? formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })
                          : '—'}
                      </div>
                    </TableCell>
                    <TableCell>{formatTime(submission.time_spent_seconds)}</TableCell>
                    <TableCell>{getStatusBadge(submission.review_status || 'pending')}</TableCell>
                    <TableCell>
                      {submission.awarded_marks !== null ? (
                        <span className="font-medium">
                          {submission.awarded_marks}/{submission.paper?.total_marks}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => router.push(`/teacher/submissions/${submission.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
