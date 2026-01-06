# SPOKE INTEGRATION BUNDLE - Implementation Plan

**Last Updated**: 2026-01-03
**Author**: Software Factory Planning
**Purpose**: Create a reusable code bundle for rapid integration of new merchant websites (spokes) into the Innopay ecosystem

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Bundle Components](#bundle-components)
3. [Framework Compatibility Analysis](#framework-compatibility-analysis)
4. [Implementation Strategies](#implementation-strategies)
5. [Recommended Plan for Croque-Bedaine](#recommended-plan-for-croque-bedaine)
6. [Documentation Deliverables](#documentation-deliverables)
7. [Next Steps](#next-steps)

---

## 🎯 OVERVIEW

### Goal
Create a **reusable code bundle** that can be quickly copied from `indiesmenu` and integrated into any new spoke (like `croque-bedaine`) to enable full innopay payment flows with minimal adaptation work.

### Success Criteria
- New spoke integration completed in 1-2 days (not weeks)
- Zero bugs in payment flows (copy tested code)
- Minimal framework-specific code (max reusability)
- Clear documentation for non-technical handoff

### Key Insight
The innopay integration has two distinct layers:
1. **Customer-facing UI** (payment flows, wallet, cart) - Framework dependent
2. **Backend API + Admin** (blockchain polling, order management) - Framework dependent but logic reusable

---

## 📦 BUNDLE COMPONENTS

### 1. Frontend Integration Package

#### **1.1 Shared UI Components** (Copy-paste ready, zero dependencies)

| Component | File | Lines | Dependencies | Status |
|-----------|------|-------|--------------|--------|
| **Draggable** | `components/ui/Draggable.tsx` | 139 | React only | ✅ Ready |
| **MiniWallet** | `components/ui/MiniWallet.tsx` | 130 | Draggable | ✅ Ready |
| **BottomBanner** | `components/ui/BottomBanner.tsx` | 95 | React only | ✅ Ready |

**Features**:
- Draggable: Touch/mouse drag support, viewport constraints, position persistence
- MiniWallet: Balance display, account name, collapsible, reopen button
- BottomBanner: Contact info, legal links, expandable footer

**Reusability**: 100% - These components are framework-agnostic React components with no Next.js or Vite-specific code.

**Integration Effort**: Low - Direct copy with optional styling adjustments

---

#### **1.2 Cart Context** (Requires adaptation)

| Component | File | Lines | Complexity |
|-----------|------|-------|------------|
| **CartContext** | `app/context/CartContext.tsx` | ~500 | Medium |

**Features**:
- Shopping cart state management
- localStorage persistence
- Table number tracking
- Total price calculation (HBD + EUR)
- Memo generation for blockchain transfers
- Discount logic

**Reusability**: 60% - Core logic reusable, product structure varies per spoke

**Adaptation Required**:
- Product data structure (dishes vs generic products)
- Price calculation logic (spoke-specific)
- Memo format (optional customization)

**Integration Effort**: Medium - Requires understanding spoke's product catalog structure

---

#### **1.3 Payment Flow Logic** (Complex, needs extraction)

| Flow | Lines in menu/page.tsx | Complexity | Priority |
|------|------------------------|------------|----------|
| **Flow 3: Guest Checkout** | ~80 | Low | High |
| **Flow 4: Create Account Only** | ~100 | Medium | High |
| **Flow 5: Create Account + Pay** | ~120 | Medium | High |
| **Flow 6: Pay with Account** | ~200 | High | Critical |
| **Flow 7: Pay with Topup** | ~150 | High | Critical |
| **Import Account** | ~120 | Medium | Medium |

**Current State**: All flow logic embedded in `app/menu/page.tsx` (2500+ lines)

**Proposed Extraction**: Create reusable hooks
```typescript
// Reusable hooks for payment flows
usePaymentFlows.ts      // Flow detection & routing
useGuestCheckout.ts     // Flow 3
useAccountCreation.ts   // Flows 4 & 5
useWalletPayment.ts     // Flows 6 & 7
useAccountImport.ts     // Import functionality
```

**Reusability**: 90% after extraction - Framework-agnostic hooks

**Integration Effort**: High (first extraction), Low (subsequent integrations)

---

#### **1.4 React Query Balance Hook**

| Component | File | Lines | Complexity |
|-----------|------|-------|------------|
| **useBalance** | `hooks/useBalance.ts` | ~100 | Low |

**Features**:
- Automatic balance fetching from Hive-Engine
- Smart caching (7-day stale time, 30-day cache time)
- Background refetching
- Error handling
- Source tracking (cache vs fresh)

**Reusability**: 100% - Works in any React environment

**Integration Effort**: Low - Direct copy

---

### 2. Backend Integration Package

#### **2.1 API Routes** (Spoke-specific, platform dependent)

| Route | Purpose | Framework | Lines |
|-------|---------|-----------|-------|
| `/api/transfers/unfulfilled` | Get pending orders from DB | Next.js | ~50 |
| `/api/transfers/sync-from-merchant-hub` | Pull from Redis streams | Next.js | ~100 |
| `/api/fulfill` | Mark order complete | Next.js | ~40 |
| `/api/balance/euro` | Proxy to Hive-Engine | Next.js | ~60 |

**Current State**: Next.js API routes (works in indiesmenu)

**Challenges**:
- Vite doesn't have API routes (needs Supabase Edge Functions or separate backend)
- Next.js API routes not portable to Vite

**Reusability**: 70% - Logic reusable, platform code differs

**Integration Effort**:
- Next.js spoke: Low (direct copy)
- Vite spoke: High (rewrite as Edge Functions)

---

#### **2.2 Admin Current Orders Page**

| Component | File | Lines | Complexity |
|-----------|------|-------|------------|
| **Current Orders** | `app/admin/current_orders/page.tsx` | 570 | High |

**Features**:
- Real-time order display
- Merchant-hub polling integration
- Redis stream consumption
- Order fulfillment workflow
- Kitchen transmission tracking
- Hydrated memo display

**Key Integration Points**:
- Wake-up call to merchant-hub (`/api/wake-up`)
- HAF polling trigger (`/api/poll`) - if elected poller
- Sync from Redis stream (`/api/transfers/sync-from-merchant-hub`)
- Fulfill order (`/api/fulfill`)

**Reusability**: 80% - UI layer needs routing adjustment, logic portable

**Integration Effort**: Medium

---

#### **2.3 Database Schema** (Prisma/Supabase)

**Required Table**: `transfers`

```sql
CREATE TABLE transfers (
  id VARCHAR PRIMARY KEY,              -- HAF operation ID
  from_account VARCHAR NOT NULL,       -- Customer Hive account
  amount VARCHAR NOT NULL,             -- Transfer amount
  symbol VARCHAR NOT NULL,             -- 'HBD' | 'EURO' | 'OCLT'
  memo TEXT NOT NULL,                  -- Order details
  parsed_memo JSONB,                   -- Hydrated order lines
  received_at TIMESTAMP NOT NULL,      -- Blockchain timestamp
  fulfilled_at TIMESTAMP,              -- NULL = pending
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_transfers_unfulfilled ON transfers(fulfilled_at) WHERE fulfilled_at IS NULL;
CREATE INDEX idx_transfers_received_at ON transfers(received_at DESC);
```

**Reusability**: 100% - Same schema works for Prisma (Next.js) or Supabase (Vite)

**Integration Effort**: Low - Standard migration

---

### 3. Configuration & Environment

#### **3.1 Environment Variables Required**

```bash
# Innopay Hub
NEXT_PUBLIC_HUB_URL=https://wallet.innopay.lu

# Merchant Hub (blockchain polling)
NEXT_PUBLIC_MERCHANT_HUB_URL=https://merchant-hub-theta.vercel.app

# Restaurant Identity
NEXT_PUBLIC_HIVE_ACCOUNT=your-restaurant.cafe
NEXT_PUBLIC_RESTAURANT_ID=your-restaurant

# Database (Prisma or Supabase)
POSTGRES_URL=your-database-url          # Prisma
DATABASE_URL=your-database-url          # Prisma
VITE_SUPABASE_URL=your-supabase-url     # Supabase
VITE_SUPABASE_ANON_KEY=your-anon-key    # Supabase
```

#### **3.2 Utility Functions**

| Function | File | Purpose |
|----------|------|---------|
| `getInnopayUrl()` | `lib/utils.ts` | Environment-aware hub URL |
| `getMerchantHubUrl()` | `lib/utils.ts` | Merchant-hub URL resolution |
| `getLatestEurUsdRate()` | `lib/utils.ts` | Currency conversion |
| `createEuroTransferOperation()` | `lib/utils.ts` | Hive-Engine transfer builder |
| `signAndBroadcastOperation()` | `lib/utils.ts` | Blockchain transaction signing |
| `hydrateMemo()` | `lib/utils.ts` | Parse memo into order lines |
| `getTable()` | `lib/utils.ts` | Extract table number from memo |

**Reusability**: 100% - Pure TypeScript functions

**Integration Effort**: Low - Direct copy to `lib/` folder

---

## 🔧 FRAMEWORK COMPATIBILITY ANALYSIS

### Challenge: Framework Differences

| Aspect | Indiesmenu (Next.js 15) | Croque-Bedaine (Vite 5) |
|--------|-------------------------|-------------------------|
| **Framework** | Next.js | Vite + React |
| **Routing** | File-based (`app/` directory) | React Router |
| **API Routes** | Built-in (`app/api/*`) | ❌ None (needs Supabase Edge Functions) |
| **SSR/CSR** | Server + Client components | Client-only (SPA) |
| **Database** | Prisma + PostgreSQL | Supabase (PostgreSQL) |
| **State Management** | React Query + Context | React Query + Context ✅ |
| **Styling** | Tailwind CSS | Tailwind CSS ✅ |
| **Build Tool** | Next.js compiler | Vite |
| **Deployment** | Vercel | Vercel/Netlify/Static |

### Compatibility Matrix

| Component Type | Next.js Compatibility | Vite Compatibility | Notes |
|----------------|----------------------|-------------------|-------|
| **UI Components** | ✅ 100% | ✅ 100% | Pure React |
| **React Hooks** | ✅ 100% | ✅ 100% | Framework-agnostic |
| **Context Providers** | ✅ 100% | ✅ 100% | Standard React |
| **API Routes** | ✅ Native | ❌ 0% | Needs rewrite as Edge Functions |
| **Database Queries** | ✅ Prisma | ⚠️ 70% | Logic portable, ORM differs |
| **Admin Pages** | ✅ 90% | ⚠️ 60% | Routing adapter needed |

---

## 🚀 IMPLEMENTATION STRATEGIES

### Option A: Keep Vite, Adapt Backend ⭐ **RECOMMENDED FOR CROQUE-BEDAINE**

**Approach**: Preserve existing Vite UI, migrate backend to Supabase

**Pros**:
- ✅ Keep existing Vite UI and shadcn/ui components
- ✅ No UI rebuild required
- ✅ Leverage Supabase's built-in features (auth, realtime, storage)
- ✅ Faster build times (Vite)

**Cons**:
- ⚠️ Requires rewriting 5-6 API routes as Supabase Edge Functions
- ⚠️ Database schema migration from Prisma to Supabase
- ⚠️ Learning curve for Supabase Edge Functions (Deno runtime)

**Effort Estimate**: Medium (2-3 days for backend migration)

**Best For**: Existing Vite projects (croque-bedaine)

---

### Option B: Migrate to Next.js

**Approach**: Rebuild croque-bedaine UI in Next.js to match indiesmenu architecture

**Pros**:
- ✅ 90% copy-paste compatibility with indiesmenu
- ✅ Minimal adaptation needed (mostly styling)
- ✅ Proven architecture
- ✅ Easy future spoke creation

**Cons**:
- ⚠️ Rebuild entire UI from scratch
- ⚠️ Lose existing shadcn/ui components
- ⚠️ Slower build times compared to Vite
- ⚠️ High upfront effort (5-7 days)

**Effort Estimate**: High (5-7 days for full migration)

**Best For**: Future spokes starting from scratch

---

### Option C: Hybrid Microservices Architecture 🌟 **BEST LONG-TERM**

**Approach**: Extract payment logic into standalone services that both frameworks can use

**Architecture**:
```
┌─────────────────────────────────────────────────────┐
│          Standalone Payment Service                 │
│          (Express/Fastify + Prisma)                 │
│                                                     │
│  • POST /checkout/guest                             │
│  • POST /checkout/account                           │
│  • POST /payment/wallet                             │
│  • GET  /balance/:account                           │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼────────┐  ┌────────▼───────┐
│  Next.js Spoke │  │  Vite Spoke    │
│  (indiesmenu)  │  │ (croque-bedaine)│
└────────────────┘  └─────────────────┘
```

**Components**:
1. **NPM Package**: `@innopay/spoke-ui-components`
   - Draggable, MiniWallet, BottomBanner
   - Payment flow hooks
   - React Query hooks

2. **Backend Service**: `innopay-payment-service`
   - REST API for all payment operations
   - Database-agnostic (works with any spoke's DB)
   - Deployed separately (e.g., Railway, Render)

3. **Admin NPM Package**: `@innopay/admin-dashboard`
   - Current orders page as standalone component
   - Works with both Next.js and React Router

**Pros**:
- ✅ Maximum reusability across frameworks
- ✅ Both Next.js and Vite spokes can use identical code
- ✅ Centralized payment logic = easier updates
- ✅ Can version and publish to npm
- ✅ Future-proof for other frameworks (Vue, Svelte, etc.)

**Cons**:
- ⚠️ High upfront development effort (7-10 days)
- ⚠️ Infrastructure complexity (separate deployment)
- ⚠️ Overkill if only 2-3 spokes planned

**Effort Estimate**: Very High (7-10 days initial setup)

**Best For**: Scaling to 10+ spokes, or planning to support multiple frameworks

---

## 📋 RECOMMENDED PLAN FOR CROQUE-BEDAINE

Given that croque-bedaine already has a working UI with Vite + Supabase, I recommend **Option A: Keep Vite, Adapt Backend**.

### Phase 1: Copy UI Components ⏱️ **~2 hours**

**Tasks**:
1. Create `src/components/innopay/` folder in croque-bedaine
2. Copy files:
   - `Draggable.tsx`
   - `MiniWallet.tsx`
   - `BottomBanner.tsx`
3. Adjust styling to match shadcn/ui theme (optional)
4. Test components in isolation (Storybook if available)

**Success Criteria**:
- Components render without errors
- Dragging works on desktop and mobile
- Styling matches croque-bedaine's design language

---

### Phase 2: Implement Payment Flows ⏱️ **~1 day**

**Tasks**:
1. **Extract payment logic from indiesmenu into reusable hooks**:
   ```typescript
   // src/hooks/innopay/
   usePaymentFlows.ts      // Flow detection & routing (100 lines)
   useGuestCheckout.ts     // Flow 3 (80 lines)
   useAccountCreation.ts   // Flows 4 & 5 (150 lines)
   useWalletPayment.ts     // Flows 6 & 7 (250 lines)
   useAccountImport.ts     // Import functionality (120 lines)
   ```

2. **Integrate hooks into croque-bedaine cart/checkout page**:
   - Detect when user clicks "Order Now"
   - Show wallet notification banner (Draggable component)
   - Route to appropriate flow based on account state

3. **Add localStorage management**:
   - Store innopay credentials (`accountName`, `masterPassword`, keys)
   - Persist MiniWallet state

4. **Test all flows**:
   - Flow 3: Guest checkout without account
   - Flow 4: Create account only (no order)
   - Flow 5: Create account + pay for order
   - Flow 6: Pay with existing account (sufficient balance)
   - Flow 7: Top-up + pay (insufficient balance)

**Success Criteria**:
- User can complete guest checkout
- User can create innopay account from croque-bedaine
- User can pay with existing account
- MiniWallet appears after account creation

---

### Phase 3: Backend Integration with Supabase ⏱️ **~1-2 days**

**Tasks**:

#### 3.1 Database Schema
1. Create `transfers` table in Supabase:
   ```sql
   CREATE TABLE transfers (
     id VARCHAR PRIMARY KEY,
     from_account VARCHAR NOT NULL,
     amount VARCHAR NOT NULL,
     symbol VARCHAR NOT NULL,
     memo TEXT NOT NULL,
     parsed_memo JSONB,
     received_at TIMESTAMP NOT NULL,
     fulfilled_at TIMESTAMP,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```

2. Create indexes for performance
3. Set up Row Level Security (RLS) policies

#### 3.2 Supabase Edge Functions
Create the following Edge Functions (Deno/TypeScript):

**File**: `supabase/functions/transfers-unfulfilled/index.ts`
```typescript
// GET unfulfilled transfers
// Logic: SELECT * FROM transfers WHERE fulfilled_at IS NULL
// Returns: { transfers: Transfer[] }
```

**File**: `supabase/functions/transfers-sync/index.ts`
```typescript
// POST sync from merchant-hub
// Logic:
//   1. Fetch from merchant-hub Redis stream
//   2. Insert new transfers to Supabase
//   3. ACK consumed messages
// Returns: { inserted: number, acked: number }
```

**File**: `supabase/functions/fulfill/index.ts`
```typescript
// POST mark transfer as fulfilled
// Logic: UPDATE transfers SET fulfilled_at = NOW() WHERE id = $1
// Returns: { success: boolean }
```

#### 3.3 Utility Functions
1. Copy `lib/utils.ts` from indiesmenu to croque-bedaine
2. Update imports to match Vite project structure
3. Configure environment URLs

**Success Criteria**:
- Transfers table exists in Supabase
- Edge Functions deployed and accessible
- Backend API returns data correctly

---

### Phase 4: Admin Current Orders Page ⏱️ **~1 day**

**Tasks**:

1. **Create admin route** in React Router:
   ```typescript
   // src/pages/admin/CurrentOrders.tsx
   ```

2. **Port indiesmenu logic**:
   - Copy `app/admin/current_orders/page.tsx` logic
   - Replace Next.js API calls with Supabase client calls:
     ```typescript
     // Old (Next.js)
     fetch('/api/transfers/unfulfilled')

     // New (Supabase)
     supabase.functions.invoke('transfers-unfulfilled')
     ```

3. **Implement merchant-hub integration**:
   - Wake-up call on page mount
   - Polling election (6-second polling if elected)
   - Sync from Redis stream every 6 seconds

4. **Add order fulfillment UI**:
   - Display pending orders
   - "Transmettre en cuisine" button
   - "C'est parti!" fulfill button
   - Toast notifications

**Success Criteria**:
- Admin page displays unfulfilled orders
- Polling integration with merchant-hub works
- Orders can be marked as fulfilled
- Kitchen transmission workflow functions

---

### Phase 5: Testing & Refinement ⏱️ **~0.5 day**

**Tasks**:
1. End-to-end testing of all payment flows
2. Mobile responsiveness testing
3. Error handling verification
4. Performance optimization (lazy loading, code splitting)

**Success Criteria**:
- All flows work in production environment
- No console errors
- Mobile UX is smooth
- Page load time < 3 seconds

---

## 📚 DOCUMENTATION DELIVERABLES

### 1. SPOKE-INTEGRATION-GUIDE.md
**Purpose**: Step-by-step manual for integrating a new spoke

**Contents**:
- Prerequisites checklist
- File-by-file copy instructions
- Configuration guide
- Environment variable setup
- Testing procedures

**Target Audience**: Developers building new spokes

---

### 2. spoke-bundle/ Directory
**Purpose**: Ready-to-copy files for quick integration

**Structure**:
```
spoke-bundle/
├── components/
│   ├── Draggable.tsx
│   ├── MiniWallet.tsx
│   └── BottomBanner.tsx
├── hooks/
│   ├── usePaymentFlows.ts
│   ├── useGuestCheckout.ts
│   ├── useAccountCreation.ts
│   ├── useWalletPayment.ts
│   ├── useAccountImport.ts
│   └── useBalance.ts
├── lib/
│   └── utils.ts (innopay utilities)
├── database/
│   ├── prisma-schema.prisma (for Next.js)
│   └── supabase-migration.sql (for Vite)
├── api/ (reference implementations)
│   ├── nextjs/ (Next.js API routes)
│   └── supabase/ (Edge Functions)
└── admin/
    └── CurrentOrdersPage.tsx (template)
```

---

### 3. ADAPTATION-CHECKLIST.md
**Purpose**: What to customize per spoke

**Contents**:
- [ ] Environment variables
- [ ] Restaurant identity (Hive account, restaurant ID)
- [ ] Cart logic (product structure)
- [ ] Memo format (optional)
- [ ] Styling/branding
- [ ] Admin authentication
- [ ] Database connection

---

### 4. API-SPECIFICATION.md
**Purpose**: Backend API contract that all spokes must implement

**Contents**:
- Endpoint specifications (REST API)
- Request/response schemas
- Error handling conventions
- Authentication requirements
- Merchant-hub integration protocol

---

## ✅ NEXT STEPS

### Immediate Actions (This Week)

1. **Create spoke-bundle/ directory** in indiesmenu project
2. **Extract payment flow hooks** from `menu/page.tsx`
3. **Write SPOKE-INTEGRATION-GUIDE.md** with detailed instructions
4. **Begin croque-bedaine integration** using Option A

### Short-term Goals (This Month)

1. Complete croque-bedaine integration (validate bundle completeness)
2. Document any gaps or missing utilities
3. Refine bundle based on real integration experience
4. Create video walkthrough for future developers

### Long-term Vision (Next Quarter)

1. Integrate 2-3 more spokes to validate approach
2. Consider Option C (microservices) if scaling to 10+ spokes
3. Build internal "spoke generator" CLI tool
4. Publish `@innopay/spoke-components` to npm (if going public)

---

## 🎯 SUCCESS METRICS

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Integration Time** | < 2 days per spoke | Track time from start to production |
| **Code Reuse** | > 80% | Lines copied vs. lines written |
| **Bug Rate** | < 5 bugs per integration | Track issues in first month |
| **Developer Satisfaction** | > 4/5 | Survey developers post-integration |

---

## 📞 SUPPORT & QUESTIONS

For questions about this plan, refer to:
- `PROJECT-OVERVIEW.md` - Overall ecosystem architecture
- `FLOWS.md` - Payment flow specifications
- Source code comments in indiesmenu (extensive inline documentation)

---

**Document Status**: ✅ Ready for implementation
**Next Review**: After first croque-bedaine integration completion
