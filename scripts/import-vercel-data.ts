// scripts/import-vercel-data.ts
// Run AFTER `prisma migrate deploy` against the new Vercel Postgres DB
// (with POSTGRES_URL active in .env). Reads scripts/export/ and inserts data.
// Safe to re-run — every insert uses skipDuplicates.
//
//   npx tsx scripts/import-vercel-data.ts
//
// Insert order matters: parents before children (foreign keys). app_setting and
// the base lookup tables have no FKs; join tables and transfers come after their
// parents. After this completes, run the setval() sequence-reset SQL (see the
// migration doc's "Sequence gaps on autoincrement tables" section).

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

  // --- Base tables (no foreign keys) ---

  console.warn('Importing alergenes...');
  await prisma.alergenes.createMany({ data: readJson('alergenes'), skipDuplicates: true });

  // app_setting: KV config (e.g. happy_hour_image_url → active happy-hour Blob URL).
  // Upsert (not createMany) — it's the correct idempotent pattern for a KV table and
  // matches how the app writes these rows. We import only key+value and let updated_at
  // (@default(now()) @updatedAt) reset; the exact timestamp of a settings row is not
  // worth preserving. (createMany({skipDuplicates}) was observed to land 0 rows here.)
  console.warn('Importing app_setting...');
  const appSettings = readJson('app_setting');
  for (const r of appSettings) {
    await prisma.app_setting.upsert({
      where: { key: r.key },
      update: { value: r.value },
      create: { key: r.key, value: r.value },
    });
  }
  console.warn(`  → ${appSettings.length} app_setting rows`);

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

  // --- Join tables (parents already inserted above) ---

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

  // --- transfers last — BigInt IDs, largest table ---
  console.warn('Importing transfers...');
  const rawTransfers = readJson('transfers');
  // Convert id back to BigInt; convert date strings back to Date objects.
  const transfers = rawTransfers.map((r: any) => ({
    ...r,
    id: BigInt(r.id),
    received_at: r.received_at ? new Date(r.received_at) : null,
    fulfilled_at: r.fulfilled_at ? new Date(r.fulfilled_at) : null,
  }));
  await prisma.transfers.createMany({ data: transfers, skipDuplicates: true });
  console.warn(`  → ${transfers.length} transfers imported`);

  await prisma.$disconnect();
  console.warn('Import complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
