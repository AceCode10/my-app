'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ChevronRight, FileText, BookOpen, ClipboardList, Calendar, Play, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { getSubjectBySlug } from '@/lib/subjects';

interface Topic {
  id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  code?: string;
}

interface ResourceCounts {
  notes: number;
  questions: number;
  papers: number;
}

export default function SubjectPage({ 
  params 
}: { 
  params: Promise<{ subject: string }>
}) {
  const { subject: subjectSlug } = use(params);
  const supabase = createClient();
  
  // Get static subject data for icon/color
  const staticSubjectData = getSubjectBySlug(subjectSlug);
  
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [resourceCounts, setResourceCounts] = useState<ResourceCounts>({ notes: 0, questions: 0, papers: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [subjectSlug]);

  async function fetchData() {
    try {
      setIsLoading(true);
      
      // Fetch subject from database
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

      // Fetch resource counts
      const topicIds = (topicsData || []).map(t => t.id);
      
      // Count notes
      const { count: notesCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .in('topic_id', topicIds.length > 0 ? topicIds : ['none'])
        .eq('visibility', 'public')
        .not('published_at', 'is', null);

      // Count questions
      const { count: questionsCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .in('topic_id', topicIds.length > 0 ? topicIds : ['none']);

      // Count past papers
      const { count: papersCount } = await supabase
        .from('past_papers')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subjectData.id)
        .eq('status', 'published');

      setResourceCounts({
        notes: notesCount || 0,
        questions: questionsCount || 0,
        papers: papersCount || 0
      });

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

  const SubjectIcon = staticSubjectData?.icon || BookOpen;

  // Resource cards configuration
  const resourceCards = [
    {
      title: 'Revision Notes',
      description: 'Comprehensive study notes organized by topic',
      icon: BookOpen,
      href: `/resources/revision-notes/${subjectSlug}`,
      count: resourceCounts.notes,
      countLabel: 'notes',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Topical Questions',
      description: 'Practice questions organized by topic',
      icon: ClipboardList,
      href: `/resources/topical-questions/${subjectSlug}`,
      count: resourceCounts.questions,
      countLabel: 'questions',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Past Papers',
      description: 'Official exam papers with mark schemes',
      icon: FileText,
      href: `/resources/past-papers/${subjectSlug}`,
      count: resourceCounts.papers,
      countLabel: 'papers',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="py-8 space-y-6">
      {/* Breadcrumb with subject name */}
      <div className="flex items-center text-sm text-muted-foreground">
        <Link href="/subjects" className="hover:text-primary">Subjects</Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-foreground">
          {isLoading ? <Skeleton className="h-4 w-24 inline-block" /> : subject?.name}
        </span>
        {subject?.code && (
          <>
            <span className="mx-2">•</span>
            <span className="text-muted-foreground">{subject.code}</span>
          </>
        )}
      </div>

      {/* Resource Cards - Clean Style */}
      <div className="grid grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card p-6 rounded-xl border">
              <Skeleton className="h-8 w-8 mx-auto mb-2 rounded" />
              <Skeleton className="h-4 w-16 mx-auto" />
            </div>
          ))
        ) : (
          <>
            <Link href={`/resources/revision-notes/${subjectSlug}`}>
              <div className="bg-card p-6 rounded-xl border hover:border-primary hover:shadow-lg transition-all duration-200 text-center group">
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📖</div>
                <div className="font-medium text-sm">Notes</div>
              </div>
            </Link>
            
            <Link href={`/resources/topical-questions/${subjectSlug}`}>
              <div className="bg-card p-6 rounded-xl border hover:border-primary hover:shadow-lg transition-all duration-200 text-center group">
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📝</div>
                <div className="font-medium text-sm">Topical Questions</div>
              </div>
            </Link>
            
            <Link href={`/resources/past-papers/${subjectSlug}`}>
              <div className="bg-card p-6 rounded-xl border hover:border-primary hover:shadow-lg transition-all duration-200 text-center group">
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📄</div>
                <div className="font-medium text-sm">Past Papers</div>
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

    