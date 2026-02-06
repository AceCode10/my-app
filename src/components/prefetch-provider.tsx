'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

/**
 * Component that prefetches common data on mount
 * This improves perceived performance by loading data before user navigates
 */
export function PrefetchProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Prefetch subjects (used across many pages)
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

    // Prefetch exam boards (used in filters and navigation)
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

    // NOTE: Route prefetching removed. Prefetching /student/practice caused a 404
    // on production (route doesn't exist), which triggered a Next.js render loop
    // that blocked Supabase auth initialization and caused login hangs.
    // Next.js automatically prefetches <Link> targets, so manual prefetching is unnecessary.
  }, [queryClient]);

  return <>{children}</>;
}
