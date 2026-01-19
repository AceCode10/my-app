'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BookOpen,
  Search,
  Clock,
  CheckCircle2,
  BookmarkCheck,
  TrendingUp,
  FileText,
  ChevronRight,
  Loader2,
  Star
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NotesSearch } from '@/components/notes/notes-search';
import Link from 'next/link';
import { format } from 'date-fns';
import type { Note, NoteBookmark, NoteProgress } from '@/types/notes';

interface NoteWithProgress {
  id: string;
  title: string;
  subtitle?: string | null;
  slug: string;
  visibility: string;
  estimated_read_time?: number | null;
  view_count?: number;
  subject_id?: string | null;
  topic_id?: string | null;
  published_at?: string | null;
  display_order?: number | null;
  subject?: any;
  topic?: any;
  note_sections?: any[];
  progress_percentage: number;
  is_bookmarked: boolean;
  last_accessed_at?: string | null;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
}

export default function StudentNotesPage() {
  const supabase = createClient();
  const { user } = useUser();

  const [notes, setNotes] = useState<NoteWithProgress[]>([]);
  const [bookmarks, setBookmarks] = useState<NoteBookmark[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Stats
  const [stats, setStats] = useState({
    totalNotes: 0,
    completedNotes: 0,
    inProgressNotes: 0,
    totalTimeSpent: 0,
    bookmarkedCount: 0
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [selectedSubject, searchQuery, user]);

  async function fetchData() {
    try {
      // Fetch subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, slug')
        .order('name');

      if (subjectsData) setSubjects(subjectsData);

      // Fetch bookmarks
      const { data: bookmarksData } = await supabase
        .from('note_bookmarks')
        .select(`
          *,
          note:notes(id, title, slug, subject_id, topic_id)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (bookmarksData) setBookmarks(bookmarksData);

      await fetchNotes();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  async function fetchNotes() {
    if (!user) return;
    setLoading(true);

    try {
      // Optimized query: fetch notes with section counts in a single query
      let query = supabase
        .from('notes')
        .select(`
          id, title, subtitle, slug, visibility, estimated_read_time, view_count,
          subject_id, topic_id, published_at, display_order,
          subject:subjects(id, name, slug),
          topic:topics(id, name, slug),
          note_sections(id)
        `)
        .neq('visibility', 'draft')
        .not('published_at', 'is', null)
        .order('display_order', { ascending: true })
        .limit(50);

      if (selectedSubject !== 'all') {
        query = query.eq('subject_id', selectedSubject);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,subtitle.ilike.%${searchQuery}%`);
      }

      const { data: notesData, error } = await query;

      if (error) throw error;
      if (!notesData || notesData.length === 0) {
        setNotes([]);
        setStats({ totalNotes: 0, completedNotes: 0, inProgressNotes: 0, totalTimeSpent: 0, bookmarkedCount: 0 });
        setLoading(false);
        return;
      }

      // Fetch progress and bookmarks in parallel
      const noteIds = notesData.map(n => n.id);
      
      const [progressResult, bookmarksResult] = await Promise.all([
        supabase
          .from('note_progress')
          .select('note_id, section_id, completed, time_spent_seconds, last_accessed_at')
          .eq('user_id', user.id)
          .in('note_id', noteIds),
        supabase
          .from('note_bookmarks')
          .select('note_id')
          .eq('user_id', user.id)
          .in('note_id', noteIds)
      ]);

      // Build progress and bookmark maps
      const progressMap = new Map<string, NoteProgress[]>();
      (progressResult.data || []).forEach(p => {
        const existing = progressMap.get(p.note_id) || [];
        existing.push(p as NoteProgress);
        progressMap.set(p.note_id, existing);
      });

      const bookmarkedNoteIds = new Set((bookmarksResult.data || []).map(b => b.note_id));

      // Calculate progress for each note - section count from joined data
      const notesWithProgress: NoteWithProgress[] = notesData.map(note => {
        const progress = progressMap.get(note.id) || [];
        const sectionCount = Array.isArray(note.note_sections) ? note.note_sections.length : 0;
        const mainProgress = progress.find(p => !p.section_id);
        const sectionProgress = progress.filter(p => p.section_id);
        
        let progressPercentage = 0;
        if (sectionCount > 0) {
          const completedSections = sectionProgress.filter(p => p.completed).length;
          progressPercentage = Math.round((completedSections / sectionCount) * 100);
        } else if (mainProgress?.completed) {
          progressPercentage = 100;
        } else if (mainProgress?.time_spent_seconds && mainProgress.time_spent_seconds > 0) {
          // Estimate progress based on time spent vs estimated read time
          const estimatedSeconds = (note.estimated_read_time || 5) * 60;
          progressPercentage = Math.min(95, Math.round((mainProgress.time_spent_seconds / estimatedSeconds) * 100));
        }

        return {
          id: note.id,
          title: note.title,
          subtitle: note.subtitle,
          slug: note.slug,
          visibility: note.visibility,
          estimated_read_time: note.estimated_read_time,
          view_count: note.view_count,
          subject_id: note.subject_id,
          topic_id: note.topic_id,
          published_at: note.published_at,
          display_order: note.display_order,
          subject: note.subject,
          topic: note.topic,
          note_sections: note.note_sections,
          progress_percentage: progressPercentage,
          is_bookmarked: bookmarkedNoteIds.has(note.id),
          last_accessed_at: mainProgress?.last_accessed_at || null
        };
      });

      setNotes(notesWithProgress);

      // Calculate stats
      const totalTimeSpent = (progressResult.data || []).reduce((acc, p) => acc + (p.time_spent_seconds || 0), 0);
      setStats({
        totalNotes: notesWithProgress.length,
        completedNotes: notesWithProgress.filter(n => n.progress_percentage === 100).length,
        inProgressNotes: notesWithProgress.filter(n => n.progress_percentage > 0 && n.progress_percentage < 100).length,
        totalTimeSpent,
        bookmarkedCount: bookmarkedNoteIds.size
      });
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredNotes = notes.filter(note => {
    if (activeTab === 'in-progress') return note.progress_percentage > 0 && note.progress_percentage < 100;
    if (activeTab === 'completed') return note.progress_percentage === 100;
    if (activeTab === 'bookmarked') return note.is_bookmarked;
    return true;
  });

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          Revision Notes
        </h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Track your reading progress across all topics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.totalNotes}</p>
                <p className="text-xs text-muted-foreground">Total Notes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.completedNotes}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-yellow-500/10 rounded-lg">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.inProgressNotes}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-blue-500/10 rounded-lg">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{formatTime(stats.totalTimeSpent)}</p>
                <p className="text-xs text-muted-foreground">Time Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card>
        <CardContent className="p-4 sm:pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex-1">
              <NotesSearch
                placeholder="Search notes..."
                className="w-full"
                onResultClick={(result) => {
                  window.location.href = `/notes/${result.slug}`;
                }}
              />
            </div>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full">
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
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex flex-wrap justify-start gap-1 h-auto p-1">
          <TabsTrigger value="all" className="text-xs sm:text-sm">All Notes</TabsTrigger>
          <TabsTrigger value="in-progress" className="text-xs sm:text-sm">
            In Progress
            {stats.inProgressNotes > 0 && (
              <Badge variant="secondary" className="ml-1 sm:ml-2 text-xs">{stats.inProgressNotes}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed</TabsTrigger>
          <TabsTrigger value="bookmarked" className="text-xs sm:text-sm">
            <BookmarkCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            Bookmarked
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4 sm:mt-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <Card>
              <CardContent className="py-8 sm:py-12 text-center">
                <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-base sm:text-lg font-medium">No notes found</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  {activeTab === 'bookmarked' 
                    ? "You haven't bookmarked any notes yet"
                    : activeTab === 'completed'
                    ? "You haven't completed any notes yet"
                    : activeTab === 'in-progress'
                    ? "Start reading some notes to see them here"
                    : "No notes available for the selected filters"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Continue Reading Section */}
      {stats.inProgressNotes > 0 && activeTab === 'all' && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Continue Reading
            </CardTitle>
            <CardDescription className="text-sm">Pick up where you left off</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {notes
                .filter(n => n.progress_percentage > 0 && n.progress_percentage < 100)
                .sort((a, b) => {
                  const aTime = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0;
                  const bTime = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0;
                  return bTime - aTime;
                })
                .slice(0, 3)
                .map((note) => (
                  <Link key={note.id} href={`/notes/${note.slug}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate text-sm sm:text-base">{note.title}</h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {(note.subject as any)?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-auto">
                        <div className="w-20 sm:w-24">
                          <Progress value={note.progress_percentage} className="h-2" />
                        </div>
                        <span className="text-sm text-muted-foreground w-8 sm:w-10 text-right">
                          {note.progress_percentage}%
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Note Card Component
function NoteCard({ note }: { note: NoteWithProgress }) {
  return (
    <Link href={`/notes/${note.slug}`}>
      <Card className="h-full hover:shadow-md hover:border-primary/50 transition-all cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base line-clamp-2">{note.title}</CardTitle>
            {note.is_bookmarked && (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
          </div>
          {note.subtitle && (
            <CardDescription className="line-clamp-2">{note.subtitle}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Subject & Topic */}
            <div className="flex flex-wrap gap-2">
              {(note.subject as any)?.name && (
                <Badge variant="secondary" className="text-xs">
                  {(note.subject as any).name}
                </Badge>
              )}
              {(note.topic as any)?.name && (
                <Badge variant="outline" className="text-xs">
                  {(note.topic as any).name}
                </Badge>
              )}
            </div>

            {/* Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{note.progress_percentage}%</span>
              </div>
              <Progress value={note.progress_percentage} className="h-2" />
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {note.estimated_read_time || 5} min
              </span>
              {note.last_accessed_at && (
                <span>Last read {format(new Date(note.last_accessed_at), 'MMM d')}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
