/**
 * Balance API Module
 * Centralized balance fetching with localStorage sync
 */

export interface BalanceResponse {
  balance: number;
  source: string; // 'hive-engine' | 'localStorage-optimistic'
  timestamp: number;
}

/**
 * Fetch EURO balance for a Hive account
 * Implements the same robust strategy from menu/page.tsx:648
 */
export async function fetchEuroBalance(accountName: string): Promise<BalanceResponse> {
  console.log('[BALANCE API] Fetching balance for:', accountName);

  try {
    const response = await fetch(`/api/balance/euro?account=${encodeURIComponent(accountName)}`);

    if (!response.ok) {
      throw new Error(`Balance API returned ${response.status}`);
    }

    const data = await response.json();
    const euroBalance = data.balance;

    console.log('[BALANCE API] Retrieved balance:', euroBalance, 'from', data.source);

    return {
      balance: parseFloat(euroBalance.toFixed(2)),
      source: data.source,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('[BALANCE API] Fetch failed:', error);
    throw error;
  }
}

/**
 * Get cached balance from localStorage (optimistic fallback)
 */
export function getCachedBalance(): { balance: number; timestamp: number } | null {
  const cachedBalance = localStorage.getItem('innopay_lastBalance');
  const cachedTimestamp = localStorage.getItem('innopay_lastBalance_timestamp');

  if (!cachedBalance) {
    return null;
  }

  return {
    balance: parseFloat(cachedBalance),
    timestamp: cachedTimestamp ? parseInt(cachedTimestamp, 10) : 0,
  };
}

/**
 * Save balance to localStorage cache
 */
export function saveCachedBalance(balance: number, timestamp: number = Date.now()): void {
  localStorage.setItem('innopay_lastBalance', balance.toFixed(2));
  localStorage.setItem('innopay_lastBalance_timestamp', timestamp.toString());
  console.log('[BALANCE API] Cached balance:', balance);
}

/**
 * Check if cached balance is stale (older than 60 seconds)
 */
export function isCachedBalanceStale(): boolean {
  const cached = getCachedBalance();
  if (!cached) return true;

  const now = Date.now();
  const age = now - cached.timestamp;
  const isStale = age > 60000; // 60 seconds

  console.log('[BALANCE API] Cache age:', Math.round(age / 1000), 'seconds', isStale ? '(stale)' : '(fresh)');
  return isStale;
}
