'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft, Loader2, PlusCircle, Trash2 } from 'lucide-react';

const deckSchema = z.object({
    title: z.string().min(3, { message: "Title must be at least 3 characters." }),
    subject: z.string().min(1, { message: "Please select a subject." }),
    topic: z.string().min(1, { message: "Please select a topic." }),
    description: z.string().optional(),
    cards: z.array(z.object({
        id: z.string().optional(), // Keep track of existing cards
        front: z.string().min(1, { message: "Front side cannot be empty." }),
        back: z.string().min(1, { message: "Back side cannot be empty." }),
    })).min(1, { message: "You must have at least one flashcard." }),
});

type DeckFormData = z.infer<typeof deckSchema>;

interface Subject {
  id: string;
  name: string;
  slug: string;
}

interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

const FlashcardDeckEditorPage = () => {
    const router = useRouter();
    const params = useParams();
    const { id: deckId } = params;
    const isNewDeck = deckId === 'new';

    const supabase = createClient();
    const { user } = useUser();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(!isNewDeck);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
    
    const form = useForm<DeckFormData>({
        resolver: zodResolver(deckSchema),
        defaultValues: {
            title: '', subject: '', topic: '', description: '', cards: [{ front: '', back: '' }]
        },
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "cards" });
    const subjectValue = form.watch('subject');

    // Fetch subjects on mount
    useEffect(() => {
        async function fetchSubjects() {
            const { data } = await supabase
                .from('subjects')
                .select('id, name, slug')
                .order('name');
            if (data) setSubjects(data);
        }
        fetchSubjects();
    }, []);

    // Fetch topics when subject changes
    useEffect(() => {
        async function fetchTopics() {
            if (!selectedSubjectId) {
                setTopics([]);
                return;
            }
            const { data } = await supabase
                .from('topics')
                .select('id, name, subject_id')
                .eq('subject_id', selectedSubjectId)
                .order('name');
            if (data) setTopics(data);
        }
        fetchTopics();
    }, [selectedSubjectId]);

    // Update selected subject when form value changes
    useEffect(() => {
        if (subjectValue) {
            const subject = subjects.find(s => s.id === subjectValue);
            if (subject) {
                setSelectedSubjectId(subject.id);
            }
        }
    }, [subjectValue, subjects]);

    // Fetch existing deck data
    useEffect(() => {
        async function fetchDeck() {
            if (isNewDeck || !user) return;
            
            setIsFetching(true);
            try {
                const { data: deck, error } = await supabase
                    .from('flashcard_decks')
                    .select('*, flashcards(*)')
                    .eq('id', deckId)
                    .single();

                if (error) throw error;

                if (deck) {
                    setSelectedSubjectId(deck.subject_id || '');
                    form.reset({
                        title: deck.title,
                        subject: deck.subject_id || '',
                        topic: deck.topic_id || '',
                        description: deck.description || '',
                        cards: deck.flashcards?.length > 0 
                            ? deck.flashcards.map((c: any) => ({ id: c.id, front: c.front, back: c.back }))
                            : [{ front: '', back: '' }],
                    });
                }
            } catch (error) {
                console.error('Error fetching deck:', error);
                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load deck' });
            } finally {
                setIsFetching(false);
            }
        }
        fetchDeck();
    }, [deckId, isNewDeck, user]);

    const onSubmit = async (data: DeckFormData) => {
        if (!user) return;
        setIsLoading(true);

        try {
            let targetDeckId = deckId as string;

            if (isNewDeck) {
                // Create new deck
                const { data: newDeck, error: deckError } = await supabase
                    .from('flashcard_decks')
                    .insert({
                        title: data.title,
                        subject_id: data.subject || null,
                        topic_id: data.topic || null,
                        description: data.description || null,
                        created_by: user.id,
                    })
                    .select()
                    .single();

                if (deckError) throw deckError;
                targetDeckId = newDeck.id;
            } else {
                // Update existing deck
                const { error: updateError } = await supabase
                    .from('flashcard_decks')
                    .update({
                        title: data.title,
                        subject_id: data.subject || null,
                        topic_id: data.topic || null,
                        description: data.description || null,
                    })
                    .eq('id', deckId);

                if (updateError) throw updateError;

                // Delete existing cards
                await supabase
                    .from('flashcards')
                    .delete()
                    .eq('deck_id', deckId);
            }

            // Insert cards
            const cardsToInsert = data.cards.map((card, index) => ({
                deck_id: targetDeckId,
                front: card.front,
                back: card.back,
                order_index: index,
            }));

            const { error: cardsError } = await supabase
                .from('flashcards')
                .insert(cardsToInsert);

            if (cardsError) throw cardsError;
            
            toast({ title: `Deck ${isNewDeck ? 'Created' : 'Updated'}` });
            router.push('/teacher/flashcards');

        } catch (error) {
            console.error('Error saving deck:', error);
            toast({ variant: 'destructive', title: 'Save Failed', description: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isFetching) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>

    return (
        <>
        <Button variant="ghost" asChild className="mb-4">
            <Link href="/teacher/flashcards"><ArrowLeft className="mr-2 h-4 w-4" />Back to All Decks</Link>
        </Button>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>{isNewDeck ? 'Create New Flashcard Deck' : 'Edit Flashcard Deck'}</CardTitle>
                        <CardDescription>Fill out the metadata for your deck.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Deck Title</FormLabel><FormControl><Input placeholder="e.g., Biology - Cell Structures" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <FormField control={form.control} name="subject" render={({ field }) => (
                                <FormItem><FormLabel>Subject</FormLabel>
                                    <Select onValueChange={(value) => { field.onChange(value); setSelectedSubjectId(value); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger></FormControl>
                                        <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="topic" render={({ field }) => (
                                <FormItem><FormLabel>Topic</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSubjectId}><FormControl><SelectTrigger><SelectValue placeholder={selectedSubjectId ? "Select a topic" : "Select a subject first"} /></SelectTrigger></FormControl>
                                        <SelectContent>{topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="description" render={({ field }) => (
                           <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="A short summary of what this deck covers." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Cards in this Deck</CardTitle>
                        <CardDescription>Add or remove flashcards below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-4 items-start p-4 border rounded-lg">
                                <span className="col-span-12 md:col-span-1 font-bold text-lg text-muted-foreground pt-2">#{index + 1}</span>
                                <div className="col-span-12 md:col-span-5 space-y-2">
                                     <FormField control={form.control} name={`cards.${index}.front`} render={({ field }) => (
                                        <FormItem><FormLabel>Front</FormLabel><FormControl><Textarea placeholder="e.g., What is the powerhouse of the cell?" {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                 <div className="col-span-12 md:col-span-5 space-y-2">
                                    <FormField control={form.control} name={`cards.${index}.back`} render={({ field }) => (
                                        <FormItem><FormLabel>Back</FormLabel><FormControl><Textarea placeholder="e.g., The Mitochondria" {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                 </div>
                                <div className="col-span-12 md:col-span-1 flex items-center justify-end pt-8">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                            </div>
                        ))}
                         <Button type="button" variant="outline" size="sm" onClick={() => append({ front: '', back: '' })}><PlusCircle className="mr-2 h-4 w-4" />Add Card</Button>
                         {form.formState.errors.cards?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.cards.root.message}</p>}
                    </CardContent>
                </Card>

                 <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Deck
                    </Button>
                </div>
            </form>
        </Form>
        </>
    );
};

export default FlashcardDeckEditorPage;
