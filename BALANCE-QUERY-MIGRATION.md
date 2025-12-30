# Balance Query Migration Guide

## Phase 3: Replace Wallet Balance Fetch (Line 602)

### BEFORE (98 lines of code)

```typescript
// menu/page.tsx:602-699
useEffect(() => {
  const checkWalletBalance = async () => {
    if (typeof window === 'undefined') return;

    const accountName = localStorage.getItem('innopay_accountName');
    if (!accountName) return;

    // Check cached balance
    const cachedBalance = localStorage.getItem('innopay_lastBalance');
    if (cachedBalance) {
      setWalletBalance({ accountName, euroBalance: parseFloat(cachedBalance) });
      setShowWalletBalance(true);
    }

    // Skip blockchain for mock accounts
    if (accountName.startsWith('mockaccount')) {
      if (!cachedBalance) {
        setWalletBalance({ accountName, euroBalance: 0 });
        setShowWalletBalance(true);
      }
      return;
    }

    try {
      // Fetch from API
      const response = await fetch(`/api/balance/euro?account=${encodeURIComponent(accountName)}`);

      if (response.ok) {
        const data = await response.json();
        const euroBalance = data.balance;

        // Complex staleness logic
        const currentBalance = parseFloat(localStorage.getItem('innopay_lastBalance') || '0');
        const balanceTimestamp = parseInt(localStorage.getItem('innopay_lastBalance_timestamp') || '0');
        const now = Date.now();
        const isStale = (now - balanceTimestamp) > 60000;

        if (euroBalance >= currentBalance || isStale) {
          setWalletBalance({ accountName, euroBalance });
          localStorage.setItem('innopay_lastBalance', euroBalance.toFixed(2));
          localStorage.setItem('innopay_lastBalance_timestamp', now.toString());
          setShowWalletBalance(true);
        } else {
          // Retry after 5 seconds
          setTimeout(() => setRefreshBalanceTrigger(prev => prev + 1), 5000);
        }
      }
    } catch (error) {
      console.error('[WALLET BALANCE] Error:', error);
    }
  };

  checkWalletBalance();
}, [refreshBalanceTrigger]);
```

---

### AFTER (15 lines of code)

```typescript
// menu/page.tsx - Add at top with other hooks
import { useBalance } from '@/hooks/useBalance';

// Inside MenuPage component:
const accountName = typeof window !== 'undefined'
  ? localStorage.getItem('innopay_accountName')
  : null;

// Replace entire useEffect with this hook:
const { balance, isLoading, refetch } = useBalance(accountName, {
  enabled: !!accountName && !accountName.startsWith('mockaccount'),
  refetchInterval: false // Manual refetch only
});

// Update walletBalance state when balance changes:
useEffect(() => {
  if (balance !== null && accountName) {
    setWalletBalance({
      accountName,
      euroBalance: balance
    });
    setShowWalletBalance(true);
  }
}, [balance, accountName]);

// Trigger refetch when needed (replaces refreshBalanceTrigger):
// refetch(); // Call this instead of setRefreshBalanceTrigger(prev => prev + 1)
```

---

## Changes Summary

### ✅ What's Eliminated:

- ❌ 98 lines of manual fetch logic → 15 lines
- ❌ Manual localStorage reads (innopay_lastBalance, innopay_lastBalance_timestamp)
- ❌ Manual staleness checks (60 second timestamp comparison)
- ❌ Complex retry logic with setTimeout
- ❌ Duplicate error handling

### ✅ What's Automatic Now:

- ✓ localStorage caching (via useBalance hook)
- ✓ Staleness tracking (React Query's staleTime: 60s)
- ✓ Automatic retries (React Query's retry: 2)
- ✓ Loading states (isLoading)
- ✓ Error states (isError, error)
- ✓ Cache invalidation (via queryClient.invalidateQueries)

---

## Step-by-Step Refactor

### 1. Add import at top of menu/page.tsx:

```typescript
import { useBalance } from '@/hooks/useBalance';
```

### 2. Get accountName from localStorage:

```typescript
// Add before the useBalance hook
const accountName = typeof window !== 'undefined'
  ? localStorage.getItem('innopay_accountName')
  : null;
```

### 3. Replace the entire useEffect (lines 602-699) with:

```typescript
// Fetch balance using React Query
const { balance, isLoading, refetch } = useBalance(accountName, {
  enabled: !!accountName && !accountName.startsWith('mockaccount'),
});

// Sync balance to walletBalance state
useEffect(() => {
  if (balance !== null && accountName) {
    setWalletBalance({
      accountName,
      euroBalance: balance
    });
    setShowWalletBalance(true);
  }
}, [balance, accountName]);
```

### 4. Replace all `setRefreshBalanceTrigger(prev => prev + 1)` calls with:

```typescript
refetch();
```

This occurs in:
- Flow 7 completion handler
- Payment success handlers
- Any place that needs to refresh balance

### 5. Remove the `refreshBalanceTrigger` state:

```typescript
// DELETE THIS LINE:
const [refreshBalanceTrigger, setRefreshBalanceTrigger] = useState(0);
```

---

## Testing Checklist

- [ ] Wallet balance appears on page load (cached)
- [ ] Balance fetches from API after 60 seconds (stale time)
- [ ] Mock accounts (mockaccountXXX) don't fetch from API
- [ ] Balance updates after payment
- [ ] Balance updates after top-up
- [ ] React Query DevTools shows balance query
- [ ] Console logs show "[BALANCE API]" messages
- [ ] No errors in browser console

---

## Next Steps (Phase 4 & 5)

Once this works, we'll:
1. Replace the second balance fetch (Call Waiter - line 1192)
2. Replace the third balance fetch (Wallet Payment - line 1393)
3. Both will use the SAME `useBalance` hook → Automatic deduplication!

