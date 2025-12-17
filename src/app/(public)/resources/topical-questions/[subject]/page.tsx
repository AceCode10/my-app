'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ChevronRight, BookOpen, Clock, BarChart3, Play, Download, FileText } from 'lucide-react';
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
  pdf_url?: string;
  answers_pdf_url?: string;
  estimated_time?: number;
}

interface Subject {
  id: string;
  name: string;
  slug: string;
  code?: string;
}

export default function SubjectTopicalQuestionsPage({ 
  params 
}: { 
  params: Promise<{ subject: string }>
}) {
  const { subject: subjectSlug } = use(params);
  const supabase = createClient();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicQuestionCounts, setTopicQuestionCounts] = useState<Record<string, number>>({});
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
        .order('name', { ascending: true });

      if (topicsError) throw topicsError;
      setTopics(topicsData || []);

      // Fetch question counts per topic
      if (topicsData && topicsData.length > 0) {
        const topicIds = topicsData.map(t => t.id);
        const { data: questionCounts, error: countError } = await supabase
          .from('questions')
          .select('topic_id')
          .in('topic_id', topicIds);

        if (!countError && questionCounts) {
          const counts: Record<string, number> = {};
          questionCounts.forEach((q: any) => {
            counts[q.topic_id] = (counts[q.topic_id] || 0) + 1;
          });
          setTopicQuestionCounts(counts);
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
        <Link href="/resources/topical-questions" className="hover:text-primary">
          Topical Questions
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground">
          {isLoading ? <Skeleton className="h-4 w-24 inline-block" /> : subject?.name}
        </span>
      </div>

      {/* Header */}
      <div className="mb-8">
        {isLoading ? (
          <>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold text-foreground">
              {subject?.name} - Topical Questions
            </h1>
            <p className="text-muted-foreground mt-2">
              Select a topic to practice questions. Each topic contains exam-style questions with instant feedback.
            </p>
          </>
        )}
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
            const questionCount = topicQuestionCounts[topic.id] || 0;
            const topicSlug = topic.slug || topic.name.toLowerCase().replace(/ /g, '-');
            const hasPdf = !!topic.pdf_url;
            const hasQuestions = questionCount > 0;
            const isAvailable = hasPdf || hasQuestions;
            
            return (
              <div
                key={topic.id}
                className="bg-card p-6 rounded-xl border hover:border-primary hover:shadow-lg transition-all duration-200 flex flex-col"
              >
                <div className="flex-grow">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg text-foreground">{topic.name}</h3>
                    <div className="flex gap-1">
                      {hasPdf && (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="w-3 h-3 mr-1" />
                          PDF
                        </Badge>
                      )}
                      {hasQuestions && (
                        <Badge variant="secondary" className="text-xs">
                          {questionCount} Q{questionCount !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {topic.description && (
                    <p className="text-sm text-muted-foreground mb-4">{topic.description}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Clock className="w-3 h-3" />
                  <span>~{topic.estimated_time || Math.max(5, Math.ceil(questionCount * 1.5))} mins</span>
                  <BarChart3 className="w-3 h-3 ml-2" />
                  <span>Mixed difficulty</span>
                </div>

                <div className="flex gap-2">
                  {hasPdf && (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <a href={topic.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-1" />
                        PDF
                      </a>
                    </Button>
                  )}
                  <Link href={`/resources/topical-questions/${subjectSlug}/${topicSlug}`} className={hasPdf ? "flex-1" : "w-full"}>
                    <Button 
                      className="w-full" 
                      disabled={!isAvailable}
                      variant={isAvailable ? "default" : "secondary"}
                      size={hasPdf ? "sm" : "default"}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      {hasQuestions ? 'Practice' : hasPdf ? 'View' : 'Coming Soon'}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
