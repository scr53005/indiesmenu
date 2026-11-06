import { describe, expect, it } from 'vitest';
import { SETTLE_KEYS, SETTLE_MS, startBalanceSettling } from './balance-settle';

function memoryStorage() {
  const data = new Map<string, string>();
  return { data, setItem: (k: string, v: string) => { data.set(k, v); } };
}

describe('startBalanceSettling', () => {
  it('stores the hub balance with a fresh timestamp and opens trust + cooldown windows', () => {
    const s = memoryStorage();
    const until = startBalanceSettling(s, 11.5, 1_000);
    expect(until).toBe(1_000 + SETTLE_MS);
    expect(s.data.get(SETTLE_KEYS.balance)).toBe('11.50');
    expect(s.data.get(SETTLE_KEYS.timestamp)).toBe('1000');
    expect(s.data.get(SETTLE_KEYS.trustUntil)).toBe(String(until));
    expect(s.data.get(SETTLE_KEYS.cooldownUntil)).toBe(String(until));
  });

  it('accepts a numeric string from the hub JSON', () => {
    const s = memoryStorage();
    startBalanceSettling(s, '7.3', 0);
    expect(s.data.get(SETTLE_KEYS.balance)).toBe('7.30');
  });

  it('falls back to 0.00 for a missing or garbage balance instead of writing NaN', () => {
    const s = memoryStorage();
    startBalanceSettling(s, undefined, 0);
    expect(s.data.get(SETTLE_KEYS.balance)).toBe('0.00');
    startBalanceSettling(s, 'abc', 0);
    expect(s.data.get(SETTLE_KEYS.balance)).toBe('0.00');
  });

  it('uses the keys useBalance and the page cooldown tick read', () => {
    expect(SETTLE_KEYS).toEqual({
      balance: 'innopay_lastBalance',
      timestamp: 'innopay_lastBalance_timestamp',
      trustUntil: 'innopay_balance_trustUntil',
      cooldownUntil: 'innopay_flow6_cooldown_until',
    });
  });
});
