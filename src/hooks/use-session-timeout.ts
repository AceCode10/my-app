'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

const supabase = createClient();

// Session timeout duration in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Warning before timeout (5 minutes before)
const WARNING_BEFORE_TIMEOUT = 5 * 60 * 1000;

/**
 * Hook to manage session timeout and automatic logout
 * Logs out user after 30 minutes of inactivity
 * Shows warning 5 minutes before timeout
 * @param isAuthenticated - Whether the user is authenticated
 */
export function useSessionTimeout(isAuthenticated: boolean) {
  const router = useRouter();
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Session Expired',
      description: 'You have been logged out due to inactivity. Please log in again.',
      variant: 'destructive',
    });
    router.push('/login');
  }, [router, toast]);

  const showWarning = useCallback(() => {
    toast({
      title: 'Session Expiring Soon',
      description: 'Your session will expire in 5 minutes due to inactivity. Move your mouse or click to stay logged in.',
      duration: 10000,
    });
  }, [toast]);

  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Set warning timeout (25 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      showWarning();
    }, SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT);

    // Set logout timeout (30 minutes)
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, SESSION_TIMEOUT);
  }, [handleLogout, showWarning]);

  useEffect(() => {
    // Only set up session timeout for authenticated users
    if (!isAuthenticated) {
      return;
    }

    // Events that indicate user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Throttle reset to avoid too many calls
    let throttleTimer: NodeJS.Timeout | null = null;
    const throttledReset = () => {
      if (!throttleTimer) {
        throttleTimer = setTimeout(() => {
          resetTimeout();
          throttleTimer = null;
        }, 1000); // Throttle to once per second
      }
    };

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, throttledReset);
    });

    // Initial timeout setup
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, throttledReset);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (throttleTimer) {
        clearTimeout(throttleTimer);
      }
    };
  }, [resetTimeout, isAuthenticated]);

  return { resetTimeout };
}
