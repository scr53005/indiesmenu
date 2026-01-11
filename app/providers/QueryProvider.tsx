'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // For blockchain data: disable background refetches but allow manual control
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            // CRITICAL: Allow refetchOnMount (individual queries can override)
            // This ensures fresh data on component mount
            refetchOnMount: true,
            // CRITICAL: Set staleTime to 0 for blockchain data (always fetch fresh)
            // Individual queries can override if needed
            staleTime: 0,
            // Cache data for 5 minutes
            gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
            // Retry failed requests (blockchain APIs can be flaky)
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show DevTools only in development */}
      {/* Commented out - DevTools not needed anymore */}
      {/* {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )} */}
    </QueryClientProvider>
  );
}
