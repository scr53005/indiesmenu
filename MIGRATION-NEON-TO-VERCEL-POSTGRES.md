# Indiesmenu: NeonDB → Vercel Postgres Migration Plan

**Author**: Claude Code  
**Written**: 2026-04-24  
**Execution window**: Sunday (restaurant closed all day)  
**Estimated execution time**: 2–3 hours (mostly waiting for Vercel DB provisioning)

---

## Overview

Indiesmenu currently runs on a NeonDB PostgreSQL instance (EU Central, `ep-silent-smoke-a2axro2k-pooler`). The goal is to move it to a Vercel Postgres instance, consistent with the innopay hub and millewee.

**What changes**:
- Database host: NeonDB → Vercel Postgres
- Environment variable name: `DATABASE_URL` → `POSTGRES_URL`
- `schema.prisma` datasource: references new env var, remove `shadowDatabaseUrl` (local shadow stays in `.env` only)
- `lib/prisma.ts`: no change needed (Prisma 6 bare PrismaClient works fine with Vercel Postgres)
- All data migrated via export/import scripts

**What does NOT change**:
- Prisma version stays at 6.11.1 (no upgrade)
- Migration history (8 migrations) is intact — no baselining needed
- Schema definition is unchanged
- Application code is unchanged (no API routes touched)

---

## Pre-flight checklist (do BEFORE Sunday)

These steps are safe to do any day — they touch only local files and the Vercel dashboard, not the live production DB.

### Step 1 — Provision Vercel Postgres

1. Open the Vercel dashboard → indiesmenu project → **Storage** tab
2. Click **Connect Database** → **Create New** → **Postgres**
3. Name it `indiesmenu-db` (or similar), region **Frankfurt (fra1)** to match the existing NeonDB region
4. Once created, Vercel will add these env vars to the project automatically:
   - `POSTGRES_URL` (pooled — this is the one Prisma uses)
   - `POSTGRES_URL_NON_POOLING` (direct — needed for migrations)
   - `POSTGRES_PRISMA_URL` (alias sometimes added — ignore if present)
   - Several others (`POSTGRES_HOST`, `POSTGRES_USER`, etc. — not needed)
5. Pull the new env vars locally:
   ```powershell
   cd indiesmenu
   npx vercel env pull .env.vercel-postgres
   ```
   This writes a new file. **Do not replace `.env` yet.** Keep `.env.vercel-postgres` for reference.

### Step 2 — Code changes (3 files)

These changes go in a commit. They do NOT break anything on the existing NeonDB because they only rename the env var — the app still reads `DATABASE_URL` from `.env` locally until you swap it.

#### File 1: `indiesmenu/prisma/schema.prisma`

Change the `datasource` block from:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```
to:
```prisma
datasource db {
  provider          = "postgresql"
  url               = env("POSTGRES_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")
}
```

The `shadowDatabaseUrl` line stays — it still points at your local shadow DB for `migrate dev` sessions. It is ignored in production (Vercel never sets `SHADOW_DATABASE_URL`).

#### File 2: `indiesmenu/.env` (local dev only, never committed)

Add this line and comment out the old one:
```dotenv
# OLD (NeonDB - decommissioned after migration)
# DATABASE_URL="postgres://neondb_owner:npg_QTdeUb2YofS3@ep-silent-smoke-a2axro2k-pooler..."

# NEW (Vercel Postgres)
POSTGRES_URL="<paste POSTGRES_URL value from .env.vercel-postgres>"
SHADOW_DATABASE_URL="postgresql://Sorin@localhost:5432/nextappdb_shadow?schema=public"
```

Do NOT do this step until Sunday — keep `DATABASE_URL` active so the app continues running against NeonDB in local dev.

#### File 3: `indiesmenu/lib/prisma.ts` — NO CHANGE

The bare `new PrismaClient()` pattern is fine for Prisma 6 + Vercel Postgres. Prisma 6 reads `POSTGRES_URL` via `schema.prisma`, not via the client constructor. No adapter needed.

### Step 3 — Write the export script

Create `indiesmenu/scripts/export-neon-data.ts`. This runs against the **current NeonDB** and dumps every table to JSON files.

```typescript
// indiesmenu/scripts/export-neon-data.ts
// Run BEFORE migration while NeonDB is still live.
// Output: scripts/export/ directory with one JSON file per table.

import { loadEnv } from './loadEnv';

async function main() {
  loadEnv(); // loads DATABASE_URL from .env

  // Must dynamic-import to avoid hoisting before env load
  const { default: prisma } = await import('../lib/prisma');
  const fs = await import('fs');
  const path = await import('path');

  const outDir = path.join(__dirname, 'export');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const tables = [
    'alergenes',
    'categories',
    'categories_dishes',
    'categories_drinks',
    'cuisson',
    'currency_conversion',
    'dishes',
    'dishes_cuisson',
    'dishes_ingredients',
    'drink_sizes',
    'drinks',
    'drinks_ingredients',
    'ingredients',
    'ingredients_alergenes',
    'orders',
    'restaurant_tables',
    'transfers',
  ] as const;

  for (const table of tables) {
    console.warn(`Exporting ${table}...`);
    // @ts-ignore — dynamic table name
    const rows = await prisma[table].findMany();

    // BigInt serialisation — the transfers table has BigInt IDs
    const json = JSON.stringify(rows, (_key, value) =>
      typeof value === 'bigint' ? value.toString() : value,
      2
    );

    fs.writeFileSync(path.join(outDir, `${table}.json`), json, 'utf-8');
    console.warn(`  → ${rows.length} rows`);
  }

  await prisma.$disconnect();
  console.warn('Export complete. Files in scripts/export/');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

You also need `indiesmenu/scripts/loadEnv.ts` if it doesn't exist (same pattern as other scripts in the repo):

```typescript
// indiesmenu/scripts/loadEnv.ts
import * as dotenv from 'dotenv';
import * as path from 'path';

export function loadEnv() {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}
```

Check if it already exists — if so, skip.

### Step 4 — Write the import script

Create `indiesmenu/scripts/import-vercel-data.ts`. This runs against the **new Vercel Postgres** DB and inserts data from the JSON dumps.

```typescript
// indiesmenu/scripts/import-vercel-data.ts
// Run AFTER migrate deploy against Vercel Postgres.
// Reads from scripts/export/ and inserts into the new DB.
// Safe to re-run (uses upsert / skipDuplicates where possible).

import { loadEnv } from './loadEnv';

async function main() {
  loadEnv(); // must already have POSTGRES_URL in .env at this point

  const { default: prisma } = await import('../lib/prisma');
  const fs = await import('fs');
  const path = await import('path');

  const inDir = path.join(__dirname, 'export');

  function readJson(table: string) {
    const file = path.join(inDir, `${table}.json`);
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }

  // Helper: BigInt fields need conversion back from string
  function toBigInt(rows: any[], field: string) {
    return rows.map(r => ({ ...r, [field]: BigInt(r[field]) }));
  }

  // Insert order matters: parents before children (foreign keys)

  console.warn('Importing alergenes...');
  const alergenes = readJson('alergenes');
  await prisma.alergenes.createMany({ data: alergenes, skipDuplicates: true });

  console.warn('Importing categories...');
  await prisma.categories.createMany({ data: readJson('categories'), skipDuplicates: true });

  console.warn('Importing cuisson...');
  await prisma.cuisson.createMany({ data: readJson('cuisson'), skipDuplicates: true });

  console.warn('Importing currency_conversion...');
  await prisma.currency_conversion.createMany({ data: readJson('currency_conversion'), skipDuplicates: true });

  console.warn('Importing ingredients...');
  await prisma.ingredients.createMany({ data: readJson('ingredients'), skipDuplicates: true });

  console.warn('Importing dishes...');
  await prisma.dishes.createMany({ data: readJson('dishes'), skipDuplicates: true });

  console.warn('Importing drinks...');
  await prisma.drinks.createMany({ data: readJson('drinks'), skipDuplicates: true });

  console.warn('Importing restaurant_tables...');
  await prisma.restaurant_tables.createMany({ data: readJson('restaurant_tables'), skipDuplicates: true });

  console.warn('Importing orders...');
  await prisma.orders.createMany({ data: readJson('orders'), skipDuplicates: true });

  // Join tables
  console.warn('Importing categories_dishes...');
  await prisma.categories_dishes.createMany({ data: readJson('categories_dishes'), skipDuplicates: true });

  console.warn('Importing categories_drinks...');
  await prisma.categories_drinks.createMany({ data: readJson('categories_drinks'), skipDuplicates: true });

  console.warn('Importing dishes_cuisson...');
  await prisma.dishes_cuisson.createMany({ data: readJson('dishes_cuisson'), skipDuplicates: true });

  console.warn('Importing dishes_ingredients...');
  await prisma.dishes_ingredients.createMany({ data: readJson('dishes_ingredients'), skipDuplicates: true });

  console.warn('Importing drink_sizes...');
  await prisma.drink_sizes.createMany({ data: readJson('drink_sizes'), skipDuplicates: true });

  console.warn('Importing drinks_ingredients...');
  await prisma.drinks_ingredients.createMany({ data: readJson('drinks_ingredients'), skipDuplicates: true });

  console.warn('Importing ingredients_alergenes...');
  await prisma.ingredients_alergenes.createMany({ data: readJson('ingredients_alergenes'), skipDuplicates: true });

  // transfers last — BigInt IDs, largest table
  console.warn('Importing transfers...');
  const rawTransfers = readJson('transfers');
  // Convert id back to BigInt; convert date strings back to Date objects
  const transfers = rawTransfers.map((r: any) => ({
    ...r,
    id: BigInt(r.id),
    received_at: r.received_at ? new Date(r.received_at) : null,
    fulfilled_at: r.fulfilled_at ? new Date(r.fulfilled_at) : null,
  }));
  // createMany with BigInt works in Prisma 6
  await prisma.transfers.createMany({ data: transfers, skipDuplicates: true });
  console.warn(`  → ${transfers.length} transfers imported`);

  await prisma.$disconnect();
  console.warn('Import complete.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
```

### Step 5 — Commit the code changes

Commit to git:
- `prisma/schema.prisma` (env var rename)
- `scripts/export-neon-data.ts` (new)
- `scripts/import-vercel-data.ts` (new)
- `scripts/loadEnv.ts` (new, if it didn't exist)

**Do NOT commit `.env`** (it's gitignored). The schema change does not break anything — the app still uses `DATABASE_URL` locally until you swap the env var.

---

## Sunday execution sequence

Do these steps in order. Do not skip ahead.

### Phase A — Export from NeonDB (while still live)

**Goal**: Get a full data snapshot from the current production NeonDB before touching anything.

**A1.** Start the local dev server against NeonDB to confirm the app is working:
```powershell
cd indiesmenu
npx next dev --turbopack -p 3001
```
Open `http://localhost:3001/menu?table=1` — verify the menu loads. Open the admin CO page. If anything is broken before you start, stop and investigate.

**A2.** Run the export script (`.env` still has `DATABASE_URL` pointing at NeonDB):
```powershell
npx tsx scripts/export-neon-data.ts
```
Verify `scripts/export/` contains 17 `.json` files and the row counts look reasonable (check `transfers.json` — should have the most rows).

**A3.** Copy the export folder somewhere safe as backup (e.g., zip it):
```powershell
Compress-Archive -Path scripts/export -DestinationPath scripts/export-backup-sunday.zip
```

### Phase B — Deploy schema to Vercel Postgres (empty new DB)

**Goal**: Apply all 8 migrations to the new empty Vercel Postgres instance.

**B1.** Edit `.env` — swap the DATABASE_URL for POSTGRES_URL (see Step 2 above). At this point **do not restart the dev server yet** — Phase B is only about running Prisma CLI.

**B2.** Run migrations against the new DB. Prisma `migrate deploy` applies all pending migrations without a shadow DB (it's for production deploys):
```powershell
npx prisma migrate deploy
```
Expected output: 8 migrations applied successfully. If any fail, the new DB is still empty — no harm done. Investigate and fix before continuing.

**B3.** Verify schema with Prisma Studio pointed at the new DB:
```powershell
npx prisma studio
```
Open `http://localhost:5555` — confirm all tables exist and are empty.

### Phase C — Import data into Vercel Postgres

**Goal**: Move all data from the export into the new DB.

**C1.** Run the import script (`.env` now has `POSTGRES_URL` pointing at Vercel Postgres):
```powershell
npx tsx scripts/import-vercel-data.ts
```
Watch the output — every table should log a row count. If a table fails:
- The script uses `skipDuplicates: true` so it's safe to re-run after fixing
- Most likely causes: foreign key violation (wrong insert order) or type mismatch on a BigInt field

**C2.** Spot-check data in Prisma Studio:
- `dishes` — count should match the export
- `transfers` — spot-check a few rows, verify `id` is a BigInt not a string, `received_at` is a proper timestamp
- `currency_conversion` — verify date column is a Date not a string

### Phase D — Smoke test locally

**Goal**: Verify the app works end-to-end against the new DB before deploying.

**D1.** Restart the dev server (it was still running against NeonDB — now `.env` has Vercel Postgres):
```powershell
# Kill the old server (Ctrl+C), then:
npx next dev --turbopack -p 3001
```

**D2.** Test these pages:
- `http://localhost:3001/menu?table=1` — menu loads with correct dishes and drinks
- `http://localhost:3001/admin` (login) → Dashboard → Carte — menu items visible
- `http://localhost:3001/admin/current_orders` — CO page loads, poller election runs (check browser console for errors)
- `http://localhost:3001/admin/history` — historical orders show up
- `http://localhost:3001/admin/reporting` — accounting page loads

**D3.** If the admin menu edit works (update a dish name, save, verify it reflects on the menu page), the write path is confirmed.

### Phase E — Deploy to Vercel

**Goal**: Redeploy the production app pointing at Vercel Postgres.

**E1.** The Vercel dashboard already added `POSTGRES_URL` to the indiesmenu project (from Step 1, provisioning). Verify it's there:
- Vercel dashboard → indiesmenu → Settings → Environment Variables
- Confirm `POSTGRES_URL` exists for Production, Preview, and Development environments
- **Remove** (or leave — it won't matter) the old `DATABASE_URL` entry if it exists in Vercel

**E2.** Push the commit from Step 5 to trigger a Vercel redeploy. OR redeploy manually from the dashboard if you prefer.

**E3.** After deploy, open `https://indies.innopay.lu/menu?table=1` and verify the menu loads.

**E4.** Log into `https://indies.innopay.lu/admin`, open the CO page, place a test order from the menu (Flow 3 guest checkout with a test card), verify the transfer appears on the CO page within ~12 seconds.

### Phase F — Final transfer sync

**Goal**: Catch any real orders that arrived on NeonDB *after* the export snapshot (A2) but before the Vercel deploy went live.

This window is short (< 2 hours on a Sunday), but check anyway:

**F1.** Open Prisma Studio pointed at the **new** Vercel Postgres DB (it's already configured in `.env`):
```powershell
npx prisma studio
```

**F2.** Temporarily point `.env` back at NeonDB:
```dotenv
DATABASE_URL="postgres://neondb_owner:npg_QTdeUb2YofS3@ep-silent-smoke-a2axro2k-pooler..."
# POSTGRES_URL=...  (comment this out temporarily)
```

**F3.** Run a quick check script — or just look at NeonDB via Prisma Studio to find any `transfers` rows with `received_at` > the time of your export. If there are new rows, insert them manually via Prisma Studio on the Vercel Postgres side.

**F4.** Restore `.env` to `POSTGRES_URL` after this check.

---

## Rollback plan

If anything goes wrong at any phase, rollback is simple:

- **Before Phase E deploy**: No production impact. Revert `.env` to `DATABASE_URL` pointing at NeonDB. NeonDB has not been modified at all during this entire procedure.
- **After Phase E deploy but broken**: In Vercel dashboard → indiesmenu → Deployments → click the previous deployment → **Promote to Production**. This instantly rolls back to the old code+config pointing at NeonDB.
- **NeonDB is read-only during the migration** — we never write to it, never delete from it. It remains a live fallback throughout Sunday.

---

## Post-migration cleanup (do the following week)

Once you've run for a few days on Vercel Postgres without issues:

1. Delete the NeonDB project from the Neon dashboard to stop incurring any charges
2. Remove the commented-out `DATABASE_URL` lines from `.env`
3. Remove `scripts/export/` and `scripts/export-backup-sunday.zip` (they contain DB credentials in the export paths/configs)
4. Archive or delete `scripts/export-neon-data.ts` and `scripts/import-vercel-data.ts` (or keep them — they're idempotent and harmless)

---

## Known gotchas

**BigInt serialisation**: `JSON.stringify` can't handle BigInt natively — the export script uses a replacer to convert to string. The import script converts back with `BigInt(r.id)`. If you see `TypeError: Do not know how to serialize a BigInt` during export, the replacer isn't working — check the script carefully.

**`currency_conversion` date column**: Prisma maps `@db.Date` to a JS `Date` object (midnight UTC). When round-tripped through JSON it becomes a date string. The import script does NOT re-parse this for `currency_conversion` — Prisma's `createMany` accepts ISO date strings for `Date` fields, so it should work. Verify in Prisma Studio after import.

**Sequence gaps on autoincrement tables**: Postgres `SERIAL` sequences are reset on the new DB. When you import rows with explicit IDs (like `dish_id = 42`), the sequence doesn't know about them. After import, run this SQL against the new DB (via Prisma Studio "Query" or a script) to reset all sequences:

```sql
SELECT setval(pg_get_serial_sequence('"alergenes"', 'alergene_id'), MAX(alergene_id)) FROM alergenes;
SELECT setval(pg_get_serial_sequence('"categories"', 'category_id'), MAX(category_id)) FROM categories;
SELECT setval(pg_get_serial_sequence('"cuisson"', 'cuisson_id'), MAX(cuisson_id)) FROM cuisson;
SELECT setval(pg_get_serial_sequence('"dishes"', 'dish_id'), MAX(dish_id)) FROM dishes;
SELECT setval(pg_get_serial_sequence('"drinks"', 'drink_id'), MAX(drink_id)) FROM drinks;
SELECT setval(pg_get_serial_sequence('"ingredients"', 'ingredient_id'), MAX(ingredient_id)) FROM ingredients;
SELECT setval(pg_get_serial_sequence('"orders"', 'order_id'), MAX(order_id)) FROM orders;
```

This is **critical** — if the sequences aren't reset, the next INSERT on any of these tables will try to use ID 1 and hit a unique constraint violation.

**Vercel Postgres connection limit**: Vercel Postgres (Neon-backed) uses PgBouncer pooling on the `POSTGRES_URL`. With `new PrismaClient()` (no adapter), Prisma opens its own connection pool on top of PgBouncer. This works but means you have two layers of pooling. It's not a problem at indiesmenu's scale, but it's why millewee uses the `@prisma/adapter-pg` pattern (single layer). If you ever upgrade indiesmenu to Prisma 7, adopt that pattern at the same time.

**Shadow DB**: The `SHADOW_DATABASE_URL` still points at your local `nextappdb_shadow` Postgres. This is only used during `prisma migrate dev` (local development). It's never used by Vercel. Leave it as-is.

---

## Quick reference — scripts to run Sunday

```powershell
# Phase A: export (run with DATABASE_URL still active)
npx tsx scripts/export-neon-data.ts

# Phase B: deploy schema (run after switching .env to POSTGRES_URL)
npx prisma migrate deploy

# Phase C: import data
npx tsx scripts/import-vercel-data.ts

# Sequence reset (run in Prisma Studio Query tab or as a script)
# — paste the 7 setval() lines from the "Sequence gaps" section above

# Phase D: local smoke test
npx next dev --turbopack -p 3001
```
