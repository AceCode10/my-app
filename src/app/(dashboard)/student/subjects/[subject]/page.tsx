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
import { Progress } from '@/components/ui/progress';

const supabase = createClient();

interface SubjectPageProps {
  params: Promise<{ subject: string }>;
}

export default function SubjectPage({ params }: SubjectPageProps) {
  const resolvedParams = use(params);
  const subjectSlug = resolvedParams.subject;

  // Fetch subject from database
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
  });

  // Fetch topics for this subject
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
  });

  // Fetch resource counts - use subject_id directly for more reliable counts
  const { data: resourceData } = useQuery({
    queryKey: ['subject-resources', subjectData?.id],
    queryFn: async () => {
      if (!subjectData?.id) return { notes: 0, questions: 0, papers: 0 };
      
      // Count notes by subject_id directly (more reliable)
      const { count: notesCount, error: notesError } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subjectData.id)
        .in('visibility', ['public', 'registered'])
        .not('published_at', 'is', null);

      if (notesError) console.error('Notes count error:', notesError);

      // Count questions by subject_id directly
      const { count: questionsCount, error: questionsError } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subjectData.id);

      if (questionsError) console.error('Questions count error:', questionsError);

      // Count past papers
      const { count: papersCount, error: papersError } = await supabase
        .from('past_papers')
        .select('*', { count: 'exact', head: true })
        .eq('subject_id', subjectData.id)
        .eq('status', 'published');

      if (papersError) console.error('Papers count error:', papersError);

      console.log('[SubjectPage] Resource counts:', { notes: notesCount, questions: questionsCount, papers: papersCount });

      return {
        notes: notesCount || 0,
        questions: questionsCount || 0,
        papers: papersCount || 0
      };
    },
    enabled: !!subjectData?.id,
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
    refetchInterval: 5000, // Refetch every 5 seconds for real-time feel
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

      {/* Resource Cards with Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Notes Card */}
        <Link href={`/resources/revision-notes/${subjectSlug}`}>
          <div className="bg-card p-6 rounded-2xl border hover:border-blue-500 hover:shadow-lg transition-all group h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">📖</div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{resourceData?.notes || 0}</div>
                <div className="text-xs text-muted-foreground">notes</div>
              </div>
            </div>
            <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-500 transition-colors">Revision Notes</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.min(notesProgress, 100)}%</span>
              </div>
              <Progress value={Math.min(notesProgress, 100)} className="h-2" />
            </div>
            <div className="mt-4 flex items-center text-sm text-blue-500 font-medium">
              View Notes
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Topical Questions Card */}
        <Link href={`/resources/topical-questions/${subjectSlug}`}>
          <div className="bg-card p-6 rounded-2xl border hover:border-emerald-500 hover:shadow-lg transition-all group h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">📝</div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{resourceData?.questions || 0}</div>
                <div className="text-xs text-muted-foreground">questions</div>
              </div>
            </div>
            <h3 className="font-semibold text-lg mb-2 group-hover:text-emerald-500 transition-colors">Topical Questions</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.min(questionsProgress, 100)}%</span>
              </div>
              <Progress value={Math.min(questionsProgress, 100)} className="h-2" />
            </div>
            <div className="mt-4 flex items-center text-sm text-emerald-500 font-medium">
              Practice Questions
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Past Papers Card */}
        <Link href={`/resources/past-papers/${subjectSlug}`}>
          <div className="bg-card p-6 rounded-2xl border hover:border-purple-500 hover:shadow-lg transition-all group h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">📄</div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{resourceData?.papers || 0}</div>
                <div className="text-xs text-muted-foreground">papers</div>
              </div>
            </div>
            <h3 className="font-semibold text-lg mb-2 group-hover:text-purple-500 transition-colors">Past Papers</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.min(papersProgress, 100)}%</span>
              </div>
              <Progress value={Math.min(papersProgress, 100)} className="h-2" />
            </div>
            <div className="mt-4 flex items-center text-sm text-purple-500 font-medium">
              View Papers
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
