// Set the wallet-holder discount on every dish and every drink size (RUBIS-PLAN.md §3: once RUBIS
// reward wallet holders, the immediate discount is reduced or removed).
//
//   npx tsx scripts/set-discounts.ts --percent-off 5            # dry run: shows what would change
//   npx tsx scripts/set-discounts.ts --percent-off 5 --apply    # writes it
//   npx tsx scripts/set-discounts.ts --percent-off 0 --apply    # removes the discount (1.0)
//   ... --only dishes | --only drinks                           # one table only
//
// Idempotent: rerunning with the same value changes nothing. It targets the database in .env's
// POSTGRES_URL and prints its host first. Replaces the old scripts/updateDiscounts.ts, which used
// pre-rename table names and no longer runs.
import { loadEnv } from './loadEnv';
import { describeDatabase, parseSetDiscountArgs, type DiscountTable } from '../lib/admin/discount';

type Distribution = Array<{ discount: number | null; count: number }>;

async function main() {
  loadEnv();
  const args = parseSetDiscountArgs(process.argv.slice(2));
  // Dynamic import: lib/prisma builds its client at module load, after .env is read (CLAUDE.md).
  const { default: prisma } = await import('../lib/prisma');

  const distribution = async (table: DiscountTable): Promise<Distribution> => {
    const rows = table === 'dishes'
      ? await prisma.dishes.groupBy({ by: ['discount'], _count: { _all: true } })
      : await prisma.drink_sizes.groupBy({ by: ['discount'], _count: { _all: true } });
    return rows.map(r => ({ discount: r.discount, count: r._count._all })).sort((a, b) => (a.discount ?? 1) - (b.discount ?? 1));
  };
  const show = (d: Distribution) =>
    d.map(r => `${r.discount === null ? 'NULL' : r.discount} × ${r.count}`).join(', ') || '(no rows)';
  const label = (t: DiscountTable) => (t === 'dishes' ? 'dishes' : 'drink_sizes');

  console.warn(`Database: ${describeDatabase(process.env.POSTGRES_URL)}`);
  console.warn(`Target discount: ${args.multiplier} (${Math.round((1 - args.multiplier) * 10000) / 100} % off)${args.apply ? '' : '  [DRY RUN]'}`);

  try {
    for (const table of args.tables) {
      const before = await distribution(table);
      const toChange = before.filter(r => r.discount !== args.multiplier).reduce((n, r) => n + r.count, 0);
      console.warn(`\n${label(table)} now: ${show(before)}`);
      console.warn(`${label(table)}: ${toChange} row(s) to change`);
    }
    if (!args.apply) {
      console.warn('\nDry run: nothing written. Add --apply to write.');
      return;
    }

    // One transaction: dishes and drinks change together or not at all.
    const results = await prisma.$transaction(args.tables.map(table => table === 'dishes'
      ? prisma.dishes.updateMany({ where: { OR: [{ discount: { not: args.multiplier } }, { discount: null }] }, data: { discount: args.multiplier } })
      : prisma.drink_sizes.updateMany({ where: { OR: [{ discount: { not: args.multiplier } }, { discount: null }] }, data: { discount: args.multiplier } })));
    args.tables.forEach((table, i) => console.warn(`\n${label(table)}: ${results[i].count} row(s) updated`));
    for (const table of args.tables) console.warn(`${label(table)} after: ${show(await distribution(table))}`);
    console.warn('\nThe server keeps the menu in memory (up to 7 days) and browsers cache /api/menu for 3 h:');
    console.warn('redeploy the current production build on Vercel so customers see the new prices.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
