'use client';

import Link from 'next/link';
import { BookOpen, Layers, ChevronRight, ClipboardList, FileText, Presentation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Note } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { allSubjects } from '@/lib/subjects';

export default function TopicPage({ params }: { params: { subject: string, topic: string }}) {
  const { subject: subjectSlug, topic: topicSlug } = params;
  const supabase = createClient();

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [hasPresentation, setHasPresentation] = useState(false);

  const subjectData = allSubjects.find(s => s.slug === subjectSlug);
  const topicName = useMemo(() => topicSlug.replace(/-/g, ' '), [topicSlug]);

  useEffect(() => {
    async function fetchNotes() {
      // Resolve subject -> topic UUID from slugs
      const { data: subjectRow } = await supabase
        .from('subjects')
        .select('id')
        .eq('slug', subjectSlug)
        .single();

      if (!subjectRow) {
        setIsLoadingNotes(false);
        return;
      }

      const { data: topicRow } = await supabase
        .from('topics')
        .select('id')
        .eq('subject_id', subjectRow.id)
        .eq('slug', topicSlug)
        .single();

      if (!topicRow) {
        setIsLoadingNotes(false);
        return;
      }

      const { data, error } = await supabase
        .from('notes')
        .select('id, title, presentation_url')
        .eq('topic_id', topicRow.id)
        .in('visibility', ['public', 'registered', 'premium']);

      if (error) {
        console.error('Error fetching notes:', error);
      } else {
        setNotes(data || []);
        setHasPresentation((data || []).some((n: any) => !!n.presentation_url));
      }
      setIsLoadingNotes(false);
    }

    fetchNotes();
  }, [subjectSlug, topicSlug]);

  if (!subjectData) {
    return <div>Subject not found.</div>;
  }
  
  const topicData = subjectData.topics?.find(t => t.name.toLowerCase().replace(/ /g, '-') === topicSlug);
  
  if (!topicData) {
    return <div>Topic not found.</div>;
  }

  const resources = [
    { name: "Revision Notes", href: `/student/subjects/${subjectSlug}/${topicSlug}/notes`, icon: BookOpen, enabled: true },
    { name: "Flashcards", href: `/student/subjects/${subjectSlug}/${topicSlug}/flashcards`, icon: Layers, enabled: true },
    { name: "Topical Quiz", href: `/student/subjects/${subjectSlug}/${topicSlug}/quiz`, icon: FileText, enabled: true },
    { name: "Presentation", href: `/student/subjects/${subjectSlug}/${topicSlug}/presentation`, icon: Presentation, enabled: hasPresentation },
  ];

  return (
    <div>
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Link href="/student/subjects" className="hover:text-primary">My Subjects</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/student/subjects/${subjectSlug}`} className="hover:text-primary">{subjectData.name}</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground capitalize">{topicName}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <aside className="lg:col-span-1 bg-card p-4 rounded-2xl shadow-sm border sticky top-24">
          <h3 className="font-bold text-lg text-foreground px-2 mb-2">{subjectData.name} Topics</h3>
          <nav className="flex flex-col space-y-1">
            {subjectData.topics?.map(t => {
              const currentTopicSlug = t.name.toLowerCase().replace(/ /g, '-');
              const href = `/student/subjects/${subjectSlug}/${currentTopicSlug}`;
              const isActive = topicSlug === currentTopicSlug;
              return (
                <Link href={href} key={t.name}>
                  <div className={cn(
                    "p-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                    {t.name}
                  </div>
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="lg:col-span-3 space-y-8">
          <div className="bg-card p-8 rounded-2xl shadow-sm border">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-extrabold text-foreground capitalize">{topicName}</h1>
              <p className="text-muted-foreground mt-2">{topicData.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {resources.map(resource => (
                <Link 
                  href={resource.enabled ? resource.href : '#'} 
                  key={resource.name}
                  className={cn(
                    "group",
                    !resource.enabled && "pointer-events-none opacity-50"
                  )}
                  aria-disabled={!resource.enabled}
                  tabIndex={!resource.enabled ? -1 : undefined}
                >
                  <div className="bg-background p-6 rounded-2xl shadow-sm border text-center group-hover:shadow-md group-hover:border-primary transition-all duration-200 h-full">
                    <resource.icon className="w-10 h-10 mx-auto text-primary mb-3" />
                    <h3 className="font-bold text-lg text-foreground">{resource.name}</h3>
                    {!resource.enabled && <span className="text-xs text-muted-foreground">(Coming Soon)</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="mr-3 h-6 w-6" />
                Available Notes
              </CardTitle>
              <CardDescription>All the detailed revision notes available for this topic.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingNotes ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : notes.length > 0 ? (
                <div className="space-y-2">
                  {notes.map(note => (
                    <Link key={note.id} href={`/student/subjects/${subjectSlug}/${topicSlug}/notes`}>
                      <div className="flex items-center p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <BookOpen className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                        <span className="font-medium text-foreground">{note.title}</span>
                        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>No revision notes are available for this topic yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
