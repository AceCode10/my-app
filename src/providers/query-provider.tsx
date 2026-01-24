'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes - reduces unnecessary refetches
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 15 minutes
            gcTime: 15 * 60 * 1000,
            // Retry failed requests up to 1 time with exponential backoff
            retry: 1,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
            // Don't refetch on window focus - prevents slow reloads
            refetchOnWindowFocus: false,
            // Only refetch on reconnect if data is stale
            refetchOnReconnect: 'always',
            // Don't refetch on mount if data is fresh
            refetchOnMount: true,
            // Network mode - always try even offline (uses cache)
            networkMode: 'offlineFirst',
          },
          mutations: {
            // Retry mutations once
            retry: 1,
            // Network mode for mutations
            networkMode: 'offlineFirst',
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
