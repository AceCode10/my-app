'use client';

// ============================================
// ONBOARDING CHECK HOOK
// Redirects users to onboarding if not completed
// ============================================

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function useOnboardingCheck() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isChecking, setIsChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      // Skip check if already on onboarding page
      if (pathname?.startsWith('/onboarding')) {
        setIsChecking(false);
        return;
      }

      // Skip check for public pages
      const publicPages = ['/login', '/signup', '/forgot-password', '/reset-password', '/'];
      if (publicPages.some(page => pathname === page)) {
        setIsChecking(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsChecking(false);
          return;
        }

        // Check if onboarding completed
        const { data: userRecord, error } = await supabase
          .from('users')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking onboarding status:', error);
          setIsChecking(false);
          return;
        }

        if (!userRecord?.onboarding_completed) {
          setNeedsOnboarding(true);
          // Onboarding is now handled during signup, so we don't redirect
          // Users can update preferences in settings later
          // This check is kept for legacy users who might not have completed onboarding
        }
      } catch (error) {
        console.error('Error in onboarding check:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [pathname, router, supabase]);

  return { isChecking, needsOnboarding };
}
