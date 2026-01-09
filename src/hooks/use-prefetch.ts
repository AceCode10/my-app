'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

/**
 * Hook to prefetch common data for faster navigation
 * Call these functions on hover or when anticipating navigation
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  // Prefetch subjects list
  const prefetchSubjects = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['subjects-all'],
      queryFn: async () => {
        const { data } = await supabase
          .from('subjects')
          .select('id, name, slug, code, icon_url, color, display_name')
          .eq('status', 'published')
          .order('name');
        return data || [];
      },
      staleTime: 10 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch exam boards
  const prefetchExamBoards = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['exam-boards'],
      queryFn: async () => {
        const { data } = await supabase
          .from('exam_boards')
          .select('id, name, code')
          .eq('is_active', true)
          .order('display_order');
        return data || [];
      },
      staleTime: 30 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch user's classes
  const prefetchClasses = useCallback((userId: string, role: string) => {
    queryClient.prefetchQuery({
      queryKey: ['classes', userId, role],
      queryFn: async () => {
        if (role === 'teacher' || role === 'super_admin') {
          const { data } = await supabase
            .from('classes')
            .select('*, subjects(name)')
            .eq('teacher_id', userId)
            .order('created_at', { ascending: false });
          return (data || []).map((c: any) => ({
            ...c,
            subject: c.subjects?.name || 'Unknown Subject',
            classCode: c.join_code,
          }));
        } else {
          const { data: enrollments } = await supabase
            .from('enrollments')
            .select('class_id')
            .eq('user_id', userId)
            .eq('status', 'active');
          
          if (!enrollments?.length) return [];
          
          const classIds = enrollments.map(e => e.class_id);
          const { data } = await supabase
            .from('classes')
            .select('*, subjects(name)')
            .in('id', classIds);
          
          return (data || []).map((c: any) => ({
            ...c,
            subject: c.subjects?.name || 'Unknown Subject',
          }));
        }
      },
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch dashboard data for students
  const prefetchStudentDashboard = useCallback((userId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['student-dashboard', userId],
      queryFn: async () => {
        const [userResult, attemptsResult, subjectsResult] = await Promise.all([
          supabase.from('users').select('xp, streak_days, badges').eq('id', userId).single(),
          supabase.from('assessment_attempts').select('id').eq('user_id', userId).limit(1),
          supabase.from('user_subjects').select('subject_id').eq('user_id', userId),
        ]);
        
        return {
          xp: userResult.data?.xp || 0,
          streak: userResult.data?.streak_days || 0,
          badges: userResult.data?.badges?.length || 0,
          hasAttempts: (attemptsResult.data?.length || 0) > 0,
          subjectCount: subjectsResult.data?.length || 0,
        };
      },
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient]);

  // Prefetch all common data at once (call on app load)
  const prefetchCommonData = useCallback(() => {
    prefetchSubjects();
    prefetchExamBoards();
  }, [prefetchSubjects, prefetchExamBoards]);

  return {
    prefetchSubjects,
    prefetchExamBoards,
    prefetchClasses,
    prefetchStudentDashboard,
    prefetchCommonData,
  };
}
