# Indiesmenu - last updated 2026-02-16

Full-featured restaurant menu, ordering, and kitchen management system for Indies restaurant. Part of the **Innopay hub-and-spokes ecosystem** (Spoke 1).

**Production URL**: `indies.innopay.lu`
**Tech Stack**: Next.js 15+ + TypeScript + Prisma 6 + PostgreSQL + Tailwind CSS 4

## Overview

Indiesmenu serves two audiences:

1. **Customers** (`/menu`) — Browse the menu, build a cart, and pay via the Innopay hub (Hive blockchain + Stripe). Accessed by scanning a QR code at the table.
2. **Restaurant staff** (`/admin`) — Manage the menu, view incoming orders in real time, track history, manage allergens, and export accounting reports.

### Architecture

```
┌──────────────────────────────────────────────────┐
│  Indiesmenu (Next.js on Vercel)                  │
│                                                   │
│  Customer-facing:                                 │
│    /menu — Menu, cart, checkout, payments          │
│                                                   │
│  Admin (kitchen backend):                         │
│    /admin — Dashboard hub                         │
│    /admin/current_orders — Live order queue (CO)  │
│    /admin/history — Fulfilled order archive       │
│    /admin/daily-specials — Plat du Jour           │
│    /admin/carte — Menu & image management         │
│    /admin/alergenes — Allergen management         │
│    /admin/reporting — Accountant HBD/EUR exports  │
└──────────────┬───────────────┬────────────────────┘
               │               │
               ▼               ▼
     ┌──────────────┐  ┌───────────────┐
     │  Innopay Hub │  │ Merchant Hub  │
     │  (payments)  │  │ (HAF polling) │
     │  wallet.     │  │ Redis Streams │
     │  innopay.lu  │  │ + HAFSQL      │
     └──────────────┘  └───────────────┘
```

## Customer Features (`/menu`)

- **Digital menu** with categories: soups, salads, main dishes, desserts, drinks
- **Daily specials** section with rotating dishes
- **Shopping cart** with localStorage persistence (CartContext)
- **Allergen display** per dish
- **Table-based ordering** via QR codes (`/menu?table=X`)
- **Call Waiter** button (symbolic 0.020 EURO transfer)
- **MiniWallet** showing EURO balance, account name, quick topup link
- **Multi-language** (French UI)

### Payment Flows (via Innopay Hub)

| Flow | Description | Trigger |
|------|-------------|---------|
| **3** | Guest Checkout (Stripe, no account) | No account, chooses guest |
| **4** | Create Account Only | Clicks "Create Wallet" without ordering |
| **5** | Create Account + Pay | No account, chooses create + pay |
| **6** | Pay with Existing Account | Has account with sufficient balance |
| **7** | Topup + Pay (Stripe) | Has account but insufficient balance |
| **8** | Import Existing Account | Email verification to recover credentials |

Flows 6 and 7 use **two-leg dual-currency** transfers: Customer -> innopay (EURO collateral) -> Restaurant (HBD preferred, EURO fallback with debt tracking).

## Admin Dashboard (`/admin`)

Authentication-protected admin area with 6 dashboard cards:

```
Login -> /admin (dashboard)
         |
         +-> Plat du Jour        /admin/daily-specials
         +-> Commandes            /admin/current_orders
         +-> Historique           /admin/history
         +-> Carte & Images       /admin/carte
         +-> Allergenes           /admin/alergenes
         +-> Comptabilite         /admin/reporting
```

### Current Orders (`/admin/current_orders`)

The operational heart of the system — the **CO page** (Current Orders):

- **Real-time order display** via merchant-hub polling (6-second intervals)
- **Distributed poller election**: Coordinates with merchant-hub using Redis SETNX. First CO page to open becomes the poller; others subscribe to Redis Streams.
- **Kitchen workflow**: Two-step fulfillment (transmit to kitchen -> mark as served)
- **Order grouping**: Groups EURO + HBD transfers for same order (dual-currency)
- **Memo hydration**: Decodes dehydrated memos (`d:1,q:2;b:3;`) into dish names using menu data
- **Late order highlighting**: Visual alerts for orders older than 10 minutes
- **Audio reminders**: Bell sounds every 30 seconds for untransmitted orders
- **Environment filtering**: Only shows transfers matching the current environment (`indies.cafe` in prod, `indies-test` in dev)

### Order History (`/admin/history`)

- Date-grouped expandable sections
- Auto-refresh every 10 seconds
- Incremental loading in 3-day chunks
- Hydrated memos with color coding (dishes vs. drinks)

### Daily Specials (`/admin/daily-specials`)

- CRUD for rotating daily menu items
- Displayed on customer menu and TV/print display pages

### Menu & Images (`/admin/carte`)

- Full CRUD for dishes (name, price, category, description, ingredients)
- Image upload, matching, and optimization
- Menu cache management

### Allergens (`/admin/alergenes`)

- Manage allergen information per dish
- Ingredient-level allergen tracking

### Reporting / Comptabilite (`/admin/reporting`)

Accountant export page for HBD transaction history with EUR conversion:

- **Date range picker** (defaults to current month)
- **Data source**: merchant-hub `GET /api/reporting` (HAFSQL) + local `POST /api/admin/rates` (EUR/USD rates from `currency_conversion` DB)
- **Summary bar**: Transaction count, total HBD, total EUR
- **Data table**: Date, Time, Transaction ID, Sender, HBD Amount, EUR/USD Rate, EUR Amount
- **CSV export**: Semicolon-separated with UTF-8 BOM (European Excel compatible)
- **PDF export**: Landscape layout via jspdf + jspdf-autotable
- **Conversion**: `amount_eur = amount_hbd / eur_usd_rate`

## API Routes

### Menu & Dishes
- `GET /api/menu` — Full menu with 7-day cache
- `GET/POST /api/dishes` — Dish listing
- `GET/POST /api/daily-specials` — Daily specials CRUD

### Admin
- `POST /api/admin/auth` — Admin authentication
- `GET/POST /api/admin/dishes` — Dish CRUD
- `PUT/DELETE /api/admin/dishes/[id]` — Single dish operations
- `POST /api/admin/drinks` — Drink management
- `GET/POST /api/admin/alergenes` — Allergen management
- `GET/POST /api/admin/ingredients` — Ingredient management
- `POST /api/admin/match-images` — Auto-match images to dishes
- `POST /api/admin/update-images` — Update dish images
- `GET /api/admin/detect-new-images` — Detect unmatched image files
- `DELETE /api/admin/cache` — Clear menu cache
- `POST /api/admin/rates` — EUR/USD rates for specific dates (reporting)

### Transfers & Orders (Merchant-Hub Integration)
- `POST /api/transfers/sync-from-merchant-hub` — Consume from Redis Stream, insert to DB, ACK
- `GET /api/transfers/unfulfilled` — Fetch pending orders
- `GET /api/transfers/check` — Check transfer status
- `POST /api/fulfill` — Mark order as fulfilled
- `GET /api/orders/history` — Fulfilled orders with pagination

### Balance & Currency
- `GET /api/balance/euro` — Fetch EURO token balance from Hive-Engine
- `GET /api/currency` — EUR/USD exchange rate
- `GET /api/poll-hbd` — Poll for HBD transfers (legacy)
- `GET /api/poll-euro` — Poll for EURO transfers (legacy)
- `GET /api/baseline-euro` — EURO baseline (legacy)

## Other Pages

- `/display/printout` — A3 landscape printout of daily specials (for TV screens or printing)
- `/admin/login` — Admin authentication page

## Database Schema (Prisma 6)

**Core Models**:
- `Category` — Menu categories (soups, salads, mains, etc.)
- `Dish` — Menu items with pricing, allergens, images, ingredients
- `DailySpecial` — Rotating daily menu items
- `Transfer` — Blockchain transfers consumed from merchant-hub (id, from_account, to_account, amount, symbol, memo, parsed_memo, received_at, fulfilled_at)
- `currency_conversion` — Historical EUR/USD rates (used by reporting)

## Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15.5 (Turbopack in dev) |
| Language | TypeScript 5 |
| Database | PostgreSQL + Prisma 6.11 |
| Styling | Tailwind CSS 4 |
| State | React Query 5.90 (TanStack Query) |
| Blockchain | @hiveio/dhive 1.3 |
| Image Processing | Sharp 0.34 |
| PDF Export | jspdf + jspdf-autotable |
| Notifications | react-toastify |
| HTTP Client | Axios |
| Testing | Jest 30 + ts-jest |
| Deployment | Vercel |

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Access to the Innopay hub (for payment flows)
- Access to merchant-hub (for order polling)

### Installation

```bash
npm install
```

### Environment Variables

```env
# PostgreSQL database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME"

# Innopay Hub URL
NEXT_PUBLIC_HUB_URL=http://localhost:3000  # or https://wallet.innopay.lu

# Merchant Hub URL
NEXT_PUBLIC_MERCHANT_HUB_URL=http://localhost:3002  # or production URL

# Hive account to monitor
NEXT_PUBLIC_HIVE_ACCOUNT=indies.cafe
```

### Database Migrations

```bash
# Development
npm run migrate:dev

# Production (also runs during vercel-build)
npm run migrate:deploy
```

### Run

```bash
npx next dev -p 3001
# -> http://localhost:3001 or -> http://192.168.x.y:3001 from a smartphone on the same LAN
```

### Build & Deploy

```bash
# Local build
npm run build

# Vercel build (runs migrations + prisma generate + next build)
npm run vercel-build
```

### Image Optimization Scripts

```bash
npm run optimize-images           # Optimize all images
npm run optimize-images:preview   # Dry run
npm run optimize-images:backup    # With backup
npm run migrate-images            # Convert to WebP
npm run migrate-images:preview    # Dry run
```

## QR Code Generation

Table QR codes are generated using scripts in `scripts/qrcodes/`:

```bash
cd scripts/qrcodes
python generateqrs.py
```

Requires `templateQR.png`, `indiestables.csv`, and `indiesuri.txt`. Outputs a `.docx` with one QR code per table, linking to `https://indies.innopay.lu/menu?table=N`.

## Related Projects

- **[innopay](../innopay)** — Central payment hub (Stripe, Hive blockchain, account management)
- **[merchant-hub](../merchant-hub)** — Centralized HAF polling, Redis Streams, system health dashboard, reporting API
- **[croque-bedaine](../croque-bedaine)** — Spoke 2 (Vite + React + Supabase + shadcn/ui)

See `ADMIN-DASHBOARD-IMPLEMENTATION.md` for detailed implementation notes on the admin dashboard and merchant-hub integration.
