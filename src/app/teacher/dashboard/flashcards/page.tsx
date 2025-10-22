'use client';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, where } from 'firebase/firestore';
import type { FlashcardDeck } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
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
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const TeacherFlashcardsPage = () => {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

    const decksQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'flashcardDecks'), where('createdBy', '==', user.uid), orderBy('createdAt', 'desc'));
    }, [firestore, user]);

    const { data: decks, isLoading, error } = useCollection<FlashcardDeck>(decksQuery);

    const handleDeleteClick = (deckId: string) => {
        setSelectedDeckId(deckId);
        setIsDeleteDialogOpen(true);
    };
    
    const handleDeleteConfirm = async () => {
        if (!firestore || !selectedDeckId) return;
        // Note: Deleting subcollections like cards requires a Cloud Function for production.
        // For this demo, we'll just delete the deck document itself.
        try {
            await deleteDoc(doc(firestore, "flashcardDecks", selectedDeckId));
            toast({
                title: "Deck Deleted",
                description: "The flashcard deck has been successfully deleted.",
            });
        } catch (error) {
            console.error("Error deleting deck: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "There was a problem deleting the deck.",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setSelectedDeckId(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>My Flashcard Decks</CardTitle>
                            <CardDescription>Manage all flashcard decks you have created.</CardDescription>
                        </div>
                        <Button asChild>
                            <Link href="/teacher/dashboard/flashcards/new">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Create New Deck
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Topic</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                    </TableRow>
                                ))
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-destructive">
                                        Error loading decks: {error.message}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                decks?.map(deck => (
                                    <TableRow key={deck.id}>
                                        <TableCell className="font-medium">{deck.title}</TableCell>
                                        <TableCell>{deck.subject}</TableCell>
                                        <TableCell>{deck.topic}</TableCell>
                                        <TableCell>
                                            {deck.createdAt ? format(deck.createdAt.toDate(), 'PPP') : 'N/A'}
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
                                                    <DropdownMenuItem asChild><Link href={`/teacher/dashboard/flashcards/${deck.id}`}>Edit</Link></DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(deck.id)}>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                             {!isLoading && decks?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No flashcard decks found. Get started by creating one.
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
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the flashcard deck. Note: The cards inside the deck need to be deleted separately via a script.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default TeacherFlashcardsPage;
