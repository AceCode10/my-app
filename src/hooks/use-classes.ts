'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Class {
  id: string;
  name: string;
  subject_id: string;
  teacher_id: string;
  join_code: string;
  capacity: number;
  created_at: string;
}

export function useClasses() {
  const { user } = useUser();
  const { toast } = useToast();
  const supabase = createClient();
  
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'super_admin';
  const isStudent = user?.role === 'student';

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    fetchClasses();

    // Set up realtime subscription
    const channel = supabase
      .channel('classes-changes')
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
  }, [user]);

  async function fetchClasses() {
    if (!user) return;

    try {
      let query = supabase.from('classes').select('*');

      // For teachers, fetch classes they teach
      if (isTeacher) {
        query = query.eq('teacher_id', user.id);
      }
      // For students, fetch classes they're enrolled in
      else if (isStudent) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('class_id')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (enrollments && enrollments.length > 0) {
          const classIds = enrollments.map((e) => e.class_id);
          query = query.in('id', classIds);
        } else {
          setClasses([]);
          setIsLoading(false);
          return;
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setClasses(data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }

  const createClass = async (newClassData: { name: string; subject: string; classCode: string }) => {
    if (!user || !isTeacher) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be a teacher to create a class.',
      });
      return;
    }

    setIsCreating(true);
    try {
      const { error: insertError } = await supabase.from('classes').insert({
        name: newClassData.name,
        subject_id: newClassData.subject,
        teacher_id: user.id,
        join_code: newClassData.classCode,
        capacity: 999,
        created_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      toast({
        title: 'Class Created!',
        description: `${newClassData.name} has been successfully created.`,
      });

      fetchClasses();
    } catch (err) {
      console.error('Error creating class:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to create class',
        description: (err as Error).message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return { classes, isLoading, error, createClass, isCreating };
}
