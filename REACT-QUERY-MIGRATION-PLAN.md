# React Query Migration Plan: Balance Fetching Refactor

**Goal**: Replace 3 duplicate balance fetches with a single React Query hook

**Time Estimate**: 2-3 hours total

**Complexity**: Medium (incremental, testable at each step)

---

## 📦 Files Created

- ✅ `app/providers/QueryProvider.tsx` - React Query setup
- ✅ `lib/api/balance.ts` - Centralized balance API
- ✅ `hooks/useBalance.ts` - Balance query hook
- ✅ `app/layout.tsx` - Updated with QueryProvider

---

## 🎯 Migration Phases

### **Phase 1: Setup** ✅ (COMPLETE)

1. ✅ Install dependencies
2. ✅ Create QueryProvider
3. ✅ Wrap app with QueryProvider
4. ✅ Create balance API module
5. ✅ Create useBalance hook

**Status**: Infrastructure ready, no app behavior changed yet

---

### **Phase 2: Replace Balance Fetch #1** (Wallet Balance - Line 602)

**Location**: `menu/page.tsx:602-699` (98 lines)

#### BEFORE:
```typescript
const [refreshBalanceTrigger, setRefreshBalanceTrigger] = useState(0);

useEffect(() => {
  const checkWalletBalance = async () => {
    // ... 98 lines of manual fetch logic
  };
  checkWalletBalance();
}, [refreshBalanceTrigger]);
```

#### AFTER:
```typescript
import { useBalance } from '@/hooks/useBalance';

// Get accountName
const accountName = typeof window !== 'undefined'
  ? localStorage.getItem('innopay_accountName')
  : null;

// Replace entire useEffect with this hook
const { balance, isLoading, refetch } = useBalance(accountName, {
  enabled: !!accountName && !accountName.startsWith('mockaccount'),
});

// Sync to walletBalance state
useEffect(() => {
  if (balance !== null && accountName) {
    setWalletBalance({ accountName, euroBalance: balance });
    setShowWalletBalance(true);
  }
}, [balance, accountName]);
```

#### Changes:
1. Add import: `import { useBalance } from '@/hooks/useBalance';`
2. Add accountName retrieval before useBalance hook
3. Replace lines 602-699 with the "AFTER" code above
4. Delete: `const [refreshBalanceTrigger, setRefreshBalanceTrigger] = useState(0);`
5. Find/Replace: `setRefreshBalanceTrigger(prev => prev + 1)` → `refetch()`

**Lines Saved**: 98 → 15 (83 lines removed)

**Test**:
- Load page → balance appears
- Wait 60s → balance refetches automatically
- Check DevTools → "balance" query visible

---

### **Phase 3: Replace Balance Fetch #2** (Call Waiter - Line 1192)

**Location**: `menu/page.tsx:1179-1217` (duplicate fetch in callWaiter function)

#### BEFORE:
```typescript
const callWaiter = async (accountName: string, masterPassword: string) => {
  // ...existing code...

  // Get balance
  let euroBalance = parseFloat(optimisticBalanceStr || '0');

  // Fetch from API
  try {
    const response = await fetch(`/api/balance/euro?account=${encodeURIComponent(accountName)}`);
    if (response.ok) {
      const data = await response.json();
      euroBalance = data.balance;
      localStorage.setItem('innopay_lastBalance', euroBalance.toFixed(2));
    }
  } catch (apiError) {
    console.warn('[CALL WAITER] API fetch failed, using optimistic balance:', apiError);
  }

  // ...rest of function...
};
```

#### AFTER:
```typescript
const callWaiter = async (accountName: string, masterPassword: string) => {
  // ...existing code...

  // Get balance from React Query cache (already fetched by useBalance hook)
  const cachedBalance = balance; // From useBalance hook
  const euroBalance = cachedBalance ?? parseFloat(optimisticBalanceStr || '0');

  // If stale, trigger refetch (non-blocking)
  if (euroBalance === null) {
    refetch(); // Will update in background
  }

  console.log('[CALL WAITER] Customer EURO balance:', euroBalance);

  // ...rest of function...
};
```

**Key Insight**: Since `useBalance` is already running, the balance is **already cached**! We just read from the cache instead of fetching again.

**Lines Saved**: 28 → 8 (20 lines removed)

**Test**:
- Call waiter → uses cached balance
- No duplicate fetch in Network tab

---

### **Phase 4: Replace Balance Fetch #3** (Wallet Payment - Line 1393)

**Location**: `menu/page.tsx:1380-1417` (duplicate fetch in handleWalletPayment)

#### BEFORE:
```typescript
const handleWalletPayment = async () => {
  // ...existing code...

  // Get current balance
  let currentEuroBalance = parseFloat(optimisticBalanceStr || '0');

  // Fetch from API
  try {
    const response = await fetch(`/api/balance/euro?account=${encodeURIComponent(accountName)}`);
    if (response.ok) {
      const data = await response.json();
      currentEuroBalance = data.balance;
      localStorage.setItem('innopay_lastBalance', currentEuroBalance.toFixed(2));
    }
  } catch (apiError) {
    console.warn('[WALLET PAYMENT] API fetch failed, using optimistic balance:', apiError);
  }

  // ...rest of function...
};
```

#### AFTER:
```typescript
const handleWalletPayment = async () => {
  // ...existing code...

  // Get balance from React Query cache
  const currentEuroBalance = balance ?? parseFloat(optimisticBalanceStr || '0');

  // Refetch to ensure latest balance before payment
  await refetch();
  const latestBalance = balance ?? currentEuroBalance;

  console.log('[WALLET PAYMENT] Current EURO balance:', latestBalance);

  // ...rest of function...
};
```

**Lines Saved**: 25 → 7 (18 lines removed)

**Test**:
- Make payment → balance refetched first
- After payment → balance updates automatically

---

### **Phase 5: Optimistic Updates After Payment** (Bonus)

After a successful payment, we can **optimistically update** the balance without waiting for the API:

#### Add to payment success handler:

```typescript
import { useBalance, useInvalidateBalance } from '@/hooks/useBalance';

const { balance, updateBalance, refetch } = useBalance(accountName);
const invalidateBalance = useInvalidateBalance();

// After successful payment:
const handlePaymentSuccess = async () => {
  const orderTotal = parseFloat(getTotalEurPrice());
  const newBalance = (balance ?? 0) - orderTotal;

  // Optimistic update (instant UI feedback)
  updateBalance(newBalance);

  // Invalidate cache to refetch real balance after 2 seconds
  setTimeout(() => {
    invalidateBalance(accountName);
  }, 2000);
};
```

**Benefit**: UI updates **instantly**, then confirms with real balance from blockchain after 2s.

---

## 📊 Total Impact

### Lines of Code:
- **Before**: 151 lines of balance fetching code
- **After**: 30 lines (React Query hooks)
- **Saved**: 121 lines (80% reduction)

### Maintenance:
- **Before**: 3 places to update when API changes
- **After**: 1 place (`lib/api/balance.ts`)

### Performance:
- **Before**: 3 separate fetches (could happen simultaneously)
- **After**: 1 fetch, shared cache (automatic deduplication)

### Developer Experience:
- Built-in DevTools for debugging
- Automatic retry on failure
- Loading/error states for free
- Type-safe throughout

---

## 🧪 Testing Strategy

### 1. After Phase 2 (First Replacement):
```bash
npm run dev
```
- Open http://localhost:3001/menu?table=1
- Open DevTools → Network tab
- Check: Only 1 balance fetch on load
- Open React Query DevTools (bottom-right)
- Check: "balance" query shows in cache

### 2. After Phase 3 (Second Replacement):
- Click "Call Waiter" button
- Check Network tab: NO duplicate balance fetch
- Check DevTools: Uses cached balance

### 3. After Phase 4 (Third Replacement):
- Click "Pay with Wallet"
- Check Network tab: Balance refetched before payment
- After payment: Balance updates automatically

### 4. Final Validation:
- Clear localStorage
- Reload page
- Check: Balance fetches only ONCE
- Make payment
- Check: Balance updates correctly
- Check console: No "[WALLET BALANCE]" duplicate logs

---

## 🚨 Rollback Plan

If anything breaks:

```bash
git checkout menu/page.tsx
```

All new files (QueryProvider, useBalance) can stay - they don't affect existing code until you use them.

---

## 🎯 Next Steps

1. **Run Phase 2** (Replace first balance fetch)
   - Test thoroughly
   - Commit: `git commit -m "refactor: replace wallet balance fetch with React Query"`

2. **Run Phase 3** (Replace second balance fetch)
   - Test Call Waiter flow
   - Commit: `git commit -m "refactor: replace call waiter balance fetch with React Query"`

3. **Run Phase 4** (Replace third balance fetch)
   - Test payment flow
   - Commit: `git commit -m "refactor: replace wallet payment balance fetch with React Query"`

4. **Run Phase 5** (Add optimistic updates)
   - Test instant UI feedback
   - Commit: `git commit -m "feat: add optimistic balance updates"`

---

## 📚 Resources

- React Query Docs: https://tanstack.com/query/latest/docs/react/overview
- DevTools: https://tanstack.com/query/latest/docs/react/devtools
- Optimistic Updates: https://tanstack.com/query/latest/docs/react/guides/optimistic-updates

---

**Ready to start?** Begin with Phase 2 - replace the first balance fetch and test thoroughly before proceeding.
