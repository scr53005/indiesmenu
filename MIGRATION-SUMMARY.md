# Balance Fetching Refactor - Quick Start Guide

## ✅ What's Been Done (Phase 1 - Infrastructure)

All infrastructure is ready! The following files have been created:

1. **`app/providers/QueryProvider.tsx`** - React Query configuration
2. **`lib/api/balance.ts`** - Centralized balance API
3. **`hooks/useBalance.ts`** - Balance query hook
4. **`app/layout.tsx`** - Updated with QueryProvider wrapper

**Status**: ✅ No breaking changes, app works exactly as before

---

## 🎯 What's Next (Phase 2-5 - Actual Refactoring)

Now you can refactor the 3 duplicate balance fetches **one at a time**.

### Quick Win Checklist:

- [ ] **Phase 2**: Replace wallet balance fetch (line 602) → Save 83 lines
- [ ] **Phase 3**: Replace call waiter balance fetch (line 1192) → Save 20 lines
- [ ] **Phase 4**: Replace wallet payment balance fetch (line 1393) → Save 18 lines
- [ ] **Phase 5**: Add optimistic updates (bonus feature)

**Total Time**: 2-3 hours
**Total Lines Saved**: 121 lines (80% reduction)

---

## 📖 How to Use the Migration Plan

### Step 1: Read the Plan
```bash
cat REACT-QUERY-MIGRATION-PLAN.md
```

### Step 2: Start with Phase 2
Open `menu/page.tsx` and follow the "BEFORE → AFTER" code examples in the migration plan.

### Step 3: Test After Each Phase
```bash
npm run dev
# Open http://localhost:3001/menu?table=1
# Test the specific feature you just refactored
```

### Step 4: Commit After Each Phase
```bash
git add .
git commit -m "refactor: replace balance fetch #1 with React Query"
```

---

## 🐛 Debugging Tools

### React Query DevTools
- **Location**: Bottom-right corner of the page
- **Shows**: All active queries, cache state, fetch status
- **Usage**: Click to expand, inspect "balance" query

### Console Logs
Look for these prefixes:
- `[BALANCE API]` - New React Query logs
- `[useBalance]` - Hook-specific logs
- `[WALLET BALANCE]` - Old logs (will be removed during migration)

---

## 🔄 What Changes for You

### Before (Manual Fetching):
```typescript
// 98 lines of fetch logic
useEffect(() => {
  const checkWalletBalance = async () => {
    const response = await fetch(...);
    const data = await response.json();
    localStorage.setItem('innopay_lastBalance', ...);
    // ... complex staleness logic
  };
  checkWalletBalance();
}, [refreshBalanceTrigger]);
```

### After (React Query):
```typescript
// 15 lines total
import { useBalance } from '@/hooks/useBalance';

const { balance, refetch } = useBalance(accountName);

useEffect(() => {
  if (balance !== null && accountName) {
    setWalletBalance({ accountName, euroBalance: balance });
  }
}, [balance, accountName]);
```

---

## 🎁 Benefits You'll Get

### 1. Automatic Deduplication
**Before**: 3 identical fetches could run simultaneously
**After**: React Query shares the cached result

### 2. Smart Caching
**Before**: Manual localStorage with timestamp checks
**After**: React Query manages cache automatically (60s stale time)

### 3. Loading States
**Before**: Manual `isLoading` state management
**After**: `const { isLoading } = useBalance()` - built-in

### 4. Error Handling
**Before**: try/catch in every fetch
**After**: `const { error, isError } = useBalance()` - built-in

### 5. Optimistic Updates
**Before**: Not possible
**After**: `updateBalance(newBalance)` - instant UI feedback

### 6. DevTools
**Before**: Manual console.log debugging
**After**: Visual DevTools showing cache state

---

## 📞 Support

### If Something Breaks:

1. **Check the console** for error messages
2. **Check DevTools** (React Query panel)
3. **Rollback**: `git checkout menu/page.tsx`
4. **Ask for help** with the error message

### Common Issues:

**Issue**: "useBalance is not defined"
**Fix**: Add import: `import { useBalance } from '@/hooks/useBalance';`

**Issue**: "balance is always null"
**Fix**: Check accountName is not null, check DevTools for query status

**Issue**: "Too many refetches"
**Fix**: Check `enabled` option is set correctly

---

## 🚀 Ready to Start?

1. Open `REACT-QUERY-MIGRATION-PLAN.md`
2. Follow Phase 2 instructions
3. Test thoroughly
4. Move to Phase 3

**Good luck!** 🎉

---

## 📊 Progress Tracker

Track your progress:

- [x] Phase 1: Infrastructure setup ✅ (2025-12-30)
  - ✅ Installed React Query v5.90.15 + DevTools
  - ✅ Created QueryProvider with optimal config
  - ✅ Created balance API module (`lib/api/balance.ts`)
  - ✅ Created useBalance hook (`hooks/useBalance.ts`)
  - ✅ Fixed TypeScript errors (DevTools buttonPosition)
  - ✅ Wrapped app in layout.tsx
  - **Status**: Ready for Phase 2

- [ ] Phase 2: Replace balance fetch #1 (wallet balance) ⏳ NEXT
  - **Location**: `menu/page.tsx:602-699`
  - **Lines to save**: 83 lines (98 → 15)
  - **Steps**: Add import, get accountName, replace useEffect, remove refreshBalanceTrigger
  - **Test**: Balance appears on load, DevTools shows query

- [ ] Phase 3: Replace balance fetch #2 (call waiter)
  - **Location**: `menu/page.tsx:1192`
  - **Lines to save**: 20 lines

- [ ] Phase 4: Replace balance fetch #3 (wallet payment)
  - **Location**: `menu/page.tsx:1393`
  - **Lines to save**: 18 lines

- [ ] Phase 5: Add optimistic updates (bonus)

**Last Updated**: 2025-12-30 01:30 CET
**Current Session**: Ready to start Phase 2 tomorrow

---

## 🔄 Why Commit After Each Phase?

### 1. **Safe Rollback Points**
Each phase is a complete, working unit. If Phase 3 breaks something, you can:
```bash
git checkout menu/page.tsx  # Roll back just the broken file
# Or
git reset --hard HEAD~1      # Roll back the entire phase
```

### 2. **Bisect-Friendly History**
If a bug appears later, you can use `git bisect` to find which phase introduced it:
```bash
git bisect start
git bisect bad              # Current state has bug
git bisect good <commit>    # Phase 1 was working
# Git will binary search through Phase 2, 3, 4...
```

### 3. **Code Review Clarity**
Each commit tells a story:
- `refactor: replace wallet balance fetch with React Query (Phase 2)`
- `refactor: replace call waiter balance fetch with React Query (Phase 3)`
- `refactor: replace payment balance fetch with React Query (Phase 4)`

Much clearer than one giant commit: `refactor: add React Query (changed 500 lines)`

### 4. **Testing Isolation**
Test after each phase to ensure:
- Phase 2 works → commit
- Phase 3 works → commit
- **Phase 4 breaks** → Don't commit, investigate, fix, then commit

If you committed Phase 2 & 3, you know the bug is in Phase 4, not somewhere else.

### 5. **Collaboration Safety**
If working in a team, small commits:
- Reduce merge conflicts
- Make PR reviews manageable
- Allow cherry-picking specific features

### 6. **Progress Tracking**
You can see exactly what you accomplished:
```
✅ Phase 1: Infrastructure (committed)
✅ Phase 2: Balance fetch 1 (committed)
⏸️ Phase 3: Balance fetch 2 (in progress)
```

---

## 📝 Tomorrow's Resume Guide

When you're ready to continue:

### Step 1: Check Current State
```bash
cd /c/Users/Sorin/Documents/GitHub/indiesmenu
git status  # Should show clean working tree after Phase 1
```

### Step 2: Read the Plan
```bash
cat MIGRATION-SUMMARY.md          # Quick overview
cat REACT-QUERY-MIGRATION-PLAN.md # Detailed steps for Phase 2
```

### Step 3: Start Phase 2
Follow the steps in `REACT-QUERY-MIGRATION-PLAN.md` under "Phase 2":
1. Add import: `import { useBalance } from '@/hooks/useBalance';`
2. Get accountName from localStorage
3. Replace the useEffect (lines 602-699)
4. Remove `refreshBalanceTrigger` state
5. Replace `setRefreshBalanceTrigger` calls with `refetchBalance()`

### Step 4: Test Phase 2
```bash
npm run dev
# Visit http://localhost:3001/menu?table=1
# Check balance appears
# Open React Query DevTools (bottom-right)
```

### Step 5: Commit Phase 2
```bash
git add .
git commit -m "refactor: replace wallet balance fetch with React Query (Phase 2)

- Replaced manual fetch logic (98 lines) with useBalance hook (15 lines)
- Removed refreshBalanceTrigger state
- Added automatic caching with 60s stale time
- Balance now managed by React Query with built-in retry"
```

### Step 6: Continue to Phase 3
Repeat process for Phase 3 (call waiter balance) and Phase 4 (payment balance).

---

**Good night! 😴 Tomorrow you'll replace 121 lines of duplicate code with clean React Query hooks!**
