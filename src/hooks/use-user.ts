'use client';

import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  role: 'student' | 'teacher' | 'content_moderator' | 'super_admin';
  subscription_tier: 'basic' | 'essential' | 'pro';
  leaderboard_opt_out?: boolean;
  country?: string;
  exam_boards?: string[];
  level?: string;
  levels?: string[];
  subjects_of_interest?: string[];
  onboarding_completed?: boolean;
  xp?: number;
  streak_days?: number;
  created_at: string;
}

// Format email prefix as a readable name: "denny_sepiso" -> "Denny Sepiso"
function formatEmailAsName(email?: string | null): string {
  if (!email) return '';
  const prefix = email.split('@')[0];
  return prefix
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

// ─── Global auth store ───────────────────────────────────────────────
// All useUser() instances subscribe to this store. When the user profile
// changes, EVERY mounted instance is notified — regardless of which
// instance triggered the fetch. This fixes the core bug where React
// strict mode / concurrent renders unmount the fetching instance before
// the profile query resolves, leaving all other instances stuck on null.

interface AuthStore {
  user: UserProfile | null;
  loading: boolean;
}

let store: AuthStore = { user: null, loading: true };
let cacheTimestamp = 0;
let cachedUserId: string | null = null;
const subscribers = new Set<() => void>();

function getSnapshot(): AuthStore {
  return store;
}

function getServerSnapshot(): AuthStore {
  return { user: null, loading: true };
}

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function setStore(next: Partial<AuthStore>) {
  const prev = store;
  store = { ...store, ...next };
  // Only notify if something actually changed
  if (prev.user !== store.user || prev.loading !== store.loading) {
    subscribers.forEach(cb => cb());
  }
}

// Global fetch deduplication
let globalFetchPromise: Promise<UserProfile | null> | null = null;
let globalAuthInitialized = false;
let globalAuthPromise: Promise<void> | null = null;
let lastSignedInEventTime = 0; // Deduplicate rapid SIGNED_IN events

const CACHE_DURATION = 2 * 60 * 1000;
const FETCH_TIMEOUT = 10000;
const INIT_TIMEOUT = 8000;
const AUTH_CALL_TIMEOUT = 4000;

// Helper to invalidate cache (can be called from other modules)
export function invalidateUserCache() {
  cachedUserId = null;
  cacheTimestamp = 0;
  globalFetchPromise = null;
  globalAuthInitialized = false;
  globalAuthPromise = null;
  lastSignedInEventTime = 0;
  setStore({ user: null, loading: true });
}

// Listen for auth events globally to clear cache on sign out
if (typeof window !== 'undefined') {
  window.addEventListener('auth_signed_out', () => {
    console.log('[Auth] auth_signed_out event received — invalidating cache');
    invalidateUserCache();
  });
}

// ─── Shared profile fetcher ─────────────────────────────────────────
// Returns the fetched profile and updates the global store + cache.
// All hook instances see the update via useSyncExternalStore.

let supabaseInstance: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!supabaseInstance) supabaseInstance = createClient();
  return supabaseInstance;
}

async function fetchUserProfile(userId: string, forceRefresh = false): Promise<UserProfile | null> {
  const supabase = getSupabase();

  // Clear cache if user ID changed (switching accounts)
  if (cachedUserId && cachedUserId !== userId) {
    invalidateUserCache();
  }

  // Check cache first
  if (!forceRefresh && store.user && cachedUserId === userId && Date.now() - cacheTimestamp < CACHE_DURATION) {
    setStore({ user: store.user, loading: false });
    return store.user;
  }

  // If another fetch is in progress for the SAME user, wait for it
  if (globalFetchPromise && cachedUserId === userId) {
    const result = await globalFetchPromise;
    return result;
  }

  cachedUserId = userId;

  // Create a shared promise so concurrent callers wait for the same fetch
  let resolveFetch: (user: UserProfile | null) => void;
  globalFetchPromise = new Promise<UserProfile | null>((resolve) => {
    resolveFetch = resolve;
  });

  // Timeout guard
  const timeoutId = setTimeout(() => {
    console.warn('[Auth] Profile fetch timeout');
    setStore({ loading: false });
    resolveFetch!(store.user);
    globalFetchPromise = null;
  }, FETCH_TIMEOUT);

  let fetchedUser: UserProfile | null = null;

  try {
    console.log('[Auth] Profile fetch start for:', userId.substring(0, 8) + '...');
    
    const { data, error } = await supabase
      .from('users')
      .select('id, email, display_name, avatar_url, role, subscription_tier, leaderboard_opt_out, country, exam_boards, level, levels, subjects_of_interest, onboarding_completed, xp, streak_days, created_at')
      .eq('id', userId)
      .single();

    clearTimeout(timeoutId);
    console.log(`[Auth] Profile query completed`, error ? `error: ${error.code}` : 'success');

    if (error) {
      if (error.code === 'PGRST116') {
        // Profile doesn't exist — create it
        console.log('[Auth] Profile not found, creating...');
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email,
              display_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.user_metadata?.display_name || formatEmailAsName(authUser.email) || 'User',
              role: authUser.user_metadata?.role || 'student',
              subscription_tier: authUser.user_metadata?.role === 'teacher' ? 'pro' : 'basic',
              onboarding_completed: false,
            });
          
          if (!insertError) {
            const { data: newData } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();
            if (newData) {
              fetchedUser = newData;
              cacheTimestamp = Date.now();
              setStore({ user: newData, loading: false });
              return fetchedUser;
            }
          }
        }
      }
      if (error.code !== 'PGRST116') {
        console.error('[Auth] Profile fetch error:', error.code, error.message);
      }
      setStore({ user: null, loading: false });
      return null;
    }

    if (data) {
      fetchedUser = data;
      cacheTimestamp = Date.now();
      setStore({ user: data, loading: false });
    } else {
      setStore({ user: null, loading: false });
    }
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Auth] Profile fetch threw:', errorMessage);
    setStore({ user: null, loading: false });
  } finally {
    resolveFetch!(fetchedUser);
    globalFetchPromise = null;
  }

  return fetchedUser;
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useUser() {
  // All instances share the same store via useSyncExternalStore.
  // When setStore() is called from ANY code path (fetch, auth event, etc.),
  // every mounted useUser() instance re-renders with the new value.
  const { user, loading } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  
  const supabase = getSupabase();

  useEffect(() => {
    let isSubscribed = true;
    let retryCount = 0;
    const MAX_RETRIES = 2;

    const initializeAuth = async (): Promise<void> => {
      // If already initialized globally with a cached user, nothing to do
      if (globalAuthInitialized && store.user && cachedUserId) {
        setStore({ loading: false });
        return;
      }

      // If another init is in progress, wait for it
      if (globalAuthPromise) {
        await globalAuthPromise;
        setStore({ loading: false });
        return;
      }

      // Create shared promise for this init
      let resolveGlobalAuth: () => void;
      globalAuthPromise = new Promise<void>((resolve) => {
        resolveGlobalAuth = resolve;
      });

      try {
        // Check local session first (fast)
        const sessionResult = await Promise.race<
          { timedOut: false; session: Session | null } |
          { timedOut: true }
        >([
          supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => ({ timedOut: false as const, session })),
          new Promise<{ timedOut: true }>((resolve) =>
            setTimeout(() => resolve({ timedOut: true }), AUTH_CALL_TIMEOUT)
          ),
        ]);

        if (sessionResult.timedOut) {
          console.warn('[Auth] getSession() timed out — waiting for auth events');
          return;
        }

        const { session } = sessionResult;
        
        if (!isSubscribed) return;
        
        if (session?.user) {
          console.log('[Auth] Session found, fetching profile for', session.user.id.substring(0, 8));
          // Fire-and-forget: fetchUserProfile updates the global store
          fetchUserProfile(session.user.id);
          
          // Validate session in background
          supabase.auth.getUser().then(({ error }: { error: { message: string } | null }) => {
            if (error && isSubscribed) {
              console.log('[Auth] Session validation failed:', error.message);
              invalidateUserCache();
            }
          }).catch(() => {});

          globalAuthInitialized = true;
        } else {
          // No session — try getUser as fallback
          const getUserResult = await Promise.race<
            { timedOut: false; user: any; error: { message: string } | null } |
            { timedOut: true }
          >([
            supabase.auth.getUser().then(({ data: { user }, error }: { data: { user: any }; error: { message: string } | null }) => ({ timedOut: false as const, user, error })),
            new Promise<{ timedOut: true }>((resolve) =>
              setTimeout(() => resolve({ timedOut: true }), AUTH_CALL_TIMEOUT)
            ),
          ]);

          if (getUserResult.timedOut) {
            console.warn('[Auth] getUser() timed out — waiting for auth events');
            return;
          }

          const { user: authUser, error } = getUserResult;
          if (!isSubscribed) return;
          
          if (error) {
            if ((error.message.includes('fetch') || error.message.includes('network')) && retryCount < MAX_RETRIES) {
              retryCount++;
              await new Promise(r => setTimeout(r, 1000 * retryCount));
              resolveGlobalAuth!();
              globalAuthPromise = null;
              return initializeAuth();
            }
            setStore({ loading: false });
            globalAuthInitialized = true;
          } else if (authUser) {
            fetchUserProfile(authUser.id);
            globalAuthInitialized = true;
          } else {
            setStore({ loading: false });
            globalAuthInitialized = true;
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        if ((msg.includes('fetch') || msg.includes('network')) && retryCount < MAX_RETRIES) {
          retryCount++;
          await new Promise(r => setTimeout(r, 1000 * retryCount));
          resolveGlobalAuth!();
          globalAuthPromise = null;
          return initializeAuth();
        }
        console.error('[Auth] Init error:', msg);
        setStore({ loading: false });
      } finally {
        resolveGlobalAuth!();
        globalAuthPromise = null;
      }
    };

    // Safety timeout
    const timeoutId = setTimeout(() => {
      if (isSubscribed && store.loading) {
        console.warn('[Auth] Init timeout — recovering');
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
          if (session?.user && isSubscribed) {
            fetchUserProfile(session.user.id);
          } else if (isSubscribed) {
            setStore({ loading: false });
          }
        }).catch(() => {
          setStore({ loading: false });
        });
      }
    }, INIT_TIMEOUT);

    initializeAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!isSubscribed) return;
      
      if (event === 'SIGNED_OUT') {
        globalAuthInitialized = false;
        invalidateUserCache();
        return;
      }
      
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        // Deduplicate rapid SIGNED_IN events (Supabase fires multiple)
        const now = Date.now();
        if (event === 'SIGNED_IN' && now - lastSignedInEventTime < 2000) {
          // Skip duplicate — already processing
          return;
        }
        if (event === 'SIGNED_IN') {
          lastSignedInEventTime = now;
        }

        if (!globalAuthInitialized) {
          globalAuthInitialized = true;
        }

        // For INITIAL_SESSION, use cache if available
        if (event === 'INITIAL_SESSION' && store.user && cachedUserId === session.user.id) {
          setStore({ loading: false });
          return;
        }

        // Set temporary user from session metadata for instant UI feedback
        // while the real profile loads from the database
        if (!store.user || cachedUserId !== session.user.id) {
          const meta = session.user.user_metadata || {};
          const tempName = meta.full_name || meta.name || formatEmailAsName(session.user.email);
          const tempUser: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            display_name: tempName || 'User',
            avatar_url: meta.avatar_url || meta.picture,
            role: meta.role || 'student',
            subscription_tier: 'basic',
            onboarding_completed: false,
            created_at: session.user.created_at || new Date().toISOString(),
          };
          setStore({ user: tempUser, loading: false });
          console.log('[Auth] Set temporary user:', tempName);
        }

        // Fetch real profile (fire-and-forget — updates store when done)
        const forceRefresh = event === 'SIGNED_IN';
        fetchUserProfile(session.user.id, forceRefresh);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        if (cachedUserId !== session.user.id) {
          fetchUserProfile(session.user.id, true);
        }
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Provide a refresh function for manual refresh
  const refresh = useCallback((userId?: string) => {
    const id = userId || store.user?.id || cachedUserId;
    if (id) {
      return fetchUserProfile(id, true);
    }
    return Promise.resolve(null);
  }, []);

  return { user, loading, refresh };
}
