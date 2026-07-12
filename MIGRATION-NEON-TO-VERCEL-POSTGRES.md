# Indiesmenu: NeonDB → Prisma Postgres Migration Plan

**Author**: Claude Code  
**Written**: 2026-04-24  
**Execution window**: Sunday (restaurant closed all day)  
**Estimated execution time**: 2–3 hours (mostly waiting for Vercel DB provisioning)

---

## Overview

Indiesmenu currently runs on a NeonDB PostgreSQL instance (EU Central, `ep-silent-smoke-a2axro2k-pooler`). The goal is to move it to a **Prisma Postgres** instance (Vercel Marketplace, `prisma-postgres-indiesmenu`, Frankfurt) — the same DB product every other Innopay module (hub, millewee, etc.) already uses. Indiesmenu is the last spoke still on NeonDB.

**What changes**:
- Database host: NeonDB → Prisma Postgres (Vercel Marketplace)
- Environment variable name: `DATABASE_URL` → `POSTGRES_URL`
- `schema.prisma` datasource: references new env var
- `lib/prisma.ts`: no change needed. As in every other module, we connect through the **direct `postgres://` string** as `POSTGRES_URL` with a bare Prisma 6 `PrismaClient`. Prisma Postgres also offers an Accelerate URL (`prisma+postgres://…`), but we do **not** use it — so no `withAccelerate()` extension, no adapter, no code change.
- All data migrated via export/import scripts

**What does NOT change**:
- Prisma version stays at 6.11.1 (no upgrade)
- Migration history (9 migrations) is intact — no baselining needed
  (the 9th, `20260710120000_add_app_setting`, adds the `app_setting` KV table
  used by the happy-hour image gallery)
- Schema definition is unchanged
- Application code is unchanged (no API routes touched)

---

## Pre-flight checklist (do BEFORE Sunday)

These steps are safe to do any day — they touch only local files and the Vercel dashboard, not the live production DB.

### Step 1 — Provision Prisma Postgres (DONE — provisioned, NOT connected)

The database `prisma-postgres-indiesmenu` is already provisioned in **Frankfurt** via
the Vercel Marketplace, but **deliberately not yet connected to the project**.

**Why not connect it pre-Sunday:** Vercel refuses to expose a second Postgres
integration's env vars under the same names while NeonDB is still connected — it
forces a **prefix** (e.g. `PRISMA_POSTGRES_URL` instead of `POSTGRES_URL`). To keep
the clean, unprefixed `POSTGRES_URL` that every other module uses, we disconnect
NeonDB **first** on Sunday, then connect Prisma Postgres so it claims `POSTGRES_URL`
with no prefix. This connection swap is the **first Sunday step** (Phase B0 below),
not a pre-flight step.

So there is nothing to pull yet. The `POSTGRES_URL` value only exists after the
Sunday connect; we pull it then (Phase B0).

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

# NEW (Prisma Postgres) — the direct postgres:// string, obtained in Phase B0
# (via `vercel env pull` after connecting, or copied from the DB dashboard)
POSTGRES_URL="<paste the direct postgres:// string for prisma-postgres-indiesmenu>"
SHADOW_DATABASE_URL="postgresql://Sorin@localhost:5432/nextappdb_shadow?schema=public"
```

Do NOT do this step until Sunday — keep `DATABASE_URL` active so the app continues running against NeonDB in local dev. The `POSTGRES_URL` value doesn't even exist until Phase B0 connects the new DB.

#### File 3: `indiesmenu/lib/prisma.ts` — NO CHANGE

The bare `new PrismaClient()` pattern is fine for Prisma 6 + Prisma Postgres. Prisma 6 reads `POSTGRES_URL` via `schema.prisma`, not via the client constructor. No adapter needed.

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
    'app_setting',
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

Create `indiesmenu/scripts/import-vercel-data.ts`. This runs against the **new Prisma Postgres** DB and inserts data from the JSON dumps.

```typescript
// indiesmenu/scripts/import-vercel-data.ts
// Run AFTER migrate deploy against Prisma Postgres.
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

  // app_setting: KV config (e.g. happy_hour_image_url → active happy-hour Blob URL).
  // No foreign keys, so order is irrelevant. We import only key+value and let
  // `updated_at` (@default(now()) @updatedAt) reset — the exact timestamp of a
  // settings row is not worth preserving, and passing an @updatedAt value is fiddly.
  console.warn('Importing app_setting...');
  const appSettings = readJson('app_setting').map((r: any) => ({ key: r.key, value: r.value }));
  await prisma.app_setting.createMany({ data: appSettings, skipDuplicates: true });

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
Verify `scripts/export/` contains 18 `.json` files and the row counts look reasonable (check `transfers.json` — should have the most rows; `app_setting.json` will have just 1–2 rows).

**A2b. Source `restaurant_tables` from DEV, not PROD.** Prod's `restaurant_tables`
is **empty (0 rows)** — a known data gap. The correct 70 rows live only in the local
**dev** DB (`nextappdb` on `localhost:5432`). If you imported the prod export as-is, the
new DB would have zero tables. Fix it with a single-table re-export against dev:

1. Temporarily point `.env`'s `DATABASE_URL` at the dev DB:
   ```dotenv
   DATABASE_URL="postgresql://Sorin@localhost:5432/nextappdb?schema=public"
   ```
2. Re-export just that one table (overwrites only `restaurant_tables.json`):
   ```powershell
   npx tsx scripts/export-neon-data.ts --table restaurant_tables
   ```
   Expect `→ 70 rows`. All other JSON files are untouched.
3. **Restore `.env`'s `DATABASE_URL` back to NeonDB** before continuing (Phase B0 will
   swap it to `POSTGRES_URL` shortly, but keep the Neon value intact until then).

**A3.** Copy the export folder somewhere safe as backup (e.g., zip it):
```powershell
Compress-Archive -Path scripts/export -DestinationPath scripts/export-backup-sunday.zip
```

### Phase B — Deploy schema to Prisma Postgres (empty new DB)

**Goal**: Apply all 9 migrations to the new empty Prisma Postgres instance.

**B0. Swap the Vercel database connection (do this AFTER Phase A export is done).**

Only now — with the export snapshot safely in `scripts/export/` — swap the project's
database integration:

1. Vercel dashboard → indiesmenu → **Storage** → **disconnect NeonDB** from the project.
   - This only unlinks the integration + its env vars from the project. It does **not**
     delete the Neon database — it stays alive as the rollback fallback, and your local
     `.env` still holds the literal Neon `DATABASE_URL`.
2. **Connect `prisma-postgres-indiesmenu`** to the project. With Neon now gone, it claims
   a clean, unprefixed **`POSTGRES_URL`** (no `PRISMA_POSTGRES_URL` prefix).
3. Confirm `POSTGRES_URL` (the direct `postgres://` string) is present for Production,
   Preview, and Development in Settings → Environment Variables.
4. Pull it locally for the Prisma CLI + local smoke test:
   ```powershell
   cd indiesmenu
   npx vercel env pull .env.vercel-postgres
   ```
   Copy the `POSTGRES_URL` value into `.env` per Step 2 File 2.

**B1.** Edit `.env` — swap the DATABASE_URL for POSTGRES_URL (see Step 2 above). At this point **do not restart the dev server yet** — Phase B is only about running Prisma CLI.

**B2.** Run migrations against the new DB. Prisma `migrate deploy` applies all pending migrations without a shadow DB (it's for production deploys):
```powershell
npx prisma migrate deploy
```
Expected output: 9 migrations applied successfully. If any fail, the new DB is still empty — no harm done. Investigate and fix before continuing.

**B3.** Verify schema with Prisma Studio pointed at the new DB:
```powershell
npx prisma studio
```
Open `http://localhost:5555` — confirm all tables exist and are empty.

### Phase C — Import data into Prisma Postgres

**Goal**: Move all data from the export into the new DB.

**C1.** Run the import script (`.env` now has `POSTGRES_URL` pointing at Prisma Postgres):
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

**D1.** Restart the dev server (it was still running against NeonDB — now `.env` has Prisma Postgres):
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

**Goal**: Redeploy the production app pointing at Prisma Postgres.

**E1.** `POSTGRES_URL` was added to the project in **Phase B0** (when you connected
Prisma Postgres). Verify it's there:
- Vercel dashboard → indiesmenu → Settings → Environment Variables
- Confirm `POSTGRES_URL` exists for Production, Preview, and Development environments
- Disconnecting NeonDB in B0 should have removed its `DATABASE_URL` entry automatically;
  if a stale `DATABASE_URL` lingers, remove it (or leave it — the schema reads `POSTGRES_URL` now)

**E2.** Push the commit from Step 5 to trigger a Vercel redeploy. OR redeploy manually from the dashboard if you prefer.

**E3.** After deploy, open `https://indies.innopay.lu/menu?table=1` and verify the menu loads.

**E4.** Log into `https://indies.innopay.lu/admin`, open the CO page, place a test order from the menu (Flow 3 guest checkout with a test card), verify the transfer appears on the CO page within ~12 seconds.

### Phase F — Final transfer sync

**Goal**: Catch any real orders that arrived on NeonDB *after* the export snapshot (A2) but before the Vercel deploy went live.

This window is short (< 2 hours on a Sunday), but check anyway:

**F1.** Open Prisma Studio pointed at the **new** Prisma Postgres DB (it's already configured in `.env`):
```powershell
npx prisma studio
```

**F2.** Temporarily point `.env` back at NeonDB:
```dotenv
DATABASE_URL="postgres://neondb_owner:npg_QTdeUb2YofS3@ep-silent-smoke-a2axro2k-pooler..."
# POSTGRES_URL=...  (comment this out temporarily)
```

**F3.** Run a quick check script — or just look at NeonDB via Prisma Studio to find any `transfers` rows with `received_at` > the time of your export. If there are new rows, insert them manually via Prisma Studio on the Prisma Postgres side.

**F4.** Restore `.env` to `POSTGRES_URL` after this check.

---

## Rollback plan

If anything goes wrong at any phase, rollback is simple:

- **Before Phase E deploy**: No production impact. Revert `.env` to `DATABASE_URL` pointing at NeonDB. NeonDB has not been modified at all during this entire procedure.
- **After Phase E deploy but broken**: In Vercel dashboard → indiesmenu → Deployments → click the previous deployment → **Promote to Production**. This instantly rolls back to the old code+config pointing at NeonDB.
- **NeonDB is read-only during the migration** — we never write to it, never delete from it. It remains a live fallback throughout Sunday.

---

## Post-migration cleanup (do the following week)

Once you've run for a few days on Prisma Postgres without issues:

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

Note: `app_setting` is intentionally **absent** from this list — its primary key is a
`String` (`key`), not an autoincrement, so it has no sequence to reset. Do not add it here.

**Prisma Postgres connection**: We connect via the **direct `postgres://` string** as
`POSTGRES_URL` with a bare `new PrismaClient()` — identical to every other Innopay module.
Prisma Postgres also exposes an Accelerate URL (`prisma+postgres://…`) for edge pooling,
but we do **not** use it: a bare client cannot parse that scheme (it needs the
`withAccelerate()` extension), and we have no need for it at indiesmenu's scale. Keep to
the direct string and there is no code change and no adapter to add. If you ever upgrade
indiesmenu to Prisma 7, revisit the driver-adapter pattern then, consistent with the other
modules.

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
