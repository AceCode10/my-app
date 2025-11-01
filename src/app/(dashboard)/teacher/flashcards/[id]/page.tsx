'use client';
import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, writeBatch, query, orderBy, deleteDoc } from 'firebase/firestore';
import type { FlashcardDeck, Flashcard } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { ArrowLeft, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { allSubjects, Subject as SubjectType } from '@/lib/subjects';

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

const FlashcardDeckEditorPage = () => {
    const router = useRouter();
    const params = useParams();
    const { id: deckId } = params;
    const isNewDeck = deckId === 'new';

    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<SubjectType | null>(null);

    const deckRef = useMemoFirebase(() => {
        if (!firestore || isNewDeck) return null;
        return doc(firestore, 'flashcardDecks', deckId as string);
    }, [firestore, isNewDeck, deckId]);
    
    const cardsQuery = useMemoFirebase(() => {
        if (!deckRef) return null;
        return query(collection(deckRef, 'cards'), orderBy('order'));
    }, [deckRef]);

    const { data: deckData, isLoading: isFetchingDeck } = useDoc<FlashcardDeck>(deckRef);
    const { data: cardData, isLoading: isFetchingCards } = useCollection<Flashcard>(cardsQuery);
    
    const form = useForm<DeckFormData>({
        resolver: zodResolver(deckSchema),
        defaultValues: {
            title: '', subject: '', topic: '', description: '', cards: [{ front: '', back: '' }]
        },
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "cards" });
    const subjectSlugValue = form.watch('subject');

    useEffect(() => {
        if (subjectSlugValue) {
            const subject = allSubjects.find(s => s.slug === subjectSlugValue) || null;
            setSelectedSubject(subject);
            form.resetField('topic', { defaultValue: '' });
        } else {
            setSelectedSubject(null);
        }
    }, [subjectSlugValue, form]);

    useEffect(() => {
        if (deckData && cardData) {
            form.reset({
                title: deckData.title,
                subject: deckData.subject,
                topic: deckData.topic,
                description: deckData.description,
                cards: cardData.length > 0 ? cardData.map(c => ({ id: c.id, front: c.front, back: c.back })) : [{ front: '', back: '' }],
            });
        }
    }, [deckData, cardData, form]);

    const onSubmit = async (data: DeckFormData) => {
        if (!firestore || !user) return;
        setIsLoading(true);

        try {
            const batch = writeBatch(firestore);
            let targetDeckId = isNewDeck ? doc(collection(firestore, 'flashcardDecks')).id : deckId as string;
            const deckRef = doc(firestore, 'flashcardDecks', targetDeckId);

            const deckPayload: Omit<FlashcardDeck, 'id'> = {
                title: data.title,
                subject: data.subject,
                topic: data.topic,
                description: data.description,
                createdBy: user.uid,
                updatedAt: serverTimestamp(),
                ...(isNewDeck && { createdAt: serverTimestamp() })
            };
            batch.set(deckRef, deckPayload, { merge: true });

            // This is a simplified upsert. A more robust solution might handle deletions better.
            data.cards.forEach((card, index) => {
                const cardRef = card.id 
                    ? doc(firestore, 'flashcardDecks', targetDeckId, 'cards', card.id)
                    : doc(collection(firestore, 'flashcardDecks', targetDeckId, 'cards'));
                
                const cardPayload: Omit<Flashcard, 'id'> = {
                    front: card.front,
                    back: card.back,
                    order: index,
                    createdAt: serverTimestamp(),
                };
                batch.set(cardRef, cardPayload, { merge: true });
            });
            
            await batch.commit();
            toast({ title: `Deck ${isNewDeck ? 'Created' : 'Updated'}` });
            router.push('/teacher/flashcards');

        } catch (error) {
            console.error('Error saving deck:', error);
            toast({ variant: 'destructive', title: 'Save Failed', description: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isFetchingDeck || isFetchingCards) return <p>Loading...</p>

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
                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger></FormControl>
                                        <SelectContent>{allSubjects.map(s => <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="topic" render={({ field }) => (
                                <FormItem><FormLabel>Topic</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSubject}><FormControl><SelectTrigger><SelectValue placeholder={selectedSubject ? "Select a topic" : "Select a subject first"} /></SelectTrigger></FormControl>
                                        <SelectContent>{selectedSubject?.topics?.map(t => <SelectItem key={t.name} value={t.name.toLowerCase().replace(/ /g, '-')}>{t.name}</SelectItem>)}</SelectContent>
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
