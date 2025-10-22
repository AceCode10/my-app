'use client';

import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Class } from '@/types';

/**
 * A hook specifically for the admin dashboard to fetch all classes.
 * It does not filter by user, providing a global view of all classes.
 */
export function useAllClasses() {
  const firestore = useFirestore();

  const classesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // Query all classes, ordered by name.
    return query(collection(firestore, 'classes'), orderBy('name'));
  }, [firestore]);

  const { data: classes, isLoading, error } = useCollection<Class>(classesQuery);

  return { classes, isLoading, error };
}
