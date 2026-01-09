'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Cached subjects query
export function useSubjects(options?: { includeAll?: boolean; examBoardId?: string; level?: string }) {
  return useQuery({
    queryKey: ['subjects', options?.includeAll, options?.examBoardId, options?.level],
    queryFn: async () => {
      let query = supabase
        .from('subjects')
        .select('id, name, slug, code, description, icon_url, color, status, display_order, exam_board_id, level')
        .order('display_order', { ascending: true });
      
      if (!options?.includeAll) {
        query = query.eq('status', 'published');
      }
      if (options?.examBoardId) {
        query = query.eq('exam_board_id', options.examBoardId);
      }
      if (options?.level) {
        query = query.eq('level', options.level);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - subjects rarely change
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });
}

// Cached exam boards query
export function useExamBoards() {
  return useQuery({
    queryKey: ['exam-boards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_boards')
        .select('id, name, code, is_active, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - exam boards rarely change
  });
}

// Cached topics by subject
export function useTopicsBySubject(subjectId: string | null) {
  return useQuery({
    queryKey: ['topics', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      
      const { data, error } = await supabase
        .from('topics')
        .select('id, name, slug, description, display_order, subject_id')
        .eq('subject_id', subjectId)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!subjectId,
    staleTime: 10 * 60 * 1000,
  });
}

// Cached past papers with subjects
export function usePastPapers(filters?: { subjectId?: string; year?: string }) {
  return useQuery({
    queryKey: ['past-papers', filters],
    queryFn: async () => {
      let query = supabase
        .from('past_papers')
        .select(`
          id, title, year, session, paper_number, variant,
          subject_id, exam_board_id, status, duration_minutes,
          total_marks, difficulty, resource_url, mark_scheme_url,
          subjects(id, name, slug),
          exam_boards(id, name, code)
        `)
        .eq('status', 'published')
        .order('year', { ascending: false })
        .order('session', { ascending: true });

      if (filters?.subjectId && filters.subjectId !== 'all') {
        query = query.eq('subject_id', filters.subjectId);
      }
      if (filters?.year && filters.year !== 'all') {
        query = query.eq('year', parseInt(filters.year));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Cached notes
export function useNotes(filters?: { subjectId?: string; visibility?: string }) {
  return useQuery({
    queryKey: ['notes', filters],
    queryFn: async () => {
      let query = supabase
        .from('notes')
        .select(`
          id, title, subtitle, slug, visibility, tags,
          subject_id, topic_id, view_count, created_at, updated_at,
          subjects(id, name, slug),
          topics(id, name, slug)
        `)
        .order('updated_at', { ascending: false });

      if (filters?.subjectId && filters.subjectId !== 'all') {
        query = query.eq('subject_id', filters.subjectId);
      }
      if (filters?.visibility && filters.visibility !== 'all') {
        query = query.eq('visibility', filters.visibility);
      } else {
        // Default to public notes for non-admin
        query = query.eq('visibility', 'public');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Cached user profile with optimistic updates
export function useUserProfile(userId: string | null) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

// Prefetch common data
export async function prefetchCommonData(queryClient: any) {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['subjects', undefined, undefined, undefined],
      queryFn: async () => {
        const { data } = await supabase
          .from('subjects')
          .select('id, name, slug, code, description, icon_url, color, status, display_order, exam_board_id, level')
          .eq('status', 'published')
          .order('display_order');
        return data || [];
      },
      staleTime: 10 * 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: ['exam-boards'],
      queryFn: async () => {
        const { data } = await supabase
          .from('exam_boards')
          .select('id, name, code, full_name, color, is_active, display_order')
          .eq('is_active', true)
          .order('display_order');
        return data || [];
      },
      staleTime: 30 * 60 * 1000,
    }),
  ]);
}
