/**
 * useBalance Hook
 * React Query hook for fetching and managing account balance
 *
 * Replaces the 3 duplicate balance fetches in menu/page.tsx:
 * - Line 648: Wallet balance refresh
 * - Line 1192: Call waiter balance check
 * - Line 1393: Wallet payment balance check
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchEuroBalance,
  getCachedBalance,
  saveCachedBalance,
  type BalanceResponse
} from '@/lib/api/balance';

interface UseBalanceOptions {
  enabled?: boolean; // Whether to automatically fetch (default: true)
  refetchInterval?: number | false; // Auto-refetch interval (default: false)
}

interface UseBalanceReturn {
  balance: number | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  source: string | null;
  refetch: () => void;
  updateBalance: (newBalance: number) => void; // Optimistic update
}

/**
 * Hook to fetch and manage EURO balance for a Hive account
 *
 * Features:
 * - Automatic caching (60 second stale time)
 * - Optimistic localStorage fallback
 * - Manual refetch support
 * - Optimistic updates (for post-payment scenarios)
 *
 * @param accountName - Hive account name (e.g., 'john.doe')
 * @param options - Query options (enabled, refetchInterval)
 * @returns Balance data and control functions
 */
export function useBalance(
  accountName: string | null,
  options: UseBalanceOptions = {}
): UseBalanceReturn {
  const { enabled = true, refetchInterval = false } = options;
  const queryClient = useQueryClient();

  // Query for fetching balance
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<BalanceResponse, Error>({
    queryKey: ['balance', accountName],
    queryFn: async () => {
      if (!accountName) {
        throw new Error('No account name provided');
      }

      // Fetch from API
      const result = await fetchEuroBalance(accountName);

      // Save to localStorage cache
      saveCachedBalance(result.balance, result.timestamp);

      return result;
    },
    enabled: enabled && !!accountName,
    staleTime: 60 * 1000, // 60 seconds (matches your current logic)
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchInterval,
    // Provide initial data from localStorage cache
    initialData: () => {
      if (!accountName) return undefined;

      const cached = getCachedBalance();
      if (cached) {
        console.log('[useBalance] Using cached balance as initial data:', cached.balance);
        return {
          balance: cached.balance,
          source: 'localStorage-cache',
          timestamp: cached.timestamp,
        };
      }
      return undefined;
    },
    // Retry on failure
    retry: 2,
  });

  // Mutation for optimistic balance updates
  const updateBalanceMutation = useMutation({
    mutationFn: async (newBalance: number) => {
      // Save to localStorage immediately (optimistic)
      saveCachedBalance(newBalance);
      return newBalance;
    },
    onSuccess: (newBalance) => {
      // Update the query cache optimistically
      queryClient.setQueryData<BalanceResponse>(['balance', accountName], (old) => ({
        balance: newBalance,
        source: 'optimistic-update',
        timestamp: Date.now(),
      }));
      console.log('[useBalance] Optimistic balance update:', newBalance);
    },
  });

  return {
    balance: data?.balance ?? null,
    isLoading,
    isError,
    error: error as Error | null,
    source: data?.source ?? null,
    refetch: () => {
      refetch();
    },
    updateBalance: (newBalance: number) => {
      updateBalanceMutation.mutate(newBalance);
    },
  };
}

/**
 * Helper hook to invalidate balance query (force refetch)
 * Useful after payments or top-ups
 */
export function useInvalidateBalance() {
  const queryClient = useQueryClient();

  return (accountName: string) => {
    console.log('[useBalance] Invalidating balance cache for:', accountName);
    queryClient.invalidateQueries({ queryKey: ['balance', accountName] });
  };
}
