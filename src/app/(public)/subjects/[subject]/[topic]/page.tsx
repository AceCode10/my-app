'use client';

import { getSubjectBySlug } from '@/lib/subjects';
import Link from 'next/link';
import { BookOpen, FileText, Layers, ChevronRight, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Note } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TopicPage({ params }: { params: { subject: string, topic: string }}) {
  const { subject: subjectSlug, topic: topicSlug } = params;
  const supabase = createClient();
  const subjectData = getSubjectBySlug(subjectSlug);
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);

  const topicName = useMemo(() => topicSlug.replace(/-/g, ' '), [topicSlug]);
  const topicId = `${subjectSlug}-${topicSlug}`;

  useEffect(() => {
    async function fetchNotes() {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('topic_id', topicId)
        .eq('visibility', 'public');

      if (error) {
        console.error('Error fetching notes:', error);
      } else {
        setNotes(data || []);
      }
      setIsLoadingNotes(false);
    }

    fetchNotes();
  }, [topicId]);

  if (!subjectData) {
    return <div>Subject not found.</div>;
  }
  
  const topicData = subjectData.topics?.find(t => t.name.toLowerCase().replace(/ /g, '-') === topicSlug);
  
  if (!topicData) {
    return <div>Topic not found.</div>;
  }

  const resources = [
    { name: "Revision Notes", href: `/subjects/${subjectSlug}/${topicSlug}/notes`, icon: BookOpen, enabled: true },
    { name: "Flashcards", href: `/subjects/${subjectSlug}/${topicSlug}/flashcards`, icon: Layers, enabled: true },
    { name: "Topical Quiz", href: `/subjects/${subjectSlug}/${topicSlug}/quiz?from=public`, icon: FileText, enabled: true },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Link href="/resources" className="hover:text-primary">Resources</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link href={`/subjects/${subjectSlug}`} className="hover:text-primary">{subjectData.name}</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground capitalize">{topicName}</span>
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-4xl font-extrabold text-foreground capitalize">{topicName}</h1>
        <p className="text-muted-foreground mt-2">{topicData.description}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {resources.map(resource => (
          <Link 
            href={resource.enabled ? resource.href : '#'} 
            key={resource.name} 
            className={cn(!resource.enabled && "pointer-events-none opacity-50")}
            aria-disabled={!resource.enabled}
            tabIndex={!resource.enabled ? -1 : undefined}
          >
            <div className="bg-background p-6 rounded-2xl shadow-sm border text-center hover:shadow-md hover:border-primary transition-all duration-200 h-full">
              <resource.icon className="w-10 h-10 mx-auto text-primary mb-3" />
              <h3 className="font-bold text-lg text-foreground">{resource.name}</h3>
              {!resource.enabled && <span className="text-xs text-muted-foreground">(Coming Soon)</span>}
            </div>
          </Link>
        ))}
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
                <Link key={note.id} href={`/subjects/${subjectSlug}/${topicSlug}/notes`}>
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
              <p>No revision notes are available for this topic yet. Check back soon!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
