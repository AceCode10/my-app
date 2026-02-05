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

// Global cache for user profile to avoid refetching on every component mount
let cachedUser: UserProfile | null = null;
let cachedUserId: string | null = null; // Track which user the cache belongs to
let cacheTimestamp = 0;
let globalFetchPromise: Promise<UserProfile | null> | null = null;
let globalFetchResolve: ((user: UserProfile | null) => void) | null = null;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache - shorter for better consistency
const FETCH_TIMEOUT = 30000; // 30 second timeout - production can be slow
const INIT_TIMEOUT = 20000; // 20 second timeout for initial auth check

// Helper to invalidate cache (can be called from other modules)
export function invalidateUserCache() {
  cachedUser = null;
  cachedUserId = null;
  cacheTimestamp = 0;
  globalFetchPromise = null;
  globalFetchResolve = null;
}

// Listen for auth events globally to clear cache on sign out
if (typeof window !== 'undefined') {
  window.addEventListener('auth_signed_out', () => {
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

    try {
      // Select only essential fields for faster query
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name, avatar_url, role, subscription_tier, leaderboard_opt_out, country, exam_boards, level, levels, subjects_of_interest, onboarding_completed, xp, streak_days, created_at')
        .eq('id', userId)
        .single();

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
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser && mountedRef.current) {
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: authUser.id,
                email: authUser.email,
                display_name: authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'User',
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
          console.error('Error fetching user profile:', error.message);
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
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      // Only log non-auth errors
      if (!errorMessage.includes('JWT')) {
        console.error('Error fetching user profile:', errorMessage);
      }
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

    // Use getUser() instead of getSession() - it validates with the server
    // This prevents issues where stale session data causes logout on refresh
    const initializeAuth = async (): Promise<void> => {
      try {
        // First try to get and validate the user with the server
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (!isSubscribed || !mountedRef.current) return;
        
        if (error) {
          // Check if it's a network error - retry if so
          if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('timeout')) {
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              console.log(`[Auth] Network error, retrying (${retryCount}/${MAX_RETRIES})...`);
              await new Promise(r => setTimeout(r, 1000 * retryCount));
              return initializeAuth();
            }
          }
          // Session is invalid or expired
          console.log('[Auth] Session validation failed:', error.message);
          invalidateUserCache();
          setUser(null);
          setLoading(false);
          return;
        }
        
        if (authUser) {
          await fetchUserProfile(authUser.id);
        } else {
          setLoading(false);
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        // Retry on network errors
        if (retryCount < MAX_RETRIES && (errorMessage.includes('fetch') || errorMessage.includes('network'))) {
          retryCount++;
          console.log(`[Auth] Error, retrying (${retryCount}/${MAX_RETRIES})...`);
          await new Promise(r => setTimeout(r, 1000 * retryCount));
          return initializeAuth();
        }
        console.error('[Auth] Init error:', errorMessage);
        if (isSubscribed && mountedRef.current) {
          setLoading(false);
        }
      }
    };

    // Add timeout wrapper for slow connections - but don't set user to null
    // Just stop the loading indicator so UI is responsive
    const timeoutId = setTimeout(() => {
      if (isSubscribed && mountedRef.current && loading) {
        console.warn('[Auth] Init timeout - but keeping any existing user state');
        // Only set loading false, don't clear user - auth state change will handle it
        setLoading(false);
      }
    }, INIT_TIMEOUT);

    initializeAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (!isSubscribed || !mountedRef.current) return;
      
      console.log('[Auth] State change:', event);
      
      if (event === 'SIGNED_OUT') {
        invalidateUserCache();
        setUser(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        // Force refresh on sign in to get fresh user data
        await fetchUserProfile(session.user.id, true);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Token refreshed - validate cache is still valid
        if (cachedUserId !== session.user.id) {
          await fetchUserProfile(session.user.id, true);
        }
      }
    });

    return () => {
      isSubscribed = false;
      mountedRef.current = false;
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
