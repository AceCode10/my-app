'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Search,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Send,
  Download,
  FileText,
  Clock,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { TestPDFExport } from '@/components/teacher/test-pdf-export';

interface Test {
  id: string;
  title: string;
  description: string | null;
  total_marks: number;
  total_questions: number;
  duration_minutes: number | null;
  visibility: string;
  created_at: string;
  updated_at: string;
  sections?: any[];
  allow_calculator?: boolean;
  subject?: { name: string } | { name: string }[] | null;
  source?: 'tests' | 'assessments';
}

export default function TeacherTestsPage() {
  const supabase = createClient();
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [testToExport, setTestToExport] = useState<Test | null>(null);
  const [showPDFExport, setShowPDFExport] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTests();
    }
  }, [user]);

  async function fetchTests() {
    try {
      console.log('=== fetchTests called ===');
      console.log('User ID:', user?.id);

      // Fetch ONLY from assessments table
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('assessments')
        .select('*')
        .eq('created_by', user?.id)
        .order('updated_at', { ascending: false });

      console.log('Assessments fetched:', assessmentsData?.length || 0);
      console.log('Assessments data:', assessmentsData);
      console.log('Assessments error:', assessmentsError);

      if (assessmentsError) {
        console.error('Error fetching assessments:', assessmentsError);
        throw assessmentsError;
      }

      // Map to test format
      const testsData = (assessmentsData || []).map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        total_marks: a.total_marks || 0,
        total_questions: 0,
        duration_minutes: a.duration_minutes,
        visibility: a.is_published ? 'assigned' : 'private',
        created_at: a.created_at,
        updated_at: a.updated_at,
        sections: [],
        allow_calculator: a.calculator_allowed || false,
        subject: null
      }));

      // Fetch question counts for all tests
      for (const test of testsData) {
        const { count } = await supabase
          .from('assessment_questions')
          .select('*', { count: 'exact', head: true })
          .eq('assessment_id', test.id);
        test.total_questions = count || 0;
      }

      setTests(testsData);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load tests' });
    } finally {
      setLoading(false);
    }
  }

  async function deleteTest() {
    if (!testToDelete) return;
    
    setDeleting(true);
    try {
      // Delete from assessments table
      const { error } = await supabase
        .from('assessments')
        .delete()
        .eq('id', testToDelete.id);

      if (error) throw error;

      setTests(tests.filter(t => t.id !== testToDelete.id));
      toast({ title: 'Test deleted', description: 'The test has been permanently deleted' });
    } catch (error) {
      console.error('Error deleting test:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete test' });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setTestToDelete(null);
    }
  }

  async function duplicateTest(test: Test) {
    try {
      // Fetch full assessment data
      const { data: fullAssessment, error: fetchError } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', test.id)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate assessment
      const { data: newAssessment, error: insertError } = await supabase
        .from('assessments')
        .insert({
          title: `${fullAssessment.title} (Copy)`,
          description: fullAssessment.description,
          instructions: fullAssessment.instructions,
          duration_minutes: fullAssessment.duration_minutes,
          total_marks: fullAssessment.total_marks,
          passing_marks: fullAssessment.passing_marks,
          calculator_allowed: fullAssessment.calculator_allowed,
          max_attempts: fullAssessment.max_attempts,
          show_results: fullAssessment.show_results,
          randomize_questions: fullAssessment.randomize_questions,
          randomize_answers: fullAssessment.randomize_answers,
          is_template: fullAssessment.is_template,
          is_published: false,
          created_by: user?.id,
          subject_id: fullAssessment.subject_id,
          exam_board_id: fullAssessment.exam_board_id,
          topic_id: fullAssessment.topic_id,
          assessment_type_id: fullAssessment.assessment_type_id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Also duplicate assessment_questions
      const { data: questions } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', test.id);

      if (questions && questions.length > 0) {
        const newQuestions = questions.map(q => ({
          assessment_id: newAssessment.id,
          question_id: q.question_id,
          question_order: q.question_order,
          section_name: q.section_name,
          section_instructions: q.section_instructions,
          custom_question_text: q.custom_question_text,
          custom_marks: q.custom_marks
        }));

        await supabase.from('assessment_questions').insert(newQuestions);
      }

      // Add to list
      const newTest = {
        id: newAssessment.id,
        title: newAssessment.title,
        description: newAssessment.description,
        total_marks: newAssessment.total_marks || 0,
        total_questions: questions?.length || 0,
        duration_minutes: newAssessment.duration_minutes,
        visibility: 'private',
        created_at: newAssessment.created_at,
        updated_at: newAssessment.updated_at,
        sections: [],
        allow_calculator: newAssessment.calculator_allowed || false,
        subject: null
      };

      setTests([newTest, ...tests]);
      toast({ title: 'Test duplicated', description: 'A copy of the test has been created' });
    } catch (error) {
      console.error('Error duplicating test:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to duplicate test' });
    }
  }

  const filteredTests = tests.filter(test =>
    test.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function getVisibilityBadge(visibility: string) {
    switch (visibility) {
      case 'private':
        return <Badge variant="secondary">Private</Badge>;
      case 'assigned':
        return <Badge variant="default">Assigned</Badge>;
      case 'public':
        return <Badge className="bg-green-500">Public</Badge>;
      default:
        return <Badge variant="outline">{visibility}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Tests</h1>
          <p className="text-muted-foreground">Create and manage your custom tests</p>
        </div>
        <Button asChild>
          <Link href="/teacher/test-builder">
            <Plus className="h-4 w-4 mr-2" />
            Create New Test
          </Link>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-1">No tests found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try a different search term' : 'Create your first test to get started'}
              </p>
              {!searchQuery && (
                <Button asChild>
                  <Link href="/teacher/test-builder">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Test
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Subject</TableHead>
                  <TableHead className="text-center">Questions</TableHead>
                  <TableHead className="text-center">Marks</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Duration</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Last Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTests.map(test => (
                  <TableRow key={test.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{test.title}</p>
                        {test.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {test.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {test.subject ? (test.subject as any).name : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {test.total_questions}
                    </TableCell>
                    <TableCell className="text-center">
                      {test.total_marks}
                    </TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      {test.duration_minutes ? (
                        <span className="flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3" />
                          {test.duration_minutes}m
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {getVisibilityBadge(test.visibility)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(test.updated_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/teacher/test-builder/${test.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateTest(test)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/teacher/tests/${test.id}/assign`}>
                              <Send className="h-4 w-4 mr-2" />
                              Assign to Class
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setTestToExport(test);
                            setShowPDFExport(true);
                          }}>
                            <Download className="h-4 w-4 mr-2" />
                            Export PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setTestToDelete(test);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{testToDelete?.title}"? This action cannot be undone.
              Any assignments using this test will also be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTest}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF Export Dialog */}
      {testToExport && (
        <TestPDFExport
          test={testToExport}
          open={showPDFExport}
          onOpenChange={setShowPDFExport}
        />
      )}
    </div>
  );
}
