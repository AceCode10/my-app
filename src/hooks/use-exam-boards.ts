'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface ExamBoard {
  id: string;
  code: string;
  name: string;
  full_name: string | null;
  description: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
}

/**
 * Single source of truth for exam boards across the admin (and elsewhere).
 * Replaces the five hardcoded EXAM_BOARDS arrays.
 *
 * Cached aggressively — exam boards change rarely.
 */
export function useExamBoards() {
  return useQuery<ExamBoard[]>({
    queryKey: ['exam-boards'],
    staleTime: 60 * 60 * 1000, // 1h
    gcTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('exam_boards')
        .select('id, code, name, full_name, description, color, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return (data ?? []) as ExamBoard[];
    },
  });
}

/** Convenience: return just the codes (e.g. ['CIE','IB','EDEX',...]) for legacy code that used string arrays. */
export function useExamBoardCodes(): string[] {
  const { data } = useExamBoards();
  return (data ?? []).map(b => b.code);
}
