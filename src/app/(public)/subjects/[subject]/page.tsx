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
    <div className="py-8">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground mb-6">
        <Link href="/subjects" className="hover:text-primary">Subjects</Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground">
          {isLoading ? <Skeleton className="h-4 w-24 inline-block" /> : subject?.name}
        </span>
      </div>

      {/* Header */}
      <div className="mb-10 text-center">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-10 w-64 mx-auto mb-2" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </>
        ) : (
          <>
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${staticSubjectData?.color ? 'bg-primary/10' : 'bg-muted'} mb-4`}>
              <SubjectIcon className={`w-8 h-8 ${staticSubjectData?.color || 'text-primary'}`} />
            </div>
            <h1 className="text-4xl font-extrabold text-foreground">
              {subject?.name}
            </h1>
            {subject?.code && (
              <Badge variant="outline" className="mt-2 text-base px-3 py-1">
                {subject.code}
              </Badge>
            )}
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Access all study resources for {subject?.name} including revision notes, practice questions, and past papers.
            </p>
          </>
        )}
      </div>

      {/* Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card p-6 rounded-xl border">
              <Skeleton className="h-12 w-12 rounded-lg mb-4" />
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))
        ) : (
          resourceCards.map((resource) => (
            <Link key={resource.title} href={resource.href}>
              <div className="bg-card p-6 rounded-xl border hover:border-primary hover:shadow-lg transition-all duration-200 h-full flex flex-col group">
                <div className={`w-12 h-12 rounded-lg ${resource.bgColor} flex items-center justify-center mb-4`}>
                  <resource.icon className={`w-6 h-6 ${resource.color}`} />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-foreground">{resource.title}</h3>
                  {resource.count > 0 && (
                    <Badge variant="secondary">{resource.count} {resource.countLabel}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex-grow">{resource.description}</p>
                <div className="flex items-center text-primary font-medium mt-4 group-hover:gap-2 transition-all">
                  <span>Browse {resource.title}</span>
                  <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Topics Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Topics</h2>
        <p className="text-muted-foreground mb-6">
          Explore specific topics within {isLoading ? 'this subject' : subject?.name}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card p-5 rounded-xl border">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))
          ) : topics.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-card rounded-xl border">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No Topics Available Yet</h3>
              <p className="text-muted-foreground mt-2">
                Topics for {subject?.name} are being added. Check back soon!
              </p>
            </div>
          ) : (
            topics.map((topic) => {
              const topicSlug = topic.slug || topic.name.toLowerCase().replace(/ /g, '-');
              return (
                <Link 
                  key={topic.id} 
                  href={`/resources/topical-questions/${subjectSlug}/${topicSlug}`}
                >
                  <div className="bg-card p-5 rounded-xl border hover:border-primary hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-start justify-between">
                      <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {topic.name}
                      </h4>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                    </div>
                    {topic.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {!isLoading && (resourceCounts.papers > 0 || resourceCounts.questions > 0) && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
          <h3 className="font-bold text-lg text-foreground mb-2">Ready to Practice?</h3>
          <p className="text-muted-foreground mb-4">
            Start practicing with past papers or topical questions to test your knowledge.
          </p>
          <div className="flex flex-wrap gap-3">
            {resourceCounts.papers > 0 && (
              <Link href={`/resources/past-papers/${subjectSlug}`}>
                <Button>
                  <Play className="w-4 h-4 mr-2" />
                  Practice Past Papers
                </Button>
              </Link>
            )}
            {resourceCounts.questions > 0 && (
              <Link href={`/resources/topical-questions/${subjectSlug}`}>
                <Button variant="outline">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Topical Questions
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

    