'use client';

import { useSessionTimeout } from '@/hooks/use-session-timeout';
import { useUser } from '@/hooks/use-user';

/**
 * Component that manages session timeout for authenticated users
 * Place this in the app layout to enable session management
 */
export function SessionManager({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  
  // Always call the hook (hooks must be called unconditionally)
  // The hook itself will handle the logic for authenticated users
  useSessionTimeout(!!user);

  return <>{children}</>;
}
