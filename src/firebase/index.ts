// Barrel file exports for convenience
export * from './provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';

// Re-export useMemoFirebase from provider
import { useMemo, type DependencyList } from 'react';
export { useSidebar } from './provider';


type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  if (memoized) {
    (memoized as MemoFirebase<T>).__memo = true;
  }
  
  return memoized;
}
