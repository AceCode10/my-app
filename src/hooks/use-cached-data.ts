'use client';

import { useQuery, type QueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Standardized cache times based on data volatility
const CACHE_TIMES = {
  // Static data that rarely changes
  static: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  },
  // Semi-static data that changes occasionally
  semiStatic: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  // Dynamic data that changes frequently
  dynamic: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  },
};

// Default result limit to prevent performance issues
const DEFAULT_LIMIT = 100;

// Cached subjects query
export function useSubjects(options?: { includeAll?: boolean; examBoardId?: string; level?: string }) {
  return useQuery({
    queryKey: ['subjects', options?.includeAll, options?.examBoardId, options?.level],
    queryFn: async () => {
      let query = supabase
        .from('subjects')
        .select('id, name, slug, code, description, icon_url, color, status, display_order, exam_board_id, level')
        .order('display_order', { ascending: true })
        .limit(DEFAULT_LIMIT);
      
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
    ...CACHE_TIMES.static,
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
        .order('display_order', { ascending: true })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
    ...CACHE_TIMES.static,
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
        .order('display_order', { ascending: true })
        .limit(DEFAULT_LIMIT);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!subjectId,
    ...CACHE_TIMES.semiStatic,
  });
}

// Cached past papers with subjects - with pagination support
export function usePastPapers(filters?: { subjectId?: string; year?: string; limit?: number }) {
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
        .order('session', { ascending: true })
        .limit(filters?.limit || DEFAULT_LIMIT);

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
    ...CACHE_TIMES.semiStatic,
  });
}

// Cached notes with pagination support
export function useNotes(filters?: { subjectId?: string; visibility?: string; limit?: number }) {
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
        .order('updated_at', { ascending: false })
        .limit(filters?.limit || DEFAULT_LIMIT);

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
    ...CACHE_TIMES.semiStatic,
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
    ...CACHE_TIMES.dynamic,
  });
}

// Prefetch common data with proper typing
export async function prefetchCommonData(queryClient: QueryClient) {
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['subjects', undefined, undefined, undefined],
      queryFn: async () => {
        const { data } = await supabase
          .from('subjects')
          .select('id, name, slug, code, description, icon_url, color, status, display_order, exam_board_id, level')
          .eq('status', 'published')
          .order('display_order')
          .limit(DEFAULT_LIMIT);
        return data || [];
      },
      ...CACHE_TIMES.static,
    }),
    queryClient.prefetchQuery({
      queryKey: ['exam-boards'],
      queryFn: async () => {
        const { data } = await supabase
          .from('exam_boards')
          .select('id, name, code, full_name, color, is_active, display_order')
          .eq('is_active', true)
          .order('display_order')
          .limit(50);
        return data || [];
      },
      ...CACHE_TIMES.static,
    }),
  ]);
}
