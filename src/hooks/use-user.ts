'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  role: 'student' | 'teacher' | 'content_moderator' | 'super_admin';
  subscription_tier: 'basic' | 'essential' | 'pro';
  leaderboard_opt_out?: boolean;
  country?: string; // User's country code
  exam_boards?: string[];
  level?: string; // Single level for students
  levels?: string[]; // Multiple levels for teachers
  subjects_of_interest?: string[];
  onboarding_completed?: boolean;
  xp?: number;
  streak_days?: number;
  // Temporarily removed fields until database is updated
  // school_name?: string; // For teachers
  // notification_preferences?: Record<string, boolean>; // User notification settings
  created_at: string;
}

// Global cache for user profile to avoid refetching on every component mount
let cachedUser: UserProfile | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes - extended for better performance
const FETCH_TIMEOUT = 8000; // 8 second timeout - reduced for better UX

const supabase = createClient();

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUserProfile = useCallback(async (userId: string, forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && cachedUser && Date.now() - cacheTimestamp < CACHE_DURATION) {
      if (mountedRef.current) {
        setUser(cachedUser);
        setLoading(false);
      }
      return;
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // Set a timeout to prevent infinite loading on slow connections
    timeoutRef.current = setTimeout(() => {
      if (mountedRef.current && fetchingRef.current) {
        console.warn('User fetch timeout - using cached data or null');
        setLoading(false);
        fetchingRef.current = false;
      }
    }, FETCH_TIMEOUT);

    try {
      console.log('[useUser] Fetching user profile for:', userId);
      const startTime = Date.now();
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      const fetchTime = Date.now() - startTime;
      console.log(`[useUser] Query completed in ${fetchTime}ms`);

      // Clear timeout on successful response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!mountedRef.current) return;

      if (error) {
        console.error('[useUser] Error fetching user:', error.code, error.message, error);
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create it
          console.log('[useUser] User profile not found, creating...');
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser && mountedRef.current) {
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: authUser.id,
                email: authUser.email,
                display_name: authUser.user_metadata?.display_name || authUser.email,
                role: authUser.user_metadata?.role || 'student',
                subscription_tier: authUser.user_metadata?.role === 'teacher' ? 'pro' : 'basic',
              });
            
            if (insertError) {
              console.error('[useUser] Error creating user profile:', insertError);
            }
            
            if (!insertError && mountedRef.current) {
              const { data: newData } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
              if (newData && mountedRef.current) {
                console.log('[useUser] User profile created successfully');
                cachedUser = newData;
                cacheTimestamp = Date.now();
                setUser(newData);
                setLoading(false);
                fetchingRef.current = false;
                return;
              }
            }
          }
        }
        if (mountedRef.current) {
          setUser(null);
          setLoading(false);
        }
        fetchingRef.current = false;
        return;
      }

      if (data && mountedRef.current) {
        cachedUser = data;
        cacheTimestamp = Date.now();
        setUser(data);
      } else if (mountedRef.current) {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
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
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Get initial session with timeout for mobile
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<null>((resolve) => 
      setTimeout(() => resolve(null), FETCH_TIMEOUT)
    );

    Promise.race([sessionPromise, timeoutPromise]).then((result) => {
      if (!mountedRef.current) return;
      
      if (result && 'data' in result && result.data.session?.user) {
        fetchUserProfile(result.data.session.user.id);
      } else {
        setLoading(false);
      }
    }).catch(() => {
      if (mountedRef.current) {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: { user?: { id: string } } | null) => {
      if (!mountedRef.current) return;
      
      if (event === 'SIGNED_OUT') {
        cachedUser = null;
        cacheTimestamp = 0;
        setUser(null);
        setLoading(false);
      } else if (session?.user) {
        // Force refresh on sign in
        await fetchUserProfile(session.user.id, event === 'SIGNED_IN');
      }
    });

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Provide a refresh function for manual refresh
  const refresh = useCallback(() => {
    if (user?.id) {
      fetchUserProfile(user.id, true);
    }
  }, [user?.id, fetchUserProfile]);

  return { user, loading, refresh };
}
