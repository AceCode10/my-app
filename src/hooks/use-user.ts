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
  created_at: string;
}

// Global cache for user profile to avoid refetching on every component mount
let cachedUser: UserProfile | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const supabase = createClient();

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);
  const fetchingRef = useRef(false);

  const fetchUserProfile = useCallback(async (userId: string, forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && cachedUser && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setUser(cachedUser);
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name, avatar_url, role, subscription_tier, leaderboard_opt_out, country, exam_boards, level, levels, subjects_of_interest, onboarding_completed, xp, streak_days, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) {
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: authUser.id,
                email: authUser.email,
                display_name: authUser.user_metadata?.display_name || authUser.email,
                role: authUser.user_metadata?.role || 'student',
                subscription_tier: authUser.user_metadata?.role === 'teacher' ? 'pro' : 'basic',
              });
            
            if (!insertError) {
              const { data: newData } = await supabase
                .from('users')
                .select('id, email, display_name, avatar_url, role, subscription_tier, leaderboard_opt_out, country, exam_boards, level, levels, subjects_of_interest, onboarding_completed, xp, streak_days, created_at')
                .eq('id', userId)
                .single();
              if (newData) {
                cachedUser = newData;
                cacheTimestamp = Date.now();
                setUser(newData);
                setLoading(false);
                return;
              }
            }
          }
        }
        setUser(null);
        setLoading(false);
        return;
      }

      if (data) {
        cachedUser = data;
        cacheTimestamp = Date.now();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setUser(null);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  return { user, loading };
}
