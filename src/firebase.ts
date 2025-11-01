// TEMPORARY STUB FILE - This file provides empty implementations to prevent build errors
// during the Firebase to Supabase migration. Remove this file once all imports are migrated.

import { useUser as useSupabaseUser } from '@/hooks/use-user';

// Re-export useUser from the Supabase implementation
export { useUser } from '@/hooks/use-user';

// Stub implementations for Firebase hooks that are being migrated
export function useFirestore() {
  console.warn('useFirestore is deprecated. Please migrate to Supabase.');
  return null;
}

export function useCollection<T>(query: any) {
  console.warn('useCollection is deprecated. Please migrate to Supabase.');
  return { data: [] as T[], isLoading: false, error: null };
}

export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  console.warn('useMemoFirebase is deprecated. Please migrate to Supabase.');
  return factory();
}

export function useAuth() {
  console.warn('useAuth is deprecated. Please use useUser from @/hooks/use-user.');
  const { user, loading } = useSupabaseUser();
  return { user, loading };
}
