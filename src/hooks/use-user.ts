'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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

// Global cache for user profile to avoid refetching on every component mount
let cachedUser: UserProfile | null = null;
let cachedUserId: string | null = null; // Track which user the cache belongs to
let cacheTimestamp = 0;
let globalFetchPromise: Promise<UserProfile | null> | null = null;
let globalFetchResolve: ((user: UserProfile | null) => void) | null = null;
let globalAuthInitialized = false; // Track if auth has been initialized globally
let globalAuthPromise: Promise<void> | null = null; // Shared promise for initial auth
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache - shorter for better consistency
const FETCH_TIMEOUT = 10000; // 10 second timeout for profile fetch
const INIT_TIMEOUT = 8000; // 8 second timeout for initial auth check

// Helper to invalidate cache (can be called from other modules)
export function invalidateUserCache() {
  cachedUser = null;
  cachedUserId = null;
  cacheTimestamp = 0;
  globalFetchPromise = null;
  globalFetchResolve = null;
  globalAuthInitialized = false; // Reset so next mount re-initializes auth
  globalAuthPromise = null;
}

// Diagnostic: snapshot all global state for debugging
function logState(label: string) {
  console.log(`[Auth State] ${label}: cached=${!!cachedUser} cachedId=${cachedUserId?.substring(0, 8) || 'null'} fetchPromise=${!!globalFetchPromise} authInit=${globalAuthInitialized} authPromise=${!!globalAuthPromise}`);
}

// Listen for auth events globally to clear cache on sign out
if (typeof window !== 'undefined') {
  window.addEventListener('auth_signed_out', () => {
    console.log('[Auth] auth_signed_out event received — invalidating cache');
    invalidateUserCache();
  });
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create supabase client inside hook - singleton pattern ensures same instance
  const supabase = createClient();

  const fetchUserProfile = useCallback(async (userId: string, forceRefresh = false): Promise<UserProfile | null> => {
    // Clear cache if user ID changed (switching accounts)
    if (cachedUserId && cachedUserId !== userId) {
      invalidateUserCache();
    }

    // Check cache first - must match user ID
    if (!forceRefresh && cachedUser && cachedUserId === userId && Date.now() - cacheTimestamp < CACHE_DURATION) {
      if (mountedRef.current) {
        setUser(cachedUser);
        setLoading(false);
      }
      return cachedUser;
    }

    // If another fetch is in progress globally for the SAME user, wait for it
    if (globalFetchPromise && cachedUserId === userId) {
      const result = await globalFetchPromise;
      if (mountedRef.current) {
        setUser(result);
        setLoading(false);
      }
      return result;
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) return cachedUser;
    fetchingRef.current = true;
    cachedUserId = userId; // Track which user we're fetching

    // Create global promise with proper typing
    globalFetchPromise = new Promise<UserProfile | null>((resolve) => {
      globalFetchResolve = resolve;
    });

    // Set a timeout to prevent infinite loading on slow connections
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && fetchingRef.current) {
        console.warn('User fetch timeout - using cached data or null');
        setLoading(false);
        fetchingRef.current = false;
        // Resolve global promise on timeout
        if (globalFetchResolve) {
          globalFetchResolve(cachedUser);
          globalFetchResolve = null;
        }
        globalFetchPromise = null;
      }
    }, FETCH_TIMEOUT);

    let fetchedUser: UserProfile | null = null;
    const fetchStart = Date.now();

    try {
      console.log('[Auth] Profile fetch start for:', userId.substring(0, 8) + '...');
      
      // Select only essential fields for faster query
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name, avatar_url, role, subscription_tier, leaderboard_opt_out, country, exam_boards, level, levels, subjects_of_interest, onboarding_completed, xp, streak_days, created_at')
        .eq('id', userId)
        .single();

      const elapsed = Date.now() - fetchStart;
      console.log(`[Auth] Profile query completed in ${elapsed}ms`, error ? `error: ${error.code} ${error.message}` : 'success');

      // Clear timeout on successful response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!mountedRef.current) {
        fetchedUser = data || null;
        return fetchedUser;
      }

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create it
          console.log('[Auth] Profile not found, creating...');
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser && mountedRef.current) {
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
            
            if (!insertError && mountedRef.current) {
              const { data: newData } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
              if (newData) {
                cachedUser = newData;
                cacheTimestamp = Date.now();
                fetchedUser = newData;
                if (mountedRef.current) {
                  setUser(newData);
                  setLoading(false);
                }
                return fetchedUser;
              }
            }
          }
        }
        // Log non-404 errors
        if (error.code !== 'PGRST116') {
          console.error('[Auth] Profile fetch error:', error.code, error.message);
        }
        if (mountedRef.current) {
          setUser(null);
          setLoading(false);
        }
        return null;
      }

      if (data) {
        cachedUser = data;
        cacheTimestamp = Date.now();
        fetchedUser = data;
        if (mountedRef.current) {
          setUser(data);
        }
      } else if (mountedRef.current) {
        setUser(null);
      }
    } catch (err: unknown) {
      const elapsed = Date.now() - fetchStart;
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const errorName = err instanceof Error ? err.name : 'Unknown';
      console.error(`[Auth] Profile fetch threw after ${elapsed}ms:`, errorName, errorMessage);
      if (mountedRef.current) {
        setUser(null);
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
      // Resolve global promise
      if (globalFetchResolve) {
        globalFetchResolve(fetchedUser);
        globalFetchResolve = null;
      }
      globalFetchPromise = null;
    }

    return fetchedUser;
  }, [supabase]);

  useEffect(() => {
    mountedRef.current = true;
    let isSubscribed = true;
    let retryCount = 0;
    const MAX_RETRIES = 2;
    let authStateReceived = false; // Track if we've received an auth state event
    const effectId = Math.random().toString(36).substring(2, 6); // Unique ID for this effect run
    console.log(`[Auth] useUser effect mounted (id=${effectId})`);
    logState('effect-mount');

    // Initialize auth - uses session first (fast, local), then validates with getUser if needed
    const initializeAuth = async (): Promise<void> => {
      // If already initialized globally, just check cache
      if (globalAuthInitialized && cachedUser && cachedUserId) {
        if (mountedRef.current) {
          setUser(cachedUser);
          setLoading(false);
        }
        return;
      }

      // If another init is in progress, wait for it
      if (globalAuthPromise) {
        await globalAuthPromise;
        if (mountedRef.current) {
          setUser(cachedUser);
          setLoading(false);
        }
        return;
      }

      // Create shared promise for this init
      let resolveGlobalAuth: () => void;
      globalAuthPromise = new Promise<void>((resolve) => {
        resolveGlobalAuth = resolve;
      });

      try {
        // First check local session (fast) to avoid showing loading state unnecessarily
        const sessionStart = Date.now();
        console.log(`[Auth] (${effectId}) Calling getSession()...`);
        // Diagnostic: warn if getSession() takes more than 5s (indicates _initializePromise is blocked)
        const sessionWarn = setTimeout(() => {
          console.error(`[Auth] ⚠️ (${effectId}) getSession() STILL PENDING after 5s — Supabase _initialize is likely blocked`);
          logState('getSession-stuck');
        }, 5000);
        const { data: { session } } = await supabase.auth.getSession();
        clearTimeout(sessionWarn);
        console.log(`[Auth] (${effectId}) getSession() completed in ${Date.now() - sessionStart}ms, session: ${!!session?.user}`);
        
        if (!isSubscribed || !mountedRef.current) {
          resolveGlobalAuth!();
          globalAuthPromise = null;
          return;
        }
        
        if (session?.user) {
          // Session exists locally - fetch profile while validating in background
          console.log(`[Auth] (${effectId}) Session found, fetching profile for ${session.user.id.substring(0, 8)}...`);
          const profilePromise = fetchUserProfile(session.user.id);
          
          // Also validate with server in background (don't block UI)
          supabase.auth.getUser().then(({ error }: { error: { message: string } | null }) => {
            if (error && isSubscribed && mountedRef.current) {
              // Session was invalid - clear state
              console.log('[Auth] Session validation failed:', error.message);
              invalidateUserCache();
              setUser(null);
            }
          }).catch(() => {
            // Ignore validation errors - we'll rely on session refresh
          });
          
          await profilePromise;
          globalAuthInitialized = true;
        } else {
          // No session - try getUser as fallback (handles edge cases)
          console.log(`[Auth] (${effectId}) No session, trying getUser() fallback...`);
          const getUserStart = Date.now();
          const getUserWarn = setTimeout(() => {
            console.error(`[Auth] ⚠️ (${effectId}) getUser() STILL PENDING after 5s`);
          }, 5000);
          const { data: { user: authUser }, error } = await supabase.auth.getUser();
          clearTimeout(getUserWarn);
          console.log(`[Auth] (${effectId}) getUser() completed in ${Date.now() - getUserStart}ms, user: ${!!authUser}, error: ${error?.message || 'none'}`);
          
          if (!isSubscribed || !mountedRef.current) {
            resolveGlobalAuth!();
            globalAuthPromise = null;
            return;
          }
          
          if (error) {
            // Check if it's a network error - retry if so
            if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('timeout')) {
              if (retryCount < MAX_RETRIES) {
                retryCount++;
                console.log(`[Auth] Network error, retrying (${retryCount}/${MAX_RETRIES})...`);
                await new Promise(r => setTimeout(r, 1000 * retryCount));
                resolveGlobalAuth!();
                globalAuthPromise = null;
                return initializeAuth();
              }
            }
            // No valid session
            console.log('[Auth] No session:', error.message);
            if (mountedRef.current) {
              setLoading(false);
            }
            globalAuthInitialized = true;
          } else if (authUser) {
            await fetchUserProfile(authUser.id);
            globalAuthInitialized = true;
          } else {
            if (mountedRef.current) {
              setLoading(false);
            }
            globalAuthInitialized = true;
          }
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        // Retry on network errors
        if (retryCount < MAX_RETRIES && (errorMessage.includes('fetch') || errorMessage.includes('network'))) {
          retryCount++;
          console.log(`[Auth] Error, retrying (${retryCount}/${MAX_RETRIES})...`);
          await new Promise(r => setTimeout(r, 1000 * retryCount));
          resolveGlobalAuth!();
          globalAuthPromise = null;
          return initializeAuth();
        }
        console.error('[Auth] Init error:', errorMessage);
        if (isSubscribed && mountedRef.current) {
          setLoading(false);
        }
      } finally {
        resolveGlobalAuth!();
        globalAuthPromise = null;
      }
    };

    // Diagnostic probe: after 3s, independently test if getSession() works
    // This bypasses our initializeAuth flow and tests the Supabase client directly
    const probeId = setTimeout(async () => {
      if (!isSubscribed || !mountedRef.current) return;
      try {
        console.log(`[Diag] (${effectId}) Probe: calling getSession() independently...`);
        const probeStart = Date.now();
        const { data: { session: probeSession } } = await supabase.auth.getSession();
        console.log(`[Diag] (${effectId}) Probe: getSession() returned in ${Date.now() - probeStart}ms, session: ${!!probeSession?.user}`);
      } catch (err) {
        console.error(`[Diag] (${effectId}) Probe: getSession() threw:`, (err as Error).message);
      }
    }, 3000);

    // Timeout that only fires if no auth state received and still loading
    const timeoutId = setTimeout(() => {
      if (isSubscribed && mountedRef.current && loading && !authStateReceived) {
        console.warn(`[Auth] (${effectId}) Init timeout - authStateReceived=${authStateReceived}`);
        logState('init-timeout');
        // On timeout, do a quick session check before giving up
        supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
          if (session?.user && isSubscribed && mountedRef.current) {
            console.log('[Auth] Found session on timeout - recovering');
            fetchUserProfile(session.user.id);
          } else if (isSubscribed && mountedRef.current) {
            setLoading(false);
          }
        }).catch(() => {
          if (isSubscribed && mountedRef.current) {
            setLoading(false);
          }
        });
      }
    }, INIT_TIMEOUT);

    initializeAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    // Listen for auth changes - handles INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (!isSubscribed || !mountedRef.current) return;
      
      authStateReceived = true;
      console.log('[Auth] State change:', event);
      
      if (event === 'SIGNED_OUT') {
        globalAuthInitialized = false; // Reset so next mount re-initializes
        invalidateUserCache();
        setUser(null);
        setLoading(false);
      } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        // Handle both SIGNED_IN and INITIAL_SESSION (fired on page load with existing session)
        // Force refresh on sign in, use cache for initial session if available
        const forceRefresh = event === 'SIGNED_IN';
        if (event === 'INITIAL_SESSION' && cachedUser && cachedUserId === session.user.id) {
          // Use cached data for initial session
          setUser(cachedUser);
          setLoading(false);
        } else {
          // IMPORTANT: Do NOT await here. Awaiting blocks the auth state change
          // listener, which prevents subsequent events from being processed.
          // If the profile fetch hangs, it jams the entire auth pipeline.
          fetchUserProfile(session.user.id, forceRefresh);
        }

        // Recovery: if SIGNED_IN fires but _initializePromise is stuck, the profile
        // fetch will also hang because REST calls need getSession() for auth headers.
        // The session IS in cookies from the successful exchange. Force a clean reload
        // to break the deadlock — on reload, code verifier is consumed, _initialize
        // finds session in cookies and resolves immediately.
        if (event === 'SIGNED_IN' && !globalAuthInitialized) {
          globalAuthInitialized = true;
          console.log('[Auth] Recovery: marking auth initialized from SIGNED_IN event');
          // Wait briefly for normal completion, then force reload if still stuck
          setTimeout(() => {
            if (!cachedUser && isSubscribed && mountedRef.current) {
              console.warn('[Auth] Recovery: profile fetch stuck after SIGNED_IN — forcing clean reload');
              // Clean auth params from URL to prevent re-triggering PKCE detection on reload
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.delete('code');
                url.searchParams.delete('error');
                url.searchParams.delete('error_description');
                window.location.replace(url.pathname + (url.search || ''));
              }
            }
          }, 2000);
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed - validate cache is still valid
        if (cachedUserId !== session.user.id) {
          fetchUserProfile(session.user.id, true);
        }
      }
    });

    return () => {
      console.log(`[Auth] useUser effect cleanup (id=${effectId})`);
      isSubscribed = false;
      mountedRef.current = false;
      clearTimeout(probeId);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Provide a refresh function for manual refresh
  const refresh = useCallback(() => {
    if (user?.id) {
      return fetchUserProfile(user.id, true);
    }
    return Promise.resolve(null);
  }, [user?.id, fetchUserProfile]);

  return { user, loading, refresh };
}
