'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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

// Create supabase client outside component to prevent re-creation on every render
const supabase = createClient();

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
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [testToExport, setTestToExport] = useState<Test | null>(null);
  const [showPDFExport, setShowPDFExport] = useState(false);

  // Cached tests query with react-query
  const { data: tests = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['teacher-tests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Fetch ONLY from assessments table
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('assessments')
        .select('*')
        .eq('created_by', user.id)
        .order('updated_at', { ascending: false });

      if (assessmentsError) {
        console.error('Error fetching assessments:', assessmentsError);
        throw assessmentsError;
      }

      // Get all assessment IDs to fetch question counts in one query
      const assessmentIds = (assessmentsData || []).map((a: { id: string }) => a.id);
      
      // Fetch all question counts in a single query (optimized - no N+1)
      let countMap = new Map<string, number>();
      if (assessmentIds.length > 0) {
        const { data: questionCounts } = await supabase
          .from('assessment_questions')
          .select('assessment_id')
          .in('assessment_id', assessmentIds);
        
        // Create a map of assessment_id -> question count
        (questionCounts || []).forEach((q: { assessment_id: string }) => {
          countMap.set(q.assessment_id, (countMap.get(q.assessment_id) || 0) + 1);
        });
      }

      // Map to test format with counts
      return (assessmentsData || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        total_marks: a.total_marks || 0,
        total_questions: countMap.get(a.id) || 0,
        duration_minutes: a.duration_minutes,
        visibility: a.is_published ? 'assigned' : 'private',
        created_at: a.created_at,
        updated_at: a.updated_at,
        sections: [],
        allow_calculator: a.calculator_allowed || false,
        subject: null
      })) as Test[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

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

      // Invalidate cache to refetch
      queryClient.invalidateQueries({ queryKey: ['teacher-tests'] });
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
        const newQuestions = questions.map((q: any) => ({
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

      // Invalidate cache to refetch with new test
      queryClient.invalidateQueries({ queryKey: ['teacher-tests'] });
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            My Tests
          </h1>
          <p className="text-muted-foreground mt-1">Create and manage your custom tests</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/teacher/test-builder">
            <Plus className="h-4 w-4 mr-2" />
            Create New Test
          </Link>
        </Button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>
        <Badge variant="secondary" className="px-3 py-1.5 text-sm w-fit">
          {filteredTests.length} test{filteredTests.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Tests List */}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No tests found</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {searchQuery ? 'Try a different search term' : 'Create your first test to get started with assessments'}
              </p>
              {!searchQuery && (
                <Button asChild size="lg">
                  <Link href="/teacher/test-builder">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Test
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredTests.map(test => (
                <div 
                  key={test.id} 
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group"
                >
                  {/* Test Icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  
                  {/* Test Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {test.title}
                      </h3>
                      {getVisibilityBadge(test.visibility)}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {test.total_questions} questions
                      </span>
                      <span>{test.total_marks} marks</span>
                      {test.duration_minutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {test.duration_minutes} min
                        </span>
                      )}
                      <span className="hidden sm:inline">
                        Updated {formatDistanceToNow(new Date(test.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
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
                </div>
              ))}
            </div>
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
          test={{
            ...testToExport,
            description: testToExport.description ?? undefined,
          }}
          open={showPDFExport}
          onOpenChange={setShowPDFExport}
        />
      )}
    </div>
  );
}
