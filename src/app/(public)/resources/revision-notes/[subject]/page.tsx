'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ChevronRight, ChevronDown, BookOpen, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  icon_url?: string;
  color?: string;
}

// Derive a short abbreviation from the subject name
// e.g. "Information and Communication Technology" → "ICT"
function getSubjectAbbreviation(name: string): string {
  const stopWords = ['and', 'the', 'of', 'in', 'for', 'with', 'to', 'a', 'an'];
  const words = name.split(/\s+/).filter(w => !stopWords.includes(w.toLowerCase()));
  if (words.length <= 2) return name; // Don't abbreviate short names
  return words.map(w => w[0]).join('').toUpperCase();
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
        const topicIds = topicsData.map((t: Topic) => t.id);
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
    <div className="py-2 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground mb-4">
        <Link href="/resources/revision-notes" className="hover:text-primary">
          Revision Notes
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground">
          {isLoading ? <Skeleton className="h-4 w-24 inline-block" /> : subject?.name}
        </span>
      </div>

      {/* Subject Header - ZNotes style with icon + short code + syllabus code */}
      {!isLoading && subject && (
        <div className="flex items-center gap-4 mb-6">
          {subject.icon_url ? (
            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border">
              <img src={subject.icon_url} alt={subject.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ backgroundColor: subject.color || '#16a34a' }}>
              <BookOpen className="w-7 h-7 text-white" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {getSubjectAbbreviation(subject.name)}{subject.code ? ` ${subject.code}` : ''}
            </h1>
            <p className="text-muted-foreground text-sm">{subject.name}</p>
          </div>
        </div>
      )}

      {/* Topics List - Modern Clean Design (Similar to Topical Questions) */}
      <div className="bg-card rounded-xl border divide-y overflow-hidden">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-5 w-5" />
            </div>
          ))
        ) : topics.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No Topics Available</h3>
            <p className="text-muted-foreground mt-2">
              Topics for this subject are being added. Check back soon!
            </p>
          </div>
        ) : (
          topics.map((topic, index) => {
            const noteCount = topicNoteCounts[topic.id] || 0;
            const topicSlug = topic.slug || topic.name.toLowerCase().replace(/ /g, '-');
            const hasNotes = noteCount > 0;
            
            return (
              <Link
                key={topic.id}
                href={`/resources/revision-notes/${subjectSlug}/${topicSlug}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group"
              >
                {/* Topic Number Circle */}
                <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{index + 1}</span>
                </div>
                
                {/* Topic Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {topic.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {hasNotes ? (
                      <>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {noteCount} note{noteCount !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          ~{Math.max(5, noteCount * 10)} min read
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground/70">Coming soon</span>
                    )}
                  </div>
                </div>
                
                {/* Chevron */}
                <ChevronDown className="w-5 h-5 text-muted-foreground -rotate-90 group-hover:text-primary transition-colors" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
