'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import type { Question } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const questionSchema = z.object({
  stem: z.string().min(5, "Stem must be at least 5 characters."),
  type: z.enum(['mcq', 'short_answer', 'structured', 'essay', 'matching', 'tf', 'data_response']),
  marks: z.coerce.number().min(1, "Marks must be at least 1."),
  status: z.enum(['draft', 'published', 'archived']),
  markScheme: z.string().min(1, "Mark scheme is required."),
  options: z.array(z.object({ value: z.string().min(1, "Option cannot be empty.") })).optional(),
  correctAnswer: z.string().min(1, "A correct answer is required."),
});

type QuestionFormData = z.infer<typeof questionSchema>;

const QuestionEditorPage = () => {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { id: questionId } = params;
    const quizId = searchParams.get('quizId');
    const isNewQuestion = questionId === 'new';

    const supabase = createClient();
    const { user } = useUser();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(!isNewQuestion);

    const form = useForm<QuestionFormData>({
        resolver: zodResolver(questionSchema),
        defaultValues: {
            stem: '',
            type: 'mcq',
            marks: 1,
            status: 'draft',
            markScheme: '',
            options: [{ value: '' }, { value: '' }, { value: '' }, { value: '' }],
            correctAnswer: '',
        },
    });

    const questionType = form.watch('type');

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "options"
    });

    useEffect(() => {
        if (questionType !== 'mcq') {
            form.setValue('options', []);
        } else if (questionType === 'mcq' && form.getValues('options')?.length === 0) {
            form.setValue('options', [{ value: '' }, { value: '' }, { value: '' }, { value: '' }]);
        }
    }, [questionType, form]);

    const onSubmit = async (data: QuestionFormData) => {
        if (!user || !quizId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Required services or quiz ID are missing.' });
            return;
        }
        setIsLoading(true);

        const questionData = {
            question_text: data.stem,
            question_type: data.type,
            marks: data.marks,
            status: data.status,
            mark_scheme: data.markScheme,
            options: data.type === 'mcq' ? data.options?.map((o, i) => ({ id: `opt_${i}`, label: o.value })) : [],
            correct_answer: data.correctAnswer,
            assessment_id: quizId,
            created_by: user.id,
        };

        try {
            if (isNewQuestion) {
                const { error } = await supabase
                    .from('questions')
                    .insert(questionData);

                if (error) throw error;
                toast({ title: 'Question Added', description: 'The new question has been added to the quiz.' });
            } else {
                const { error } = await supabase
                    .from('questions')
                    .update({
                        question_text: data.stem,
                        question_type: data.type,
                        marks: data.marks,
                        status: data.status,
                        mark_scheme: data.markScheme,
                        options: data.type === 'mcq' ? data.options?.map((o, i) => ({ id: `opt_${i}`, label: o.value })) : [],
                        correct_answer: data.correctAnswer,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', questionId);

                if (error) throw error;
                toast({ title: 'Question Updated', description: 'The question has been saved.' });
            }
            router.push(`/teacher/assessments/${quizId}`);
        } catch (error) {
            console.error('Error saving question:', error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'There was an error saving the question.' });
        } finally {
            setIsLoading(false);
        }
    };


    // Handle back navigation logic
    const handleBack = () => {
        if (quizId) {
            router.push(`/teacher/assessments/${quizId}`);
        } else {
            router.push('/teacher/assessments');
        }
    };

    return (
        <>
            <Button variant="ghost" onClick={handleBack} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Quiz Editor
            </Button>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Card>
                        <CardHeader>
                            <CardTitle>{isNewQuestion ? 'Create New Question' : 'Edit Question'}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <FormField control={form.control} name="stem" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Stem (Question Text)</FormLabel>
                                    <FormControl><Textarea placeholder="e.g., What is the capital of France?" {...field} rows={5} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Question Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                                                <SelectItem value="short_answer">Short Answer</SelectItem>
                                                <SelectItem value="structured" disabled>Structured</SelectItem>
                                                <SelectItem value="essay" disabled>Essay</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                 <FormField control={form.control} name="marks" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Marks</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g., 5" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="status" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
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

                            {questionType === 'mcq' && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Answer Options</CardTitle>
                                        <CardDescription>Enter the options and select the correct one.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <FormField control={form.control} name="correctAnswer" render={({ field }) => (
                                            <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-3">
                                                {fields.map((item, index) => (
                                                    <FormField key={item.id} control={form.control} name={`options.${index}.value`} render={({ field: optionField }) => (
                                                        <FormItem className="flex items-center space-x-3">
                                                            <FormControl>
                                                                <RadioGroupItem value={optionField.value || ''} id={`option-radio-${index}`} />
                                                            </FormControl>
                                                            <div className="flex-grow">
                                                                <Input {...optionField} placeholder={`Option ${index + 1}`} />
                                                            </div>
                                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 2}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </FormItem>
                                                    )} />
                                                ))}
                                            </RadioGroup>
                                        )} />
                                        <FormMessage>{form.formState.errors.correctAnswer?.message}</FormMessage>
                                        <Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => append({ value: '' })}>
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}

                             {questionType === 'short_answer' && (
                                <FormField control={form.control} name="correctAnswer" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Correct Answer</FormLabel>
                                        <FormControl><Input placeholder="Enter the exact correct answer" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            )}

                            <FormField control={form.control} name="markScheme" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mark Scheme</FormLabel>
                                    <FormControl><Textarea placeholder="Explain why the correct answer is correct and provide marking guidance." {...field} rows={4} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isLoading ? 'Saving Question...' : 'Save Question'}
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        </>
    )
}

export default QuestionEditorPage;
