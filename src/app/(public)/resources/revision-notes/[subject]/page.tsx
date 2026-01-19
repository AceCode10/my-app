'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ChevronRight, BookOpen, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';

interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
}

interface Note {
  id: string;
  title: string;
  slug: string;
  topic_id: string;
  view_count: number;
  visibility: string;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  code?: string;
}

export default function SubjectRevisionNotesPage({ 
  params 
}: { 
  params: Promise<{ subject: string }>
}) {
  const { subject: subjectSlug } = use(params);
  const supabase = createClient();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicNoteCounts, setTopicNoteCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [subjectSlug]);

  async function fetchData() {
    try {
      setIsLoading(true);
      
      // Fetch subject
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('*')
        .eq('slug', subjectSlug)
        .single();

      if (subjectError) throw subjectError;
      if (!subjectData) throw new Error('Subject not found');
      
      setSubject(subjectData);

      // Fetch topics for this subject
      const { data: topicsData, error: topicsError } = await supabase
        .from('topics')
        .select('*')
        .eq('subject_id', subjectData.id)
        .order('display_order', { ascending: true });

      if (topicsError) throw topicsError;
      setTopics(topicsData || []);

      // Fetch note counts per topic
      if (topicsData && topicsData.length > 0) {
        const topicIds = topicsData.map(t => t.id);
        const { data: noteCounts, error: countError } = await supabase
          .from('notes')
          .select('topic_id')
          .in('topic_id', topicIds)
          .eq('visibility', 'public')
          .not('published_at', 'is', null);

        if (!countError && noteCounts) {
          const counts: Record<string, number> = {};
          noteCounts.forEach((n: any) => {
            counts[n.topic_id] = (counts[n.topic_id] || 0) + 1;
          });
          setTopicNoteCounts(counts);
        }
      }

      setError(null);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">Error</h1>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button onClick={fetchData} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground mb-6">
        <Link href="/resources/revision-notes" className="hover:text-primary">
          Revision Notes
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground">
          {isLoading ? <Skeleton className="h-4 w-24 inline-block" /> : subject?.name}
        </span>
      </div>


      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card p-6 rounded-xl border">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))
        ) : topics.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-card rounded-xl border">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Topics Available</h3>
            <p className="text-muted-foreground mt-2">
              Topics for this subject are being added. Check back soon!
            </p>
          </div>
        ) : (
          topics.map((topic) => {
            const noteCount = topicNoteCounts[topic.id] || 0;
            const topicSlug = topic.slug || topic.name.toLowerCase().replace(/ /g, '-');
            
            return (
              <div
                key={topic.id}
                className="bg-card p-6 rounded-xl border hover:border-primary hover:shadow-lg transition-all duration-200 flex flex-col"
              >
                <div className="flex-grow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg text-foreground">{topic.name}</h3>
                    {noteCount > 0 && (
                      <span className="ml-2 flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                        {noteCount}
                      </span>
                    )}
                  </div>
                  {topic.description && (
                    <p className="text-sm text-muted-foreground mb-4">{topic.description}</p>
                  )}
                </div>

                <Link href={`/resources/revision-notes/${subjectSlug}/${topicSlug}`}>
                  <Button 
                    className="w-full" 
                    variant={noteCount > 0 ? "default" : "secondary"}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {noteCount > 0 ? 'View Notes' : 'Coming Soon'}
                  </Button>
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
