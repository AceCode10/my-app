'use client';

import { useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, query, serverTimestamp, where, doc, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Class } from '@/types';

export function useClasses() {
  const firestore = useFirestore();
  const { user, roles } = useUser();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const isTeacher = roles.includes('teacher');
  const isStudent = roles.includes('student');

  const classesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    
    // Admins shouldn't fetch classes unless they are also a teacher
    if (roles.includes('admin') && !isTeacher) return null;
    
    // For teachers, we query where they are the teacher.
    if (isTeacher) {
      return query(collection(firestore, 'classes'), where('teacherId', '==', user.uid));
    }
    // For students, we query where they are in the studentIds array.
    if (isStudent) {
        return query(collection(firestore, 'classes'), where('studentIds', 'array-contains', user.uid));
    }
    return null;
  }, [firestore, user, roles, isTeacher, isStudent]);

  const { data: classes, isLoading, error } = useCollection<Class>(classesQuery);

  const createClass = async (newClassData: { name: string; subject: string; classCode: string }) => {
    if (!firestore || !user || !isTeacher) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be a teacher to create a class.',
      });
      return;
    }
    setIsCreating(true);
    try {
      const classesRef = collection(firestore, 'classes');
      await addDoc(classesRef, {
        ...newClassData,
        teacherId: user.uid,
        studentIds: [],
        pendingStudentIds: [],
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Class Created!',
        description: `${newClassData.name} has been successfully created.`,
      });
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
