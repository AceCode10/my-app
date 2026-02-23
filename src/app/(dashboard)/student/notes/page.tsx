'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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

const supabase = createClient();

export default function StudentNotesPage() {
  const { user } = useUser();

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Fetch subjects (cached long-term)
  const { data: subjects = [] } = useQuery({
    queryKey: ['note-subjects'],
    queryFn: async () => {
      const { data } = await supabase
        .from('subjects')
        .select('id, name, slug')
        .order('name');
      return (data || []) as Subject[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Fetch all notes with progress in a single batched query
  const { data: notesData, isLoading: loading } = useQuery({
    queryKey: ['student-notes', user?.id, selectedSubject, searchQuery],
    queryFn: async () => {
      if (!user?.id) return { notes: [], stats: { totalNotes: 0, completedNotes: 0, inProgressNotes: 0, totalTimeSpent: 0, bookmarkedCount: 0 } };

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

      const { data: rawNotes, error } = await query;
      if (error) throw error;
      if (!rawNotes?.length) return { notes: [], stats: { totalNotes: 0, completedNotes: 0, inProgressNotes: 0, totalTimeSpent: 0, bookmarkedCount: 0 } };

      const noteIds = rawNotes.map(n => n.id);

      // Fetch progress and bookmarks in parallel
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

      const progressMap = new Map<string, NoteProgress[]>();
      (progressResult.data || []).forEach(p => {
        const existing = progressMap.get(p.note_id) || [];
        existing.push(p as NoteProgress);
        progressMap.set(p.note_id, existing);
      });

      const bookmarkedNoteIds = new Set((bookmarksResult.data || []).map(b => b.note_id));

      const notesWithProgress: NoteWithProgress[] = rawNotes.map(note => {
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
          const estimatedSeconds = (note.estimated_read_time || 5) * 60;
          progressPercentage = Math.min(95, Math.round((mainProgress.time_spent_seconds / estimatedSeconds) * 100));
        }

        return {
          id: note.id, title: note.title, subtitle: note.subtitle, slug: note.slug,
          visibility: note.visibility, estimated_read_time: note.estimated_read_time,
          view_count: note.view_count, subject_id: note.subject_id, topic_id: note.topic_id,
          published_at: note.published_at, display_order: note.display_order,
          subject: note.subject, topic: note.topic, note_sections: note.note_sections,
          progress_percentage: progressPercentage,
          is_bookmarked: bookmarkedNoteIds.has(note.id),
          last_accessed_at: mainProgress?.last_accessed_at || null
        };
      });

      const totalTimeSpent = (progressResult.data || []).reduce((acc, p) => acc + (p.time_spent_seconds || 0), 0);

      return {
        notes: notesWithProgress,
        stats: {
          totalNotes: notesWithProgress.length,
          completedNotes: notesWithProgress.filter(n => n.progress_percentage === 100).length,
          inProgressNotes: notesWithProgress.filter(n => n.progress_percentage > 0 && n.progress_percentage < 100).length,
          totalTimeSpent,
          bookmarkedCount: bookmarkedNoteIds.size
        }
      };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const notes = notesData?.notes || [];
  const stats = notesData?.stats || { totalNotes: 0, completedNotes: 0, inProgressNotes: 0, totalTimeSpent: 0, bookmarkedCount: 0 };

  const filteredNotes = useMemo(() => notes.filter(note => {
    if (activeTab === 'in-progress') return note.progress_percentage > 0 && note.progress_percentage < 100;
    if (activeTab === 'completed') return note.progress_percentage === 100;
    if (activeTab === 'bookmarked') return note.is_bookmarked;
    return true;
  }), [notes, activeTab]);

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
            <div className="bg-card rounded-xl border divide-y overflow-hidden">
              {filteredNotes.map((note) => (
                <Link key={note.id} href={`/notes/${note.slug}`} className="block">
                  <div className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group">
                    {/* Progress Ring */}
                    <div className="relative flex-shrink-0 w-12 h-12">
                      <svg className="w-12 h-12 transform -rotate-90">
                        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
                        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="3"
                          strokeDasharray={125.6} strokeDashoffset={125.6 - (note.progress_percentage / 100) * 125.6}
                          strokeLinecap="round"
                          className={note.progress_percentage === 100 ? "text-green-500" : note.progress_percentage > 0 ? "text-yellow-500" : "text-muted-foreground/30"}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold">
                        {note.progress_percentage}%
                      </span>
                    </div>
                    
                    {/* Note Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {note.title}
                        </h3>
                        {note.is_bookmarked && (
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {(note.subject as any)?.name && <span>{(note.subject as any).name}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {note.estimated_read_time || 5} min
                        </span>
                      </div>
                    </div>
                    
                    {/* Chevron */}
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>
                </Link>
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
