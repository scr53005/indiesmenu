// Balance "settling" window after the hub has just moved money for this customer.
//
// Right after a payment or an account creation, Hive-Engine does not report the new balance yet
// (Hive block ~3 s + sidechain indexing 3-10 s); a freshly created account even reads as 0.00.
// During the window, useBalance serves the balance the hub reported (trust window) instead of
// asking the chain, the order button shows the cooldown, and when the window ends the cooldown
// tick in app/menu/page.tsx refetches from the chain. Flow 6 has used the same keys since 2026-03.
export const SETTLE_MS = 12_000;

export const SETTLE_KEYS = {
  balance: 'innopay_lastBalance',
  timestamp: 'innopay_lastBalance_timestamp',
  trustUntil: 'innopay_balance_trustUntil',
  cooldownUntil: 'innopay_flow6_cooldown_until',
} as const;

/** Records the hub-reported balance and opens the settling window. Returns its end (ms epoch). */
export function startBalanceSettling(
  storage: Pick<Storage, 'setItem'>,
  hubBalance: unknown,
  now: number,
  ms: number = SETTLE_MS,
): number {
  const balance = Number(hubBalance);
  const until = now + ms;
  storage.setItem(SETTLE_KEYS.balance, (Number.isFinite(balance) ? balance : 0).toFixed(2));
  storage.setItem(SETTLE_KEYS.timestamp, now.toString());
  storage.setItem(SETTLE_KEYS.trustUntil, until.toString());
  storage.setItem(SETTLE_KEYS.cooldownUntil, until.toString());
  return until;
}
