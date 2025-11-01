'use client';
import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, writeBatch, getDocs, where } from 'firebase/firestore';
import type { Quiz } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const AssessmentsPage = () => {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);

    const quizzesQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'quizzes'), where('createdBy', '==', user.uid), orderBy('title'));
    }, [firestore, user]);

    const { data: quizzes, isLoading, error } = useCollection<Quiz>(quizzesQuery);

    const getBadgeVariant = (visibility: string | undefined) => {
        switch (visibility) {
            case 'published': return 'default';
            case 'draft': return 'secondary';
            case 'archived': return 'outline';
            default: return 'secondary';
        }
    }

    const handleDeleteClick = (quiz: Quiz) => {
        setSelectedQuiz(quiz);
        setIsDeleteDialogOpen(true);
    };
    
    const handleDeleteConfirm = async () => {
        if (!firestore || !selectedQuiz) return;
        setIsDeleting(true);

        try {
            const batch = writeBatch(firestore);

            // 1. Delete the quiz document
            const quizRef = doc(firestore, "quizzes", selectedQuiz.id);
            batch.delete(quizRef);

            // 2. Delete all associated question documents
            if (selectedQuiz.questionIds && selectedQuiz.questionIds.length > 0) {
                 // Firestore 'in' queries are limited to 30 items. 
                 // If a quiz can have more, this needs to be chunked.
                const questionsQuery = query(
                    collection(firestore, 'questions'),
                    where('__name__', 'in', selectedQuiz.questionIds)
                );
                const questionsSnapshot = await getDocs(questionsQuery);
                questionsSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
            }

            await batch.commit();

            toast({
                title: "Assessment Deleted",
                description: "The assessment and all its questions have been successfully deleted.",
            });
        } catch (error) {
            console.error("Error deleting assessment: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "There was a problem deleting the assessment.",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setSelectedQuiz(null);
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>My Assessments</CardTitle>
                            <CardDescription>Manage all quizzes and topical assessments you have created.</CardDescription>
                        </div>
                        <Button asChild>
                            <Link href="/teacher/assessments/new">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create New Assessment
                            </Link>
                        </Button>
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
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-destructive">
                                        Error loading assessments: {error.message}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                quizzes?.map(quiz => (
                                    <TableRow key={quiz.id}>
                                        <TableCell className="font-medium">{quiz.title}</TableCell>
                                        <TableCell className="hidden md:table-cell">{quiz.subject}</TableCell>
                                        <TableCell className="hidden md:table-cell">{quiz.topic}</TableCell>
                                        <TableCell className="hidden sm:table-cell">{quiz.questionIds?.length || 0}</TableCell>
                                        <TableCell>
                                            <Badge variant={getBadgeVariant(quiz.visibility)}>{quiz.visibility || 'draft'}</Badge>
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
                                                    <DropdownMenuItem asChild><Link href={`/teacher/assessments/${quiz.id}`}>Edit</Link></DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(quiz)}>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                             {!isLoading && quizzes?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No assessments found. Get started by creating one.
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
                    <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default AssessmentsPage;
