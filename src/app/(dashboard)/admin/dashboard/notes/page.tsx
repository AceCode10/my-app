'use client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, MoreHorizontal, Search, Eye } from 'lucide-react';
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
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotes } from '@/hooks/use-notes';
import { createClient } from '@/lib/supabase/client';

const AdminNotesPage = () => {
    const supabase = createClient();
    const { toast } = useToast();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [topics, setTopics] = useState<any[]>([]);
    
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [selectedTopic, setSelectedTopic] = useState('all');
    const [selectedVisibility, setSelectedVisibility] = useState('all');

    // Fetch subjects from database
    useEffect(() => {
        async function fetchSubjects() {
            const { data } = await supabase.from('subjects').select('*').order('name');
            if (data) setSubjects(data);
        }
        fetchSubjects();
    }, []);

    // Fetch topics when subject changes
    useEffect(() => {
        async function fetchTopics() {
            if (selectedSubject === 'all') {
                setTopics([]);
                return;
            }
            const { data } = await supabase
                .from('topics')
                .select('*')
                .eq('subject_id', selectedSubject)
                .order('ordering');
            if (data) setTopics(data);
        }
        fetchTopics();
        setSelectedTopic('all');
    }, [selectedSubject]);

    const topicId = selectedTopic !== 'all' ? selectedTopic : null;

    const { notes, isLoading, error } = useNotes({
        searchTerm,
        subjectId: selectedSubject,
        topicId: topicId,
        visibility: selectedVisibility,
        authorId: null // Fetch all notes for admin
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
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-foreground">Manage Notes</h2>
                    <p className="text-muted-foreground mt-1">View, edit, search, and manage all revision notes on the platform.</p>
                </div>
                 <Button asChild>
                    <Link href="/admin/dashboard/notes/new">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create New Note
                    </Link>
                </Button>
            </div>

             <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="flex items-center"><Search className="mr-2"/> Filter Notes</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Input 
                        placeholder="Search by title..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by subject" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Subjects</SelectItem>
                            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={selectedTopic} onValueChange={setSelectedTopic} disabled={selectedSubject === 'all'}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by topic" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Topics</SelectItem>
                            {topics.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Select value={selectedVisibility} onValueChange={setSelectedVisibility}>
                        <SelectTrigger>
                            <SelectValue placeholder="Filter by visibility" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Visibilities</SelectItem>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="registered">Registered</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
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
                                <TableHead>Author ID</TableHead>
                                <TableHead>Visibility</TableHead>
                                <TableHead className="text-center">Views</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-10 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                                    </TableRow>
                                ))
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-destructive">
                                        Error loading notes: {error.message}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                notes.map(note => (
                                    <TableRow key={note.id}>
                                        <TableCell className="font-medium">{note.title}</TableCell>
                                        <TableCell className="capitalize">{subjects.find(s => s.id === note.subject_id)?.name || 'N/A'}</TableCell>
                                        <TableCell className="capitalize">{topics.find(t => t.id === note.topic_id)?.name || 'N/A'}</TableCell>
                                        <TableCell className="font-mono text-xs">{note.author_id?.substring(0, 8) || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant={getBadgeVariant(note.visibility)}>{note.visibility || 'draft'}</Badge>
                                        </TableCell>
                                        <TableCell className="text-center font-medium">{note.view_count || 0}</TableCell>
                                        <TableCell>
                                            {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : 'N/A'}
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
                                                    <DropdownMenuItem asChild><Link href={`/admin/dashboard/notes/${note.id}`}>Edit</Link></DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteClick(note.id)}>Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                             {!isLoading && notes.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No notes found matching your criteria.
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
        </>
    );
};

export default AdminNotesPage;
