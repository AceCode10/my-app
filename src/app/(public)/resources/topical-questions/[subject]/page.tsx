'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight, BookOpen, Clock, Play, Download, FileText, Building2, GraduationCap, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { ProgressRing } from '@/components/ui/modern-list';
import { useUser } from '@/hooks/use-user';

import { getExamBoardById, getLevelById } from '@/lib/exam-boards';

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

interface TopicProgress {
  topic_id: string;
  completed_questions: number;
  total_questions: number;
  progress_percentage: number;
}

export default function SubjectTopicalQuestionsPage({ 
  params 
}: { 
  params: Promise<{ subject: string }>
}) {
  const { subject: subjectSlug } = use(params);
  const searchParams = useSearchParams();
  const examBoard = searchParams.get('board') || 'cambridge';
  const level = searchParams.get('level') || 'igcse';
  
  const supabase = createClient();
  const { user } = useUser();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicQuestionCounts, setTopicQuestionCounts] = useState<Record<string, number>>({});
  const [topicProgress, setTopicProgress] = useState<Record<string, TopicProgress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [subjectSlug, examBoard, level]);

  async function fetchData() {
    try {
      setIsLoading(true);
      
      // Fetch subject and exam board in parallel
      const codeMap: Record<string, string> = {
        'cambridge': 'CIE', 'ib': 'IB', 'edexcel': 'EDEX',
        'ocr': 'OCR', 'aqa': 'AQA', 'ap': 'AP'
      };
      const dbCode = codeMap[examBoard.toLowerCase()] || examBoard.toUpperCase();

      const [subjectRes, boardRes] = await Promise.all([
        supabase.from('subjects').select('*').eq('slug', subjectSlug).single(),
        supabase.from('exam_boards').select('id').eq('code', dbCode).single(),
      ]);

      if (subjectRes.error) throw subjectRes.error;
      if (!subjectRes.data) throw new Error('Subject not found');
      
      const subjectData = subjectRes.data;
      setSubject(subjectData);

      // Fetch topics, question counts, and user progress in parallel
      const parallelQueries: Promise<any>[] = [
        supabase.from('topics').select('*').eq('subject_id', subjectData.id)
          .order('display_order', { ascending: true }),
        supabase.from('questions').select('topic_id').eq('subject_id', subjectData.id),
      ];

      // Only fetch progress if user is logged in (use useUser() instead of extra auth call)
      if (user?.id) {
        parallelQueries.push(
          supabase.from('user_topic_progress')
            .select('topic_id, completed_questions, total_questions, progress_percentage')
            .eq('user_id', user.id)
            .eq('subject_id', subjectData.id)
        );
      }

      const results = await Promise.all(parallelQueries);
      const [topicsRes, questionsRes] = results;
      const progressRes = results[2];

      if (topicsRes.error) throw topicsRes.error;
      setTopics(topicsRes.data || []);

      if (questionsRes.data) {
        const counts: Record<string, number> = {};
        questionsRes.data.forEach((q: any) => {
          counts[q.topic_id] = (counts[q.topic_id] || 0) + 1;
        });
        setTopicQuestionCounts(counts);
      }

      if (progressRes?.data) {
        const progressMap: Record<string, TopicProgress> = {};
        progressRes.data.forEach((p: any) => {
          progressMap[p.topic_id] = {
            topic_id: p.topic_id,
            completed_questions: p.completed_questions || 0,
            total_questions: p.total_questions || 0,
            progress_percentage: p.progress_percentage || 0
          };
        });
        setTopicProgress(progressMap);
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
        <Link href="/resources/topical-questions" className="hover:text-primary">
          Topical Questions
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-foreground">
          {isLoading ? <Skeleton className="h-4 w-24 inline-block" /> : subject?.name}
        </span>
      </div>

      {/* Exam Board & Level Display */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-card border rounded-lg">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{getExamBoardById(examBoard)?.name || examBoard}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-card border rounded-lg">
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{getLevelById(level)?.name || level}</span>
        </div>
        <Link 
          href="/resources/topical-questions" 
          className="text-sm text-primary hover:underline"
        >
          Change selection →
        </Link>
      </div>

      {/* Topics List - Modern Clean Design */}
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
          topics.map((topic) => {
            const questionCount = topicQuestionCounts[topic.id] || 0;
            const topicSlug = topic.slug || topic.name.toLowerCase().replace(/ /g, '-');
            const hasPdf = !!topic.pdf_url;
            const hasQuestions = questionCount > 0;
            const isAvailable = hasPdf || hasQuestions;
            // Get real user progress if available
            const userProgress = topicProgress[topic.id];
            const progress = userProgress?.progress_percentage || 0;
            
            return (
              <Link
                key={topic.id}
                href={`/resources/topical-questions/${subjectSlug}/${topicSlug}`}
                className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group"
              >
                {/* Progress Ring */}
                <ProgressRing progress={progress} size={44} />
                
                {/* Topic Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {topic.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {hasQuestions && (
                      <span>{questionCount} question{questionCount !== 1 ? 's' : ''}</span>
                    )}
                    {hasPdf && (
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        PDF
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{topic.estimated_time || Math.max(5, Math.ceil(questionCount * 1.5))} min
                    </span>
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
