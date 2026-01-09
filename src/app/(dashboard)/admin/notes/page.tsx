'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  FileText,
  MoreHorizontal,
  Copy,
  Download,
  Globe,
  Lock,
  Clock,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import type { Note } from '@/types/notes';

interface Subject {
  id: string;
  name: string;
  slug: string;
}

interface Topic {
  id: string;
  name: string;
  slug: string;
  subject_id: string;
}

interface ExamBoard {
  id: string;
  name: string;
  code: string;
}

export default function AdminNotesPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [examBoards, setExamBoards] = useState<ExamBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('all');
  const [selectedExamBoard, setSelectedExamBoard] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'title' | 'updated_at' | 'view_count' | 'created_at'>('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Selection
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Delete dialog
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [selectedSubject, selectedVisibility, searchQuery, currentPage]);

  async function fetchInitialData() {
    try {
      const [subjectsRes, examBoardsRes] = await Promise.all([
        supabase.from('subjects').select('id, name, slug').order('name'),
        supabase.from('exam_boards').select('id, name, code').eq('is_active', true).order('display_order')
      ]);

      if (subjectsRes.data) setSubjects(subjectsRes.data);
      if (examBoardsRes.data) setExamBoards(examBoardsRes.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  }

  async function fetchNotes() {
    setLoading(true);
    try {
      let query = supabase
        .from('notes')
        .select(`
          *,
          subject:subjects(id, name, slug),
          topic:topics(id, name, slug),
          exam_board:exam_boards(id, name, code)
        `, { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

      if (selectedSubject !== 'all') {
        query = query.eq('subject_id', selectedSubject);
      }
      if (selectedVisibility !== 'all') {
        query = query.eq('visibility', selectedVisibility);
      }
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,subtitle.ilike.%${searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setNotes(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching notes:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load notes'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteNote() {
    if (!noteToDelete) return;
    setIsDeleting(true);

    try {
      // Delete sections first
      await supabase.from('note_sections').delete().eq('note_id', noteToDelete.id);
      
      // Delete the note
      const { error } = await supabase.from('notes').delete().eq('id', noteToDelete.id);
      if (error) throw error;

      toast({ title: 'Success', description: 'Note deleted successfully' });
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
      fetchNotes();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete note'
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDuplicateNote(note: Note) {
    try {
      const { data: newNote, error } = await supabase
        .from('notes')
        .insert({
          title: `${note.title} (Copy)`,
          subtitle: note.subtitle,
          slug: `${note.slug}-copy-${Date.now()}`,
          content_md: note.content_md,
          rendered_html: note.rendered_html,
          subject_id: note.subject_id,
          topic_id: note.topic_id,
          exam_board_id: note.exam_board_id,
          visibility: 'draft',
          tags: note.tags,
          is_downloadable: note.is_downloadable,
          estimated_read_time: note.estimated_read_time,
          has_latex: note.has_latex
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Success', description: 'Note duplicated successfully' });
      fetchNotes();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to duplicate note'
      });
    }
  }

  async function handleToggleVisibility(note: Note) {
    const newVisibility = note.visibility === 'public' ? 'draft' : 'public';
    const publishedAt = newVisibility === 'public' ? new Date().toISOString() : null;

    try {
      const { error } = await supabase
        .from('notes')
        .update({ visibility: newVisibility, published_at: publishedAt })
        .eq('id', note.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: newVisibility === 'public' ? 'Note published' : 'Note unpublished'
      });
      fetchNotes();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update note'
      });
    }
  }

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><Globe className="h-3 w-3 mr-1" />Public</Badge>;
      case 'registered':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Registered</Badge>;
      case 'premium':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20"><Lock className="h-3 w-3 mr-1" />Premium</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Notes Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage revision notes with sections
          </p>
        </div>
        <Link href="/admin/notes/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Note
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm font-medium">Search</Label>
              <div className="relative mt-1.5">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Subject Filter */}
            <div className="w-48">
              <Label className="text-sm font-medium">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Visibility Filter */}
            <div className="w-40">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={selectedVisibility} onValueChange={setSelectedVisibility}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{totalCount} notes</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No notes found</h3>
              <p className="text-muted-foreground mt-1">
                {searchQuery ? 'Try a different search term' : 'Create your first note to get started'}
              </p>
              {!searchQuery && (
                <Link href="/admin/notes/new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Note
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Title</TableHead>
                  <TableHead>Subject / Topic</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((note) => (
                  <TableRow key={note.id}>
                    <TableCell>
                      <div>
                        <Link 
                          href={`/admin/notes/${note.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {note.title}
                        </Link>
                        {note.subtitle && (
                          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {note.subtitle}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{(note.subject as any)?.name || '-'}</span>
                        {(note.topic as any)?.name && (
                          <span className="text-muted-foreground"> / {(note.topic as any).name}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getVisibilityBadge(note.visibility)}
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">{note.view_count || 0}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {note.updated_at ? format(new Date(note.updated_at), 'MMM d, yyyy') : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/notes/${note.id}`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/notes/${note.id}/sections`}>
                              <FileText className="h-4 w-4 mr-2" />
                              Manage Sections
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/notes/${note.slug}`} target="_blank">
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDuplicateNote(note)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleVisibility(note)}>
                            {note.visibility === 'public' ? (
                              <>
                                <Lock className="h-4 w-4 mr-2" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <Globe className="h-4 w-4 mr-2" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setNoteToDelete(note);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{noteToDelete?.title}"? This will also delete all sections. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteNote} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
