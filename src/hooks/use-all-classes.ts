'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Class {
  id: string;
  name: string;
  subject_id: string;
  teacher_id: string;
  join_code: string;
  capacity: number;
  created_at: string;
}

/**
 * A hook specifically for the admin dashboard to fetch all classes.
 * It does not filter by user, providing a global view of all classes.
 */
export function useAllClasses() {
  const supabase = createClient();
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchClasses();

    // Set up realtime subscription
    const channel = supabase
      .channel('all-classes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes',
        },
        () => {
          fetchClasses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchClasses() {
    try {
      const { data, error: fetchError } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      if (fetchError) throw fetchError;
      setClasses(data || []);
    } catch (err) {
      console.error('Error fetching all classes:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }

  return { classes, isLoading, error };
}
