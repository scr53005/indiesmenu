# Resume Tomorrow - React Query Phase 2

**Date**: 2025-12-30
**Current Status**: Phase 1 Complete ✅, Ready for Phase 2

---

## ⚡ Quick Start (5 minutes)

### What We're Doing
Replacing the wallet balance fetch (98 lines) with React Query hook (15 lines).

### Where to Look
- **File**: `app/menu/page.tsx`
- **Lines**: 602-699 (the big useEffect for wallet balance)
- **Guide**: `REACT-QUERY-MIGRATION-PLAN.md` (detailed steps)

---

## 📋 Phase 2 Checklist

### Code Changes

- [ ] **1. Add import** (top of file)
  ```typescript
  import { useBalance } from '@/hooks/useBalance';
  ```

- [ ] **2. Get accountName** (before useBalance hook)
  ```typescript
  const accountName = typeof window !== 'undefined'
    ? localStorage.getItem('innopay_accountName')
    : null;
  ```

- [ ] **3. Add useBalance hook**
  ```typescript
  const { balance, isLoading: balanceLoading, refetch: refetchBalance } = useBalance(accountName, {
    enabled: !!accountName && !accountName.startsWith('mockaccount'),
  });
  ```

- [ ] **4. Add sync effect**
  ```typescript
  useEffect(() => {
    if (balance !== null && accountName) {
      setWalletBalance({ accountName, euroBalance: balance });
      setShowWalletBalance(true);
    }
  }, [balance, accountName]);
  ```

- [ ] **5. Delete old useEffect** (lines 602-699)

- [ ] **6. Delete refreshBalanceTrigger state**
  ```typescript
  // DELETE: const [refreshBalanceTrigger, setRefreshBalanceTrigger] = useState(0);
  ```

- [ ] **7. Replace all `setRefreshBalanceTrigger(prev => prev + 1)` with `refetchBalance()`**
  - Search for: `setRefreshBalanceTrigger`
  - Replace with: `refetchBalance()`

---

## ✅ Testing

- [ ] Start dev server: `npm run dev`
- [ ] Visit: `http://localhost:3001/menu?table=1`
- [ ] Check balance appears in MiniWallet
- [ ] Open DevTools → React Query tab (bottom-right)
- [ ] Verify "balance" query is visible
- [ ] Check console for `[BALANCE API]` logs
- [ ] No errors in console

---

## 💾 Commit

```bash
git add .
git commit -m "refactor: replace wallet balance fetch with React Query (Phase 2)

- Replaced manual fetch logic (98 lines) with useBalance hook (15 lines)
- Removed refreshBalanceTrigger state
- Added automatic caching with 60s stale time
- Balance now managed by React Query with built-in retry"
```

---

## 🎯 After Phase 2

Move to Phase 3: Replace call waiter balance fetch (line 1192)
- Same pattern, different location
- Even simpler because balance is already cached!

---

## 🆘 If Something Breaks

### Rollback
```bash
git checkout menu/page.tsx  # Undo changes
```

### Debug
1. Check console for errors
2. Check React Query DevTools
3. Verify `useBalance` hook is imported
4. Verify `accountName` is not null

---

## 📚 Full Documentation

- `MIGRATION-SUMMARY.md` - Overview & progress tracker
- `REACT-QUERY-MIGRATION-PLAN.md` - Detailed step-by-step guide
- `BALANCE-QUERY-MIGRATION.md` - Code examples for each phase

---

**Time Estimate**: 20-30 minutes for Phase 2
**Confidence Level**: High (infrastructure already tested)
**Next Session**: Phase 3 (10 minutes, uses same cached query!)

Good luck! 🚀
