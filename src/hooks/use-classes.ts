'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

const supabase = createClient();

interface Class {
  id: string;
  name: string;
  subject_id: string;
  subject?: string;
  teacher_id: string;
  join_code: string;
  classCode?: string;
  capacity: number;
  created_at: string;
  studentIds?: string[];
  student_count?: number;
}

async function fetchTeacherClasses(userId: string): Promise<Class[]> {
  const { data, error } = await supabase
    .from('classes')
    .select('*, subjects(name)')
    .eq('teacher_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  // Fetch student counts for each class
  const classIds = (data || []).map((c: any) => c.id);
  const studentCounts: Record<string, number> = {};
  
  if (classIds.length > 0) {
    const { data: enrollments } = await supabase
      .from('enrollments')
      .select('class_id')
      .in('class_id', classIds)
      .eq('status', 'active');
    
    // Count students per class
    (enrollments || []).forEach((e: any) => {
      studentCounts[e.class_id] = (studentCounts[e.class_id] || 0) + 1;
    });
  }
  
  return (data || []).map((c: any) => ({
    ...c,
    subject: c.subjects?.name || 'Unknown Subject',
    classCode: c.join_code,
    studentIds: [],
    student_count: studentCounts[c.id] || 0,
  }));
}

async function fetchStudentClasses(userId: string): Promise<Class[]> {
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('class_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (enrollError) throw enrollError;
  if (!enrollments || enrollments.length === 0) return [];

  const classIds = enrollments.map((e) => e.class_id);
  const { data, error } = await supabase
    .from('classes')
    .select('*, subjects(name)')
    .in('id', classIds);

  if (error) throw error;
  
  return (data || []).map((c: any) => ({
    ...c,
    subject: c.subjects?.name || 'Unknown Subject',
    classCode: c.join_code,
    studentIds: [],
  }));
}

export function useClasses() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isTeacher = user?.role === 'teacher' || user?.role === 'super_admin';
  const isStudent = user?.role === 'student';

  // Cached classes query
  const { data: classes = [], isLoading, error } = useQuery({
    queryKey: ['classes', user?.id, user?.role],
    queryFn: async () => {
      if (!user) return [];
      if (isTeacher) return fetchTeacherClasses(user.id);
      if (isStudent) return fetchStudentClasses(user.id);
      return [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });

  // Create class mutation
  const createMutation = useMutation({
    mutationFn: async (newClassData: { name: string; subject: string; classCode: string }) => {
      if (!user || !isTeacher) throw new Error('Must be a teacher to create a class');
      
      const { error } = await supabase.from('classes').insert({
        name: newClassData.name,
        subject_id: newClassData.subject,
        teacher_id: user.id,
        join_code: newClassData.classCode,
        capacity: 999,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      return newClassData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({
        title: 'Class Created!',
        description: `${data.name} has been successfully created.`,
      });
    },
    onError: (err: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create class',
        description: err.message,
      });
    },
  });

  const createClass = (newClassData: { name: string; subject: string; classCode: string }) => {
    createMutation.mutate(newClassData);
  };

  return { 
    classes, 
    isLoading, 
    error: error as Error | null, 
    createClass, 
    isCreating: createMutation.isPending 
  };
}
