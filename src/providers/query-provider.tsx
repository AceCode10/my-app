'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Shorter stale time for more responsive updates
            staleTime: 30 * 1000, // 30 seconds
            // Keep unused data in cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Retry failed requests up to 1 time with exponential backoff
            retry: 1,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
            // Refetch on window focus for fresh data
            refetchOnWindowFocus: true,
            // Refetch on reconnect
            refetchOnReconnect: true,
            // Refetch on mount to ensure fresh data
            refetchOnMount: true,
            // Network mode - online first for accuracy
            networkMode: 'online',
          },
          mutations: {
            // Retry mutations once
            retry: 1,
            // Network mode for mutations
            networkMode: 'online',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
