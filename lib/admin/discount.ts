// Argument handling for scripts/set-discounts.ts (kept here so Vitest covers it; scripts/ is excluded).
//
// `discount` on dishes and drink_sizes is a price MULTIPLIER for wallet holders: 1.0 = no discount,
// 0.9 = 10 % off (CartContext reverses it for guests, who pay the full price + 5 %).

export type DiscountTable = 'dishes' | 'drinks';

export interface SetDiscountArgs {
  /** Value written to `discount`, e.g. 0.95 for 5 % off, 1 for none. */
  multiplier: number;
  /** false = dry run: report what would change, write nothing. */
  apply: boolean;
  tables: DiscountTable[];
}

export const USAGE = 'Usage: npx tsx scripts/set-discounts.ts --percent-off <0..99.99> [--only dishes|drinks] [--apply]';

/** 5 → 0.95, 0 → 1, 12.5 → 0.875; exact in hundredths of a percent, no float residue. */
export function percentOffToMultiplier(percentOff: number): number {
  if (!Number.isFinite(percentOff) || percentOff < 0 || percentOff >= 100) {
    throw new Error(`--percent-off must be between 0 and 99.99, got ${percentOff}`);
  }
  const hundredths = Math.round(percentOff * 100);
  if (Math.abs(hundredths - percentOff * 100) > 1e-6) {
    throw new Error(`--percent-off takes at most 2 decimals, got ${percentOff}`);
  }
  return (10000 - hundredths) / 10000;
}

export function parseSetDiscountArgs(argv: string[]): SetDiscountArgs {
  let percentOff: number | null = null;
  let apply = false;
  let tables: DiscountTable[] = ['dishes', 'drinks'];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') apply = true;
    else if (arg === '--percent-off') {
      const raw = argv[++i];
      if (raw === undefined || raw.trim() === '' || Number.isNaN(Number(raw))) {
        throw new Error(`--percent-off needs a number. ${USAGE}`);
      }
      percentOff = Number(raw);
    } else if (arg === '--only') {
      const raw = argv[++i];
      if (raw !== 'dishes' && raw !== 'drinks') throw new Error(`--only takes dishes or drinks. ${USAGE}`);
      tables = [raw];
    } else {
      throw new Error(`Unknown argument ${arg}. ${USAGE}`);
    }
  }
  if (percentOff === null) throw new Error(`--percent-off is required. ${USAGE}`);
  return { multiplier: percentOffToMultiplier(percentOff), apply, tables };
}

/** Database host only, for the "which DB am I about to change?" line. Never prints credentials. */
export function describeDatabase(url: string | undefined): string {
  if (!url) return '(POSTGRES_URL not set)';
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}${parsed.pathname}`;
  } catch {
    return '(unparseable POSTGRES_URL)';
  }
}
