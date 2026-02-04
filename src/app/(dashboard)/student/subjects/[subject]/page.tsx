'use client';

import React, { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ChevronRight, 
  BookOpen, 
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const supabase = createClient();

interface SubjectPageProps {
  params: Promise<{ subject: string }>;
}

export default function SubjectPage({ params }: SubjectPageProps) {
  const resolvedParams = use(params);
  const subjectSlug = resolvedParams.subject;

  // Fetch subject from database - with caching
  const { data: subjectData, isLoading, error } = useQuery({
    queryKey: ['subject', subjectSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          id,
          name,
          slug,
          code,
          description,
          icon_url,
          color,
          exam_board_id,
          level,
          status
        `)
        .eq('slug', subjectSlug)
        .single();
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  // Fetch topics for this subject - with caching
  const { data: topics = [] } = useQuery({
    queryKey: ['subject-topics', subjectData?.id],
    queryFn: async () => {
      if (!subjectData?.id) return [];
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, slug, description, display_order, status')
        .eq('subject_id', subjectData.id)
        .eq('status', 'published')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!subjectData?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  // Fetch resource counts - use subject_id directly for more reliable counts - with caching
  const { data: resourceData } = useQuery({
    queryKey: ['subject-resources', subjectData?.id],
    queryFn: async () => {
      if (!subjectData?.id) return { notes: 0, questions: 0, papers: 0 };
      
      // Batch all count queries in parallel for better performance
      const [notesResult, questionsResult, papersResult] = await Promise.all([
        supabase.from('notes').select('*', { count: 'exact', head: true })
          .eq('subject_id', subjectData.id).in('visibility', ['public', 'registered']).not('published_at', 'is', null),
        supabase.from('questions').select('*', { count: 'exact', head: true })
          .eq('subject_id', subjectData.id),
        supabase.from('past_papers').select('*', { count: 'exact', head: true })
          .eq('subject_id', subjectData.id).eq('status', 'published')
      ]);

      return {
        notes: notesResult.count || 0,
        questions: questionsResult.count || 0,
        papers: papersResult.count || 0
      };
    },
    enabled: !!subjectData?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  // Fetch user progress for this subject (real-time with refetch)
  const { data: userProgress } = useQuery({
    queryKey: ['subject-user-progress', subjectData?.id],
    queryFn: async () => {
      if (!subjectData?.id) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user progress from user_topic_progress table
      const { data: topicProgress } = await supabase
        .from('user_topic_progress')
        .select('notes_read, questions_attempted')
        .eq('user_id', user.id)
        .eq('subject_id', subjectData.id);

      // Sum up progress across all topics
      const notesRead = topicProgress?.reduce((sum: number, tp: { notes_read?: number }) => sum + (tp.notes_read || 0), 0) || 0;
      const questionsAnswered = topicProgress?.reduce((sum: number, tp: { questions_attempted?: number }) => sum + (tp.questions_attempted || 0), 0) || 0;

      // Get papers completed - use assessment_attempts table
      const { count: papersCompleted } = await supabase
        .from('assessment_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'completed');

      // Also check quiz_attempts for topical question progress
      const { count: quizAttempts } = await supabase
        .from('quiz_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      console.log('[SubjectPage] User progress:', { notesRead, questionsAnswered, quizAttempts, papersCompleted });

      return {
        notesRead: notesRead,
        questionsAnswered: questionsAnswered + (quizAttempts || 0),
        papersCompleted: papersCompleted || 0
      };
    },
    enabled: !!subjectData?.id,
    staleTime: 60 * 1000, // Cache for 1 minute
  });

  // Calculate progress percentages
  const notesProgress = resourceData?.notes ? Math.round(((userProgress?.notesRead || 0) / resourceData.notes) * 100) : 0;
  const questionsProgress = resourceData?.questions ? Math.round(((userProgress?.questionsAnswered || 0) / resourceData.questions) * 100) : 0;
  const papersProgress = resourceData?.papers ? Math.round(((userProgress?.papersCompleted || 0) / resourceData.papers) * 100) : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error || !subjectData) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mb-6">
          <BookOpen className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Subject not found</h2>
        <p className="text-muted-foreground mb-6">The subject you're looking for doesn't exist or has been removed.</p>
        <Link href="/student/subjects">
          <Button size="lg">
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Back to Subjects
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-muted-foreground">
        <Link href="/student/subjects" className="hover:text-primary transition-colors">My Subjects</Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-foreground">{subjectData.name}</span>
        {subjectData.code && (
          <>
            <span className="mx-2">•</span>
            <span className="text-muted-foreground">{subjectData.code}</span>
          </>
        )}
      </div>

      {/* Resource Cards - Modern Design without Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Notes Card */}
        <Link href={`/resources/revision-notes/${subjectSlug}`}>
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-5 rounded-2xl border-0 hover:from-blue-500/15 hover:to-blue-600/10 hover:shadow-lg transition-all duration-300 group h-full">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{resourceData?.notes || 0}</div>
                <div className="text-xs text-muted-foreground">notes</div>
              </div>
            </div>
            <h3 className="font-semibold text-lg text-foreground group-hover:text-blue-600 transition-colors">Revision Notes</h3>
            <div className="mt-4 flex items-center text-sm text-blue-600 font-medium">
              View Notes
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Topical Questions Card */}
        <Link href={`/resources/topical-questions/${subjectSlug}`}>
          <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-5 rounded-2xl border-0 hover:from-emerald-500/15 hover:to-emerald-600/10 hover:shadow-lg transition-all duration-300 group h-full">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-600">{resourceData?.questions || 0}</div>
                <div className="text-xs text-muted-foreground">questions</div>
              </div>
            </div>
            <h3 className="font-semibold text-lg text-foreground group-hover:text-emerald-600 transition-colors">Topical Questions</h3>
            <div className="mt-4 flex items-center text-sm text-emerald-600 font-medium">
              Practice Questions
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Past Papers Card */}
        <Link href={`/resources/past-papers/${subjectSlug}`}>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-5 rounded-2xl border-0 hover:from-purple-500/15 hover:to-purple-600/10 hover:shadow-lg transition-all duration-300 group h-full">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">{resourceData?.papers || 0}</div>
                <div className="text-xs text-muted-foreground">papers</div>
              </div>
            </div>
            <h3 className="font-semibold text-lg text-foreground group-hover:text-purple-600 transition-colors">Past Papers</h3>
            <div className="mt-4 flex items-center text-sm text-purple-600 font-medium">
              View Papers
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
