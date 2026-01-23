'use client';

import { useEffect, useRef } from 'react';
import { useSessionTimeout } from '@/hooks/use-session-timeout';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';

/**
 * Component that manages session timeout for authenticated users
 * Also ensures gamification record is initialized for new users
 * Place this in the app layout to enable session management
 */
export function SessionManager({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const initializedRef = useRef(false);
  
  // Always call the hook (hooks must be called unconditionally)
  // The hook itself will handle the logic for authenticated users
  useSessionTimeout(!!user);

  // Initialize gamification record for new users
  useEffect(() => {
    if (!user?.id || initializedRef.current) return;
    
    const initializeGamification = async () => {
      const supabase = createClient();
      
      // Check if gamification record exists
      const { data, error } = await supabase
        .from('user_gamification')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      // If record doesn't exist, create it
      if (error && (error.code === 'PGRST116' || error.code === '406')) {
        console.log('Initializing gamification record for user:', user.id);
        await supabase
          .from('user_gamification')
          .insert({
            user_id: user.id,
            total_xp: 0,
            xp_this_week: 0,
            xp_level: 1,
            xp_progress_to_next_level: 0,
            xp_needed_for_next_level: 100,
            current_streak: 0,
            longest_streak: 0,
            total_quizzes_completed: 0,
            total_notes_viewed: 0,
            total_time_spent_minutes: 0
          });
      }
      
      initializedRef.current = true;
    };

    initializeGamification();
  }, [user?.id]);

  return <>{children}</>;
}
