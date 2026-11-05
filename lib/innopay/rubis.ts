// RUBIS wiring for the wallet (RUBIS-PLAN.md §5). Display only: earning is decided by the hub,
// and spending RUBIS arrives with the redemption flow.

/**
 * Indies earns RUBIS. Mirrors the hub's `spoke.rubis_rate` (0.1 for indies); the hub alone
 * decides rewards, this flag only decides whether the "spend here to earn" teaser makes sense.
 */
export const RUBIS_EARNABLE = true;

/** Per-device preference; a missing value means the default (checked). */
export const SPEND_RUBIS_FIRST_KEY = 'innopay_spend_rubis_first';
/** sessionStorage: the teaser plays once per browser session, holder or guest. */
export const RUBIS_TEASER_SHOWN_KEY = 'innopay_rubis_teaser_shown';
/** Last RUBIS balance read from Hive-Engine, so a reload shows the strip without a flicker. */
export const RUBIS_CACHE_KEY = 'innopay_lastRubis';

type Reader = Pick<Storage, 'getItem'>;
type Writer = Pick<Storage, 'setItem'>;

// Storage can throw (private mode, blocked site data); every helper falls back to the default.
export function readSpendRubisFirst(storage: Reader): boolean {
  try { return storage.getItem(SPEND_RUBIS_FIRST_KEY) !== '0'; } catch { return true; }
}

export function writeSpendRubisFirst(storage: Writer, value: boolean): void {
  try { storage.setItem(SPEND_RUBIS_FIRST_KEY, value ? '1' : '0'); } catch { /* keeps the in-memory value */ }
}

/** Unreadable storage counts as "shown": better to skip a teaser than to repeat it on every page. */
export function readTeaserShown(storage: Reader): boolean {
  try { return storage.getItem(RUBIS_TEASER_SHOWN_KEY) === '1'; } catch { return true; }
}

export function markTeaserShown(storage: Writer): void {
  try { storage.setItem(RUBIS_TEASER_SHOWN_KEY, '1'); } catch { /* nothing to remember it with */ }
}

export function readCachedRubis(storage: Reader): number | null {
  try {
    const raw = storage.getItem(RUBIS_CACHE_KEY);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch { return null; }
}

export function saveCachedRubis(storage: Writer, value: number): void {
  try { storage.setItem(RUBIS_CACHE_KEY, String(value)); } catch { /* cache only */ }
}

// Query parameters the hub adds when it sends the customer back after a payment or an account
// creation. While they are present, the menu page is finishing a payment: no teaser then.
const PAYMENT_RETURN_PARAMS = [
  'payment', 'order_success', 'account_created', 'existing_account', 'topup_success',
  'session_id', 'credential_token', 'flow',
];

export function isPaymentReturn(search: string): boolean {
  const params = new URLSearchParams(search);
  return PAYMENT_RETURN_PARAMS.some(key => params.has(key));
}

// Sources that mean "just read from the chain" in Indies: /api/balance/euro answers 'hive-engine', or
// 'hive-hbd-conversion' when the EURO row is missing (it still forwards the Hive-Engine RUBIS read,
// or null if no Hive-Engine node answered). Cached, trust-window and optimistic values are excluded.
const FRESH_SOURCES = new Set(['hive-engine', 'hive-hbd-conversion']);

/** The RUBIS balance the teaser may trust: a fresh read only, otherwise null ("unknown"). */
export function confirmedRubis(source: string | null, rubis: number | null): number | null {
  return source !== null && FRESH_SOURCES.has(source) ? rubis : null;
}
