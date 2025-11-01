'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  role: 'student' | 'teacher' | 'content_moderator' | 'super_admin';
  subscription_tier: 'basic' | 'essential' | 'pro';
  leaderboard_opt_out?: boolean;
  created_at: string;
}

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

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
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function fetchUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          userId: userId
        });
        
        // If profile doesn't exist (PGRST116), create it manually
        if (error.code === 'PGRST116') {
          console.warn('User profile not found. Attempting to create...');
          // Try to get user data from auth
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
            
            if (insertError) {
              console.error('Failed to create user profile:', insertError);
            } else {
              console.log('User profile created successfully, retrying fetch...');
              // Retry fetching the profile
              const { data: newData } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
              if (newData) {
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
        setUser(data);
      } else {
        console.warn('User profile not found for authenticated user:', userId);
        setUser(null);
      }
    } catch (err) {
      console.error('Unexpected error fetching user profile:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  return { user, loading };
}
