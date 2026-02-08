'use client';

import React, { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { 
  ChevronRight, 
  BookOpen, 
  ArrowRight,
  FileText,
  List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

const supabase = createClient();

interface SubjectPageProps {
  params: Promise<{ subject: string }>;
}

export default function TeacherSubjectPage({ params }: SubjectPageProps) {
  const resolvedParams = use(params);
  const subjectSlug = resolvedParams.subject;

  // Fetch subject from database with optimized caching
  const { data: subjectData, isLoading, error } = useQuery({
    queryKey: ['teacher-subject', subjectSlug],
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
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch resource counts - optimized with subject_id directly
  const { data: resourceData } = useQuery({
    queryKey: ['teacher-subject-resources', subjectData?.id],
    queryFn: async () => {
      if (!subjectData?.id) return { notes: 0, questions: 0, papers: 0 };
      
      // Parallel fetch for better performance
      const [notesResult, questionsResult, papersResult] = await Promise.all([
        supabase
          .from('notes')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', subjectData.id)
          .in('visibility', ['public', 'registered'])
          .not('published_at', 'is', null),
        supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', subjectData.id),
        supabase
          .from('past_papers')
          .select('*', { count: 'exact', head: true })
          .eq('subject_id', subjectData.id)
          .eq('status', 'published')
      ]);

      return {
        notes: notesResult.count || 0,
        questions: questionsResult.count || 0,
        papers: papersResult.count || 0
      };
    },
    enabled: !!subjectData?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
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
        <Link href="/teacher/subjects">
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
      {/* Breadcrumb with subject name */}
      <div className="flex items-center text-sm text-muted-foreground">
        <Link href="/teacher/subjects" className="hover:text-primary transition-colors">My Subjects</Link>
        <ChevronRight className="h-4 w-4 mx-2" />
        <span className="font-medium text-foreground">{subjectData.name}</span>
        {subjectData.code && (
          <>
            <span className="mx-2">•</span>
            <span className="text-muted-foreground">{subjectData.code}</span>
          </>
        )}
      </div>

      {/* Resource Cards - Modern Design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Notes Card */}
        <Link href={`/resources/revision-notes/${subjectSlug}`}>
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 hover:from-blue-500/15 hover:to-blue-600/10">
            <CardContent className="p-5">
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
              <p className="text-sm text-muted-foreground mt-1 mb-3">Access revision notes for teaching and reference</p>
              <div className="flex items-center text-sm text-blue-600 font-medium">
                View Notes
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Topical Questions Card */}
        <Link href={`/resources/topical-questions/${subjectSlug}`}>
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 hover:from-emerald-500/15 hover:to-emerald-600/10">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-600">{resourceData?.questions || 0}</div>
                  <div className="text-xs text-muted-foreground">questions</div>
                </div>
              </div>
              <h3 className="font-semibold text-lg text-foreground group-hover:text-emerald-600 transition-colors">Topical Questions</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-3">Browse questions by topic for class practice</p>
              <div className="flex items-center text-sm text-emerald-600 font-medium">
                View Questions
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Past Papers Card */}
        <Link href={`/teacher/papers?subject=${subjectSlug}`}>
          <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 hover:from-purple-500/15 hover:to-purple-600/10">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                  <List className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">{resourceData?.papers || 0}</div>
                  <div className="text-xs text-muted-foreground">papers</div>
                </div>
              </div>
              <h3 className="font-semibold text-lg text-foreground group-hover:text-purple-600 transition-colors">Past Papers</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-3">Access past exam papers with mark schemes</p>
              <div className="flex items-center text-sm text-purple-600 font-medium">
                View Papers
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

    </div>
  );
}
