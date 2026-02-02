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
let cacheTimestamp = 0;
let globalFetchPromise: Promise<UserProfile | null> | null = null;
let globalFetchResolve: ((user: UserProfile | null) => void) | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache for better performance
const FETCH_TIMEOUT = 15000; // 15 second timeout for slow connections

const supabase = createClient();

// Helper to invalidate cache (can be called from other modules)
export function invalidateUserCache() {
  cachedUser = null;
  cacheTimestamp = 0;
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUserProfile = useCallback(async (userId: string, forceRefresh = false): Promise<UserProfile | null> => {
    // Check cache first
    if (!forceRefresh && cachedUser && cachedUser.id === userId && Date.now() - cacheTimestamp < CACHE_DURATION) {
      if (mountedRef.current) {
        setUser(cachedUser);
        setLoading(false);
      }
      return cachedUser;
    }

    // If another fetch is in progress globally, wait for it
    if (globalFetchPromise) {
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
      const { data, error } = await supabase
        .from('users')
        .select('*')
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
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let isSubscribed = true;

    // Get initial session with timeout for mobile
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<null>((resolve) => 
      setTimeout(() => resolve(null), FETCH_TIMEOUT)
    );

    Promise.race([sessionPromise, timeoutPromise]).then((result) => {
      if (!isSubscribed || !mountedRef.current) return;
      
      if (result && 'data' in result && result.data.session?.user) {
        fetchUserProfile(result.data.session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((err: unknown) => {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Session fetch error:', errorMessage);
      if (isSubscribed && mountedRef.current) {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (!isSubscribed || !mountedRef.current) return;
      
      if (event === 'SIGNED_OUT') {
        invalidateUserCache();
        setUser(null);
        setLoading(false);
      } else if (session?.user) {
        // Force refresh on sign in
        await fetchUserProfile(session.user.id, event === 'SIGNED_IN');
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
