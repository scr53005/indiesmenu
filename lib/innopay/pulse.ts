// MiniWallet order pulse (Level 3 guardrail): the rules, as pure functions (R3, 2026-11-06).
// Same rules as millewee's hooks/use-wallet-pulse.tsx; hooks/useWalletPulse.ts runs them.
// Relative imports only: tested file (CLAUDE.md alias gotcha).
//
//   No transfer yet:  age < 20 min → blue, then red; 60 s polls
//   Transfer found:   < 20 min → green, 20–30 → green-slow, then red; 15 s polls
//   Fulfilled:        solid green for 10 min after first detection, then stop
//   Older than 2 h:   stop

export type PulseState = 'none' | 'blue' | 'green' | 'green-slow' | 'green-solid' | 'red';

export const PULSE_KEYS = {
  memo: 'innopay_latestMemoContent',
  orderTime: 'innopay_latestMemoDateTime',
  fulfilledAt: 'innopay_fulfilledDetectedAt',
  /** Memo prefix whose transfer was already seen, so the cart is cleared only once per order. */
  confirmedFor: 'innopay_orderConfirmedForMemo',
} as const;

export const ACTIVE_POLL_MS = 15_000;
export const PASSIVE_POLL_MS = 60_000;
export const RETRY_MS = 5_000;
export const FIRST_CHECK_MS = 9_000; // a Hive block + merchant-hub sync before the first look

const MINUTE = 60_000;

/** What to do before asking the server. */
export type PreCheck =
  | { action: 'stop' } // nothing tracked
  | { action: 'cleanup' } // tracking finished: clear the keys, state none
  | { action: 'show'; state: PulseState; nextMs: number } // decided locally
  | { action: 'query'; memo: string; ageMin: number };

export function pulsePreCheck(input: { memo: string | null; orderTime: number; fulfilledAt: number; now: number }): PreCheck {
  const { memo, orderTime, fulfilledAt, now } = input;
  if (!memo || !orderTime) return { action: 'stop' };
  if (fulfilledAt > 0) {
    return now - fulfilledAt < 10 * MINUTE
      ? { action: 'show', state: 'green-solid', nextMs: PASSIVE_POLL_MS }
      : { action: 'cleanup' };
  }
  const ageMin = (now - orderTime) / MINUTE;
  if (ageMin > 120) return { action: 'cleanup' };
  return { action: 'query', memo, ageMin };
}

/** State after the server answered `/api/transfers/check-mine`. */
export function pulseAfterQuery(found: boolean, fulfilled: boolean, ageMin: number): {
  state: PulseState;
  nextMs: number;
  /** First time the order is fulfilled: start the 10-min solid-green window. */
  markFulfilled: boolean;
} {
  if (!found) return { state: ageMin < 20 ? 'blue' : 'red', nextMs: PASSIVE_POLL_MS, markFulfilled: false };
  if (fulfilled) return { state: 'green-solid', nextMs: PASSIVE_POLL_MS, markFulfilled: true };
  const state: PulseState = ageMin < 20 ? 'green' : ageMin < 30 ? 'green-slow' : 'red';
  return { state, nextMs: ACTIVE_POLL_MS, markFulfilled: false };
}
