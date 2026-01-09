
'use client';
import { useState } from 'react';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Search, Eye } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import withRole from '@/hooks/withRole';
import { useNotes } from '@/hooks/use-notes';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TeacherNotesPage = () => {
    const supabase = createClient();
    const { user } = useUser();
    const { toast } = useToast();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('all');

    const { notes, isLoading, error } = useNotes({
        searchTerm,
        subjectId: selectedSubject,
        authorId: user?.id, // Fetch only notes by the current teacher
    });

    const getBadgeVariant = (visibility: string | undefined) => {
        switch (visibility) {
            case 'public': return 'default';
            case 'premium': return 'secondary';
            default: return 'outline';
        }
    }

    const handleDeleteClick = (noteId: string) => {
        setSelectedNoteId(noteId);
        setIsDeleteDialogOpen(true);
    };
    
    const handleDeleteConfirm = async () => {
        if (!selectedNoteId) return;

        try {
            const { error } = await supabase
                .from('notes')
                .delete()
                .eq('id', selectedNoteId);

            if (error) throw error;

            toast({
                title: "Note Deleted",
                description: "The note has been successfully deleted.",
            });
        } catch (error) {
            console.error("Error deleting note: ", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "There was a problem deleting the note.",
            });
        } finally {
            setIsDeleteDialogOpen(false);
            setSelectedNoteId(null);
        }
    };

    return (
        <div>
             <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-foreground">My Revision Notes</h2>
                    <p className="text-muted-foreground mt-1">Manage all the revision notes you have created.</p>
                </div>
                 <Button asChild>
                    <Link href="/teacher/notes/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Note
                    </Link>
                </Button>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center"><Search className="mr-2"/> Filter My Notes</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-4">
                    <Input 
                        placeholder="Search by title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="max-w-sm"
                    />
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger className="w-full md:w-[180px]">
                            <SelectValue placeholder="Filter by subject" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Subjects</SelectItem>
                            <SelectItem value="accounting">Accounting</SelectItem>
                            <SelectItem value="biology">Biology</SelectItem>
                            <SelectItem value="business-studies">Business Studies</SelectItem>
                            <SelectItem value="chemistry">Chemistry</SelectItem>
                            <SelectItem value="computer-science">Computer Science</SelectItem>
                            <SelectItem value="economics">Economics</SelectItem>
                            <SelectItem value="ict">ICT</SelectItem>
                            <SelectItem value="mathematics">Mathematics</SelectItem>
                            <SelectItem value="physics">Physics</SelectItem>
                        </SelectContent>
                    </Select>
                </CardContent>
             </Card>

            <Card>
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Topic</TableHead>
                                <TableHead>Visibility</TableHead>
                                <TableHead className="text-center">Views</TableHead>
                                <TableHead>Last Updated</TableHead>
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
                                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                    </TableRow>
                                ))
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-destructive">
                                        Error loading notes: {error.message}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                notes.map(note => (
                                    <TableRow key={note.id}>
                                        <TableCell className="font-medium">{note.title}</TableCell>
                                        <TableCell className="capitalize">{note.subject_id?.replace(/-/g, ' ')}</TableCell>
                                        <TableCell className="capitalize">{note.topic_id?.split('-').slice(1).join(' ')}</TableCell>
                                        <TableCell>
                                            <Badge variant={getBadgeVariant(note.visibility)}>{note.visibility || 'public'}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">{note.view_count || 0}</TableCell>
                                        <TableCell>
                                            {note.updated_at ? format(new Date(note.updated_at), 'PPP') : 'N/A'}
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
                                                    <DropdownMenuItem asChild><Link href={`/teacher/notes/${note.id}`}>Edit</Link></DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(note.id)}>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                             {!isLoading && notes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No notes found. Get started by creating one.
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
                        This action cannot be undone. This will permanently delete the note from the database.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default withRole(TeacherNotesPage, ['teacher', 'admin']);
