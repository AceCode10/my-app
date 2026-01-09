'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { FlashcardDeck } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const AdminFlashcardsPage = () => {
  const supabase = createClient();
  const { toast } = useToast();
  
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);

  useEffect(() => {
    fetchDecks();
  }, []);

  async function fetchDecks() {
    const { data, error } = await supabase
      .from('flashcard_decks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching flashcard decks:', error);
    } else {
      setDecks(data || []);
    }
    setIsLoading(false);
  }

  const handleDeleteClick = (deckId: string) => {
    setSelectedDeckId(deckId);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!selectedDeckId) return;

    try {
      const { error } = await supabase
        .from('flashcard_decks')
        .delete()
        .eq('id', selectedDeckId);

      if (error) throw error;

      toast({
        title: "Deck Deleted",
        description: "The flashcard deck has been successfully deleted.",
      });
      fetchDecks();
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
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center"><Layers className="mr-2" /> Manage Flashcard Decks</CardTitle>
            <CardDescription>View and manage all flashcard decks on the platform.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : decks.length > 0 ? (
                decks.map(deck => (
                  <TableRow key={deck.id}>
                    <TableCell className="font-medium">{deck.title}</TableCell>
                    <TableCell>{deck.subject}</TableCell>
                    <TableCell>{deck.topic}</TableCell>
                    <TableCell className="font-mono text-xs">{deck.created_by}</TableCell>
                    <TableCell>
                      {deck.created_at ? format(new Date(deck.created_at), 'PPP') : 'N/A'}
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
                          <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClick(deck.id)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No flashcard decks found on the platform.
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
              This action cannot be undone. This will permanently delete the flashcard deck from the database.
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

export default AdminFlashcardsPage;
