'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Loader2, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

const supabase = createClient();

type AssessmentType = 'all' | 'quiz' | 'topical' | 'test';

interface Assessment {
    id: string;
    title: string;
    subject_id: string;
    topic_id: string | null;
    visibility: 'draft' | 'published' | 'archived';
    created_by: string;
    question_count?: number;
    assessment_type?: AssessmentType;
}

const AssessmentsPage = () => {
    const { user } = useUser();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
    const [filterType, setFilterType] = useState<AssessmentType>('all');

    // Cached assessments query
    const { data: assessments = [], isLoading } = useQuery({
        queryKey: ['teacher-assessments', user?.id, filterType],
        queryFn: async () => {
            if (!user?.id) return [];
            
            let query = supabase
                .from('assessments')
                .select('*')
                .eq('created_by', user.id)
                .order('created_at', { ascending: false });

            if (filterType !== 'all') {
                query = query.eq('assessment_type', filterType);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!user?.id,
        staleTime: 2 * 60 * 1000,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (assessmentId: string) => {
            const { error } = await supabase
                .from('assessments')
                .delete()
                .eq('id', assessmentId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] });
            toast({ title: 'Success', description: 'Assessment deleted successfully.' });
            setIsDeleteDialogOpen(false);
        },
        onError: (error: any) => {
            toast({ variant: 'destructive', title: 'Error', description: error.message || 'Could not delete assessment.' });
        },
    });

    const getBadgeVariant = (visibility: string | undefined) => {
        switch (visibility) {
            case 'published': return 'default';
            case 'draft': return 'secondary';
            case 'archived': return 'outline';
            default: return 'secondary';
        }
    }

    const handleDeleteClick = (assessment: Assessment) => {
        setSelectedAssessment(assessment);
        setIsDeleteDialogOpen(true);
    };
    
    const handleDeleteConfirm = () => {
        if (!selectedAssessment) return;
        deleteMutation.mutate(selectedAssessment.id);
    };

    const getTypeLabel = (type?: string) => {
        switch (type) {
            case 'quiz': return 'Quiz';
            case 'topical': return 'Topical Assessment';
            case 'test': return 'Test';
            default: return 'Assessment';
        }
    };

    return (
        <div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>My Assessments</CardTitle>
                            <CardDescription>Manage all your quizzes, topical assessments, and tests in one place.</CardDescription>
                        </div>
                        <Button asChild>
                            <Link href="/teacher/assessments/new">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create New
                            </Link>
                        </Button>
                    </div>
                    {/* Filter */}
                    <div className="flex items-center gap-2 mt-4">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <Select value={filterType} onValueChange={(value) => setFilterType(value as AssessmentType)}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="quiz">Quizzes</SelectItem>
                                <SelectItem value="topical">Topical Assessments</SelectItem>
                                <SelectItem value="test">Tests</SelectItem>
                            </SelectContent>
                        </Select>
                        {filterType !== 'all' && (
                            <Badge variant="secondary">{assessments.length} results</Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead className="hidden md:table-cell">Subject</TableHead>
                                <TableHead className="hidden md:table-cell">Topic</TableHead>
                                <TableHead className="hidden sm:table-cell"># Questions</TableHead>
                                <TableHead>Visibility</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell className="hidden sm:table-cell"><Skeleton className="h-5 w-16" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                assessments.map(assessment => (
                                    <TableRow key={assessment.id}>
                                        <TableCell className="font-medium">{assessment.title}</TableCell>
                                        <TableCell className="hidden md:table-cell">{assessment.subject_id}</TableCell>
                                        <TableCell className="hidden md:table-cell">{assessment.topic_id || '-'}</TableCell>
                                        <TableCell className="hidden sm:table-cell">{assessment.question_count || 0}</TableCell>
                                        <TableCell>
                                            <Badge variant={getBadgeVariant(assessment.visibility)}>{assessment.visibility || 'draft'}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild><Link href={`/teacher/assessments/${assessment.id}`}>Edit</Link></DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(assessment)}>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                             {!isLoading && assessments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No assessments found. Get started by <Link href="/teacher/assessments/new" className="text-primary underline">creating one</Link>.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the assessment and all of its associated questions from the database.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
                        {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default AssessmentsPage;
