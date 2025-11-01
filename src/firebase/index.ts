/**
 * TEMPORARY FIREBASE STUB
 * This file provides stub exports to prevent build errors
 * while we migrate from Firebase to Supabase
 * 
 * TODO: Remove this file once all Firebase dependencies are migrated
 */

'use client';

// Stub hooks that return empty data
export function useUser() {
  return { user: null, loading: true };
}

export function useFirestore() {
  return null;
}

export function useCollection<T>(query: any) {
  return { data: [] as T[], isLoading: false, error: null };
}

export function useMemoFirebase<T>(factory: () => T, deps: any[]): T {
  return factory();
}

// Stub types
export type FirebaseUser = any;
export type Firestore = any;
