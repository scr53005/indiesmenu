# Admin Dashboard Implementation Summary

**Date:** 2025-12-29
**Status:** ✅ Complete

---

## Files Created

### 1. `/app/admin/page.tsx` - Main Dashboard
**NEW Admin Landing Page**

Features:
- ✅ Three navigation cards (Plat du Jour, Carte & Images, Allergènes)
- ✅ Cache clear button with visual feedback
- ✅ Quick links section (Menu client, Affichage, Version imprimable)
- ✅ Info box explaining cache management
- ✅ Responsive grid layout
- ✅ Hover animations and transitions

---

## Files Modified

### 2. `/app/admin/login/page.tsx`
**Changed:**
```diff
- const returnUrl = searchParams.get('returnUrl') || '/admin/daily-specials';
+ const returnUrl = searchParams.get('returnUrl') || '/admin';
```

**Impact:**
- Login now defaults to dashboard instead of daily-specials
- Preserves deep-link behavior (direct bookmark to `/admin/carte` still works)

---

### 3. `/app/admin/daily-specials/page.tsx`
**Added:**
- Import: `Link from 'next/link'`
- Back button (← arrow) in header linking to `/admin`

**UI Change:**
```
Before: [Administration - Plat du Jour]
After:  [← Administration - Plat du Jour]
           ↑ Links back to dashboard
```

---

### 4. `/app/admin/carte/page.tsx`
**Added:**
- Import: `Link from 'next/link'`
- Back button (← arrow) in header linking to `/admin`

**UI Change:**
```
Before: [Admin - Carte & Images]
After:  [← Admin - Carte & Images]
           ↑ Links back to dashboard
```

---

### 5. `/app/admin/alergenes/page.tsx`
**Added:**
- Import: `Link from 'next/link'`
- Back button (← arrow) in header linking to `/admin`

**UI Change:**
```
Before: [Gestion des Allergènes]
After:  [← Gestion des Allergènes]
           ↑ Links back to dashboard
```

---

## User Flow Improvements

### Before
```
Login → /admin/daily-specials (always)
        ↓
        No way to access other pages
        (Must type URL manually)
```

### After
```
Login → /admin (dashboard)
        ↓
        ├─→ Plat du Jour (click card)
        │   └─→ ← Back to dashboard
        │
        ├─→ Carte & Images (click card)
        │   └─→ ← Back to dashboard
        │
        └─→ Allergènes (click card)
            └─→ ← Back to dashboard
```

### Deep Links Preserved
```
Direct URL: /admin/carte
  ↓
Login (if not authenticated)
  ↓
Redirect to: /admin/carte ✅
```

---

## Cache Management

### Location
Dashboard page (`/admin/page.tsx`)

### Functionality
- Button: "🗑️ Nettoyer le cache"
- Confirmation dialog before clearing
- Visual feedback (spinning icon during clear)
- Success/error messages
- Positioned prominently in header

### User Experience
1. Click "Nettoyer le cache"
2. Confirm dialog appears
3. Button shows "⟳ Nettoyage..." with spinning icon
4. Success: "✓ Cache nettoyé avec succès !" (green)
5. Error: "❌ Erreur: ..." (red)
6. Message auto-dismisses after 3 seconds

---

## Design Highlights

### Dashboard Cards
- Large, clickable cards with icons
- Hover effects (shadow + border + scale)
- Clear descriptions
- "Gérer →" call-to-action
- Responsive grid (1 col mobile, 2 cols tablet, 3 cols desktop)

### Navigation
- Consistent back arrows (←) on all sub-pages
- Hover states with color transitions
- Tooltips on hover

### Quick Links
- Blue info box with rounded corners
- External links open in new tabs
- Menu client, Display page, Printout version

---

## Testing Checklist

- [ ] Navigate to `/admin` (should show dashboard)
- [ ] Click "Plat du Jour" card (should navigate to daily-specials)
- [ ] Click ← arrow (should return to dashboard)
- [ ] Click "Carte & Images" card (should navigate to carte)
- [ ] Click ← arrow (should return to dashboard)
- [ ] Click "Allergènes" card (should navigate to alergenes)
- [ ] Click ← arrow (should return to dashboard)
- [ ] Click "Nettoyer le cache" button
  - [ ] Confirmation dialog appears
  - [ ] Clicking OK clears cache
  - [ ] Success message appears
  - [ ] Message auto-dismisses after 3 seconds
- [ ] Login flow: navigate to `/admin/carte` while logged out
  - [ ] Should redirect to login
  - [ ] After login, should redirect to `/admin/carte` (not dashboard)
- [ ] Quick links open in new tabs

---

## Benefits Achieved

✅ **Discoverability** - All admin functions visible on dashboard
✅ **Navigation** - Easy movement between sections
✅ **Cache Management** - Prominent UI for cache clearing
✅ **User Experience** - Clear visual hierarchy and feedback
✅ **Consistency** - Same header pattern across all pages
✅ **Efficiency** - 1-click access to any section

---

## Future Enhancements (Optional)

1. **Shared Header Component** - Extract common header into reusable component
2. **Dashboard Stats** - Show counts (active dishes, pending changes, etc.)
3. **Recent Activity** - Log of recent admin actions
4. **Logout Button** - Add logout functionality to header
5. **Keyboard Shortcuts** - Alt+1/2/3 to navigate to sections

---

## Merchant-Hub Integration Troubleshooting

**Date:** 2026-01-24
**Issue:** Mixed PROD/DEV transfers appearing in co page after merchant-hub Option 3 deployment

### Problem Description

After deploying the Redis optimization (Option 3) to merchant-hub, the co page started showing:
1. **Mixed environment transfers** - Both `indies.cafe` (PROD) and `indies-test` (DEV) orders displayed together
2. **Hydration issues** - Some transfers showing raw codes like "d:7" instead of dish names

### Root Cause

**Merchant-hub** now polls **both** production and development accounts:
- `indies.cafe` (PROD)
- `indies-test` (DEV)

Both are published to the same Redis stream `transfers:indies`, and the sync endpoint was inserting all transfers without filtering by environment.

### Solution

Modified `/app/api/transfers/sync-from-merchant-hub/route.ts` to filter transfers by environment:

```typescript
// Determine which account to filter by (prod vs dev environment)
function getEnvironmentAccount(): string {
  // Check DATABASE_URL to determine if we're in dev or prod
  const databaseUrl = process.env.DATABASE_URL || '';
  const isDev = databaseUrl.includes('innopaydb'); // Dev database

  return isDev ? 'indies-test' : 'indies.cafe';
}
```

The sync endpoint now:
1. Determines environment based on `DATABASE_URL`
2. Filters incoming transfers by `to_account` field
3. Only inserts transfers matching the environment's account
4. Still ACKs filtered transfers to prevent them from staying pending

### Database Cleanup

If you have mixed transfers in your database, clean them up with this SQL:

```sql
-- For PRODUCTION environment (remove dev transfers)
-- First check what will be deleted:
SELECT id, to_account, from_account, memo, received_at
FROM transfers
WHERE to_account = 'indies-test'  -- Dev account transfers
ORDER BY received_at DESC;

-- If correct, delete them:
DELETE FROM transfers WHERE to_account = 'indies-test';

-- For DEV environment (remove prod transfers)
-- First check:
SELECT id, to_account, from_account, memo, received_at
FROM transfers
WHERE to_account = 'indies.cafe'  -- Prod account transfers
ORDER BY received_at DESC;

-- If correct, delete them:
DELETE FROM transfers WHERE to_account = 'indies.cafe';
```

### Hydration Issues

If transfers show codes like "d:7" instead of dish names:
1. Check if `menuData` has loaded in the co page
2. Verify the `memo` field contains the full order (not just shorthand)
3. Check browser console for hydration errors
4. Ensure the menu cache is fresh (clear cache from dashboard)

### Testing

After deploying the fix:
1. ✅ Only environment-specific transfers should appear
2. ✅ Production co page shows only `indies.cafe` transfers
3. ✅ Dev co page shows only `indies-test` transfers
4. ✅ All transfers hydrate correctly with dish names

---

## Accountant Reporting Page (Comptabilite)

**Date:** 2026-02-16
**Status:** Code complete, needs testing against live HAFSQL

### Purpose

Admin page for the restaurant accountant to export a log of all HBD transactions received, with EUR conversion, for a configurable date range. Exports as CSV and PDF.

### Architecture

```
Reporting Page (indiesmenu /admin/reporting)
    |
    +---> merchant-hub GET /api/reporting   (queries HAFSQL for HBD transfers)
    +---> indiesmenu POST /api/admin/rates  (EUR/USD rates from currency_conversion DB)
    |
    v
Client merges transactions + rates, computes EUR amounts, renders table & exports
```

### Files Created

#### 1. `merchant-hub/app/api/reporting/route.ts` — HAFSQL reporting endpoint

- `GET /api/reporting?account=indies.cafe&from=2025-01-01&to=2025-12-31`
- Validates `account` against known restaurant accounts from `lib/config.ts`
- Joins `hafsql.operation_transfer_table` (id, from_account, to_account, amount, symbol, memo) with `hafsql.haf_operations` (id, timestamp, block_num) to get timestamps
- Tries 3 join strategies in order (single join preferred, double join fallback), caches the working one
- If all strategies fail, runs schema discovery and logs available tables/columns for debugging
- Extensive `[REPORTING]` console.log at every step for debugging
- CORS via existing `lib/cors.ts`, LIMIT 5000 rows, 8s query timeout
- Response includes `_strategy` and `_elapsed_ms` for diagnostics

#### 2. `indiesmenu/app/api/admin/rates/route.ts` — EUR/USD rates for specific dates

- `POST /api/admin/rates` with body `{ dates: ["2025-01-15", "2025-02-03", ...] }`
- Only fetches rates for the dates that have transactions (not the whole range)
- Calls `fetchRatesForDates()` from `lib/currency-service.ts`
- Returns `{ rates: { "2025-01-15": 1.0834, ... } }`

#### 3. `indiesmenu/app/admin/reporting/page.tsx` — Reporting admin page

- Date range picker ("Du" / "Au"), defaults to current month
- "Charger" button fetches data, "Exporter CSV" and "Exporter PDF" buttons appear when data loaded
- Summary bar: transaction count, total HBD, total EUR
- Data table: Date | Heure | ID Transaction | Expediteur | Montant HBD | Taux EUR/USD | Montant EUR
- TOTAL footer row
- CSV: semicolon-separated with UTF-8 BOM (European Excel compatible)
- PDF: landscape, via `jspdf` + `jspdf-autotable` (dynamically imported)
- French UI, Tailwind, Lato font, same styling as other admin pages
- HBD to EUR conversion: `amount_eur = amount_hbd / eur_usd_rate`

### Files Modified

#### 4. `indiesmenu/lib/currency-service.ts`

Added `fetchRatesForDates(dates: string[]): Promise<Map<string, number>>`:
- Batch-queries `currency_conversion` table for requested dates
- For missing dates (weekends, holidays), finds nearest preceding rate in DB
- Falls back to default 1.0 if no rates exist at all

#### 5. `indiesmenu/app/admin/page.tsx`

Added 6th dashboard card "Comptabilite" (emerald green, distinct from existing colors) linking to `/admin/reporting`.

#### 6. `indiesmenu/package.json`

Added dependencies: `jspdf`, `jspdf-autotable`

### Updated Navigation

```
Login -> /admin (dashboard)
         |
         +-> Plat du Jour        /admin/daily-specials
         +-> Commandes            /admin/current_orders
         +-> Historique           /admin/history
         +-> Carte & Images       /admin/carte
         +-> Allergenes           /admin/alergenes
         +-> Comptabilite (NEW)   /admin/reporting
```

### Testing Checklist (TODO)

- [ ] **Merchant-hub HAFSQL join**: Deploy merchant-hub and call `/api/reporting?account=indies.cafe&from=2025-11-01&to=2025-12-31`. Check Vercel logs for `[REPORTING]` messages to see which join strategy works. If all fail, logs will show available tables/columns.
- [ ] **Rates API**: Call `POST /api/admin/rates` with a few known dates, verify rates come back from `currency_conversion` table.
- [ ] **Reporting page**: Navigate to `/admin/reporting`, select a date range, click Charger. Verify table populates.
- [ ] **EUR conversion**: Check that HBD amounts are correctly divided by EUR/USD rate.
- [ ] **CSV export**: Download, open in Excel. Verify semicolons, columns, BOM, totals row.
- [ ] **PDF export**: Download, verify landscape layout, pagination, header, totals.
- [ ] **Dashboard card**: Verify the "Comptabilite" card appears on `/admin` and links correctly.
- [ ] **Empty range**: Select a future date range, verify "Aucune transaction" message.
- [ ] **Truncation**: If >5000 rows, verify yellow warning banner appears.

### Future

- Replicate reporting frontend to croque-bedaine (same merchant-hub API, Vite + shadcn/ui variant)
- Replicate to future spokes

---

**Implementation Complete!**
