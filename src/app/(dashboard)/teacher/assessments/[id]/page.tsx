'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, getDocs, setDoc, addDoc, collection, serverTimestamp, query, where, documentId, writeBatch, arrayUnion, arrayRemove, orderBy } from 'firebase/firestore';
import type { Quiz, Question, Subject } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft, Loader2, PlusCircle, Bot } from 'lucide-react';
import { QuestionItem } from '@/components/teacher/question-item';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { generateQuizQuestions } from '@/lib/ai-placeholders';
import { allSubjects as localSubjects, type Subject as SubjectType} from '@/lib/subjects';


const quizSchema = z.object({
    title: z.string().min(3, { message: "Title must be at least 3 characters." }),
    subject: z.string().min(1, { message: "Please select a subject." }),
    topic: z.string().min(1, { message: "Please select a topic." }),
    visibility: z.enum(['draft', 'published', 'archived']),
});

type QuizFormData = z.infer<typeof quizSchema>;

const QuizEditorPage = () => {
    const router = useRouter();
    const params = useParams();
    const { id: quizId } = params;
    const isNewQuiz = quizId === 'new';

    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [numAiQuestions, setNumAiQuestions] = useState(5);

    const [subjects, setSubjects] = useState(localSubjects);
    const isLoadingSubjects = false;

    const quizRef = useMemoFirebase(() => {
        if (!firestore || isNewQuiz || typeof quizId !== 'string') return null;
        return doc(firestore, 'quizzes', quizId);
    }, [firestore, isNewQuiz, quizId]);

    const { data: quizData, isLoading: isFetchingQuiz } = useDoc<Quiz>(quizRef);

    const form = useForm<QuizFormData>({
        resolver: zodResolver(quizSchema),
        defaultValues: {
            title: '',
            subject: '',
            topic: '',
            visibility: 'draft',
        },
    });

    const { subject: subjectValue, topic: topicValue } = form.watch();

    const selectedSubject = useMemo(() => subjects.find(s => s.slug === subjectValue), [subjects, subjectValue]);
    const topics = useMemo(() => selectedSubject?.topics || [], [selectedSubject]);
    const isLoadingTopics = false;


    useEffect(() => {
        form.resetField('topic', { defaultValue: '' });
    }, [subjectValue, form]);
    
    useEffect(() => {
        if (quizData) {
            form.reset({
                title: quizData.title,
                subject: quizData.subject,
                topic: quizData.topic,
                visibility: quizData.visibility || 'draft',
            });
        }
    }, [quizData, form]);

    useEffect(() => {
        const fetchQuestions = async () => {
            if (!firestore || !quizData || !quizData.questionIds || quizData.questionIds.length === 0) {
                setQuestions([]);
                return;
            }
            setIsLoadingQuestions(true);
            try {
                // Firestore 'in' query limit is 30. For larger quizzes, chunking is needed.
                const questionIds = quizData.questionIds.slice(0, 30);
                const questionsQuery = query(collection(firestore, 'questions'), where(documentId(), 'in', questionIds));
                const querySnapshot = await getDocs(questionsQuery);
                const fetchedQuestions = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Question));
                
                const orderedQuestions = questionIds
                    .map(id => fetchedQuestions.find(q => q.id === id))
                    .filter((q): q is Question => q !== undefined);
                setQuestions(orderedQuestions);
            } catch (error) {
                console.error("Error fetching questions: ", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load questions for this quiz.' });
            } finally {
                setIsLoadingQuestions(false);
            }
        };
        fetchQuestions();
    }, [quizData, firestore, toast]);

    const handleAiGenerate = async () => {
        if (!firestore || !user || !topicValue) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a topic first.' });
            return;
        }
        setIsLoading(true);
        setIsAiModalOpen(false);
        const topicName = topics?.find(t => t.name.toLowerCase().replace(/ /g, '-') === topicValue)?.name || topicValue;
        toast({ title: 'AI Generating...', description: `Creating ${numAiQuestions} questions for ${topicName}. This may take a moment.` });

        try {
            const aiResult = await generateQuizQuestions({ topic: topicName, numQuestions: numAiQuestions });
            const batch = writeBatch(firestore);
            
            const newQuestionIds: string[] = [];

            for (const q of aiResult.questions) {
                const questionRef = doc(collection(firestore, 'questions'));
                const questionData = { 
                    ...q,
                    questionId: questionRef.id,
                    authorId: user.uid,
                    status: 'published',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    version: 1,
                    // Map explanation to markScheme for compatibility
                    markScheme: { guidance: q.explanation }
                };
                batch.set(questionRef, questionData);
                newQuestionIds.push(questionRef.id);
            }
            
            const currentQuizRef = doc(firestore, 'quizzes', quizId as string);
            batch.update(currentQuizRef, {
                questionIds: arrayUnion(...newQuestionIds),
                updatedAt: serverTimestamp(),
            });

            await batch.commit();

            const newQuestions = aiResult.questions.map((q, i) => ({
                ...q,
                id: newQuestionIds[i],
            })) as Question[];

            setQuestions(prev => [...prev, ...newQuestions]);

            toast({ title: 'AI Questions Added!', description: `${numAiQuestions} new questions have been added to your quiz.` });

        } catch (error) {
            console.error('Error generating AI quiz:', error);
            toast({ variant: 'destructive', title: 'AI Generation Failed', description: 'There was an error generating questions.' });
        } finally {
            setIsLoading(false);
        }
    };


    const onSubmit = async (data: QuizFormData) => {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Authentication or database service is not ready.' });
            return;
        }
        setIsLoading(true);

        try {
            if (isNewQuiz) {
                const newQuizData: Partial<Quiz> = { ...data, createdBy: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), questionIds: [] };
                const newDocRef = await addDoc(collection(firestore, 'quizzes'), newQuizData);
                toast({ title: 'Quiz Created', description: 'The new quiz has been saved successfully. You can now add questions.' });
                router.push(`/teacher/assessments/${newDocRef.id}`);
            } else {
                const currentQuizRef = doc(firestore, 'quizzes', quizId as string);
                await setDoc(currentQuizRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
                toast({ title: 'Quiz Updated', description: 'Your changes have been saved.' });
            }
        } catch (error) {
            console.error('Error saving quiz:', error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'There was an error saving the quiz.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (question: Question) => {
        setQuestionToDelete(question);
        setIsDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!firestore || !questionToDelete || !quizRef) return;
        setIsLoading(true);
        try {
            const batch = writeBatch(firestore);
            
            batch.update(quizRef, { questionIds: arrayRemove(questionToDelete.id) });
            
            const questionDocRef = doc(firestore, 'questions', questionToDelete.id);
            batch.delete(questionDocRef);

            await batch.commit();

            setQuestions(prev => prev.filter(q => q.id !== questionToDelete.id));
            toast({ title: 'Question Deleted', description: 'The question has been removed from this quiz.' });
        } catch (error) {
            console.error('Error deleting question:', error);
            toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the question.' });
        } finally {
            setIsLoading(false);
            setIsDeleteDialogOpen(false);
            setQuestionToDelete(null);
        }
    };
    
    if (isFetchingQuiz) return <QuizEditorSkeleton />;

    return (
        <>
            <Button variant="ghost" asChild className="mb-4">
                <Link href="/teacher/assessments">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Assessments
                </Link>
            </Button>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Card>
                        <CardHeader>
                            <CardTitle>{isNewQuiz ? 'Create New Assessment' : 'Edit Assessment'}</CardTitle>
                            <CardDescription>Fill out the metadata for the quiz below. Questions can be added manually or generated by AI.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="title" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl><Input placeholder="e.g., Introduction to Algebra" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="visibility" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Visibility</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select visibility" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="draft">Draft</SelectItem>
                                                <SelectItem value="published">Published</SelectItem>
                                                <SelectItem value="archived">Archived</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="subject" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Subject</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={isLoadingSubjects}>
                                            <FormControl><SelectTrigger><SelectValue placeholder={isLoadingSubjects ? "Loading..." : "Select a subject"} /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {subjects?.map(subject => <SelectItem key={subject.slug} value={subject.slug}>{subject.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="topic" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Topic</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={!subjectValue || isLoadingTopics}>
                                            <FormControl><SelectTrigger><SelectValue placeholder={!subjectValue ? "Select a subject first" : (isLoadingTopics ? 'Loading...' : "Select a topic")} /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {topics?.map(topic => <SelectItem key={topic.name} value={topic.name.toLowerCase().replace(/ /g, '-')}>{topic.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle>Questions</CardTitle>
                                        <CardDescription>{questions.length} questions in this quiz.</CardDescription>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" size="sm" variant="outline" disabled={isNewQuiz} asChild>
                                            <Link href={`/teacher/questions/new?quizId=${quizId}`}>
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Add Manually
                                            </Link>
                                        </Button>
                                         <Button type="button" size="sm" variant="default" disabled={isNewQuiz || !topicValue || isLoading} onClick={() => setIsAiModalOpen(true)}>
                                            <Bot className="mr-2 h-4 w-4" />
                                            AI Generate
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isNewQuiz ? (
                                        <p className="text-sm text-muted-foreground text-center py-8">
                                            Save the quiz metadata first to enable question management.
                                        </p>
                                    ) : isLoadingQuestions ? (
                                        <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
                                    ) : (
                                        <div className="space-y-3">
                                            {questions.length > 0 ? (
                                                questions.map((question, index) => <QuestionItem key={question.id} question={question} index={index} quizId={quizId as string} onDelete={() => handleDeleteClick(question)} />)
                                            ) : (
                                                <div className="text-sm text-muted-foreground text-center py-8">
                                                    <p>No questions yet. Add one manually or use the AI generator.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </CardContent>
                        
                        <CardFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isNewQuiz ? 'Save and Continue' : 'Save Changes'}
                            </Button>
                        </CardFooter>
                        
                    </Card>
                </form>
            </Form>

            <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Generate Quiz with AI</DialogTitle>
                        <DialogDescription>
                            Select the number of questions you want the AI to generate for the topic: <span className="font-bold text-foreground capitalize">{topicValue}</span>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        <Label>Number of Questions: <span className="font-bold text-primary">{numAiQuestions}</span></Label>
                        <Slider
                            defaultValue={[5]}
                            min={3}
                            max={10}
                            step={1}
                            onValueChange={(value) => setNumAiQuestions(value[0])}
                            className="mt-4"
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button type="button" onClick={handleAiGenerate} disabled={isLoading}>
                             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Generate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the question
                            from the database and remove it from this quiz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

const QuizEditorSkeleton = () => (
    <>
      <Skeleton className="h-10 w-48 mb-4" />
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
           <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-32" />
        </CardFooter>
      </Card>
    </>
  );

export default QuizEditorPage;
