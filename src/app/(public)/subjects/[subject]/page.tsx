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
      const topicIds = (topicsData || []).map((t: Topic) => t.id);
      
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

      {/* Resource Cards - Tutopiya Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl border">
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-5 w-5" />
            </div>
          ))
        ) : (
          <>
            {/* Revision Notes - Blue theme */}
            <Link href={`/resources/revision-notes/${subjectSlug}`}>
              <div className="flex items-center justify-between p-4 rounded-xl border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900 hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-700 dark:text-blue-300">Revision Notes</span>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            
            {/* Topical Questions - Green theme */}
            <Link href={`/resources/topical-questions/${subjectSlug}`}>
              <div className="flex items-center justify-between p-4 rounded-xl border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900 hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <ClipboardList className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-700 dark:text-green-300">Topical Questions</span>
                </div>
                <ArrowRight className="w-5 h-5 text-green-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            
            {/* Past Papers - Purple theme */}
            <Link href={`/resources/past-papers/${subjectSlug}`}>
              <div className="flex items-center justify-between p-4 rounded-xl border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900 hover:shadow-md transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-purple-700 dark:text-purple-300">Past Papers</span>
                </div>
                <ArrowRight className="w-5 h-5 text-purple-500 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            
            {/* Videos - Coming Soon - Orange theme */}
            <div className="flex items-center justify-between p-4 rounded-xl border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900 opacity-60 cursor-not-allowed">
              <div className="flex items-center gap-3">
                <Play className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <span className="font-medium text-orange-700 dark:text-orange-300">Videos</span>
                <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
              </div>
              <ArrowRight className="w-5 h-5 text-orange-500" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}