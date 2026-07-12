// scripts/export-neon-data.ts
// Run BEFORE migration while NeonDB is still live (with DATABASE_URL active).
// Output: scripts/export/ directory with one JSON file per table (18 tables).
//
//   npx tsx scripts/export-neon-data.ts
//
// dotenv-hoisting rule: loadEnv() runs first, then ../lib/prisma is dynamically
// imported so the Prisma client resolves DATABASE_URL after dotenv populated it.

import { loadEnv } from './loadEnv';

/**
 * Parse an optional `--table <name>` (or `--table=<name>`) CLI arg.
 * Returns the table name, or null for a full export.
 */
function parseTableArg(argv: string[]): string | null {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--table') return argv[i + 1] ?? null;
    if (a.startsWith('--table=')) return a.slice('--table='.length);
  }
  return null;
}

async function main() {
  loadEnv(); // loads DATABASE_URL from .env

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

  // Optional single-table export: `--table <name>`. Used to source ONE table from
  // a different DB than the rest — e.g. prod's `restaurant_tables` is empty (0 rows),
  // so run the full export against prod, then run again with
  // `--table restaurant_tables` while DATABASE_URL points at the dev DB (localhost
  // nextappdb, 70 rows) to overwrite just that one JSON file.
  const only = parseTableArg(process.argv.slice(2));
  if (only && !tables.includes(only as (typeof tables)[number])) {
    console.error(`Unknown table "${only}". Valid tables:\n  ${tables.join('\n  ')}`);
    process.exit(1);
  }
  const toExport = only ? [only as (typeof tables)[number]] : tables;
  console.warn(
    only
      ? `Single-table export: ${only} (overwrites only scripts/export/${only}.json)`
      : `Full export: ${tables.length} tables`
  );

  for (const table of toExport) {
    console.warn(`Exporting ${table}...`);
    // @ts-ignore — dynamic table name
    const rows = await prisma[table].findMany();

    // BigInt serialisation — the transfers table has BigInt IDs.
    const json = JSON.stringify(
      rows,
      (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      2
    );

    fs.writeFileSync(path.join(outDir, `${table}.json`), json, 'utf-8');
    console.warn(`  → ${rows.length} rows`);
  }

  await prisma.$disconnect();
  console.warn('Export complete. Files in scripts/export/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
