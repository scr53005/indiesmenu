import { describe, expect, it } from 'vitest';
import {
  RUBIS_CACHE_KEY, SPEND_RUBIS_FIRST_KEY, confirmedRubis, isPaymentReturn, markTeaserShown, readCachedRubis,
  readSpendRubisFirst, readTeaserShown, saveCachedRubis, writeSpendRubisFirst,
} from './rubis';
import { parseTokenBalances } from '../api/token-balances';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    data,
  };
}
const broken = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
};

describe('parseTokenBalances', () => {
  it('reads both tokens from one Hive-Engine answer, in any order', () => {
    expect(parseTokenBalances([
      { symbol: 'RUBIS', balance: '0.35' }, { symbol: 'EURO', balance: '12.50' },
    ])).toEqual({ euro: 12.5, rubis: 0.35 });
  });
  it('treats a RUBIS token never held (no row) as a genuine 0', () => {
    expect(parseTokenBalances([{ symbol: 'EURO', balance: '3.00' }])).toEqual({ euro: 3, rubis: 0 });
  });
  it('reports a missing EURO row as null, so the route keeps its HBD fallback', () => {
    expect(parseTokenBalances([])).toEqual({ euro: null, rubis: 0 });
    expect(parseTokenBalances([{ symbol: 'RUBIS', balance: '1.20' }])).toEqual({ euro: null, rubis: 1.2 });
  });
  it('never yields NaN from a malformed answer', () => {
    expect(parseTokenBalances(undefined)).toEqual({ euro: null, rubis: 0 });
    expect(parseTokenBalances([{ symbol: 'RUBIS', balance: 'oops' }, { symbol: 'EURO', balance: 'x' }]))
      .toEqual({ euro: null, rubis: 0 });
  });
});

describe('confirmedRubis', () => {
  it('trusts only a fresh read from /api/balance/euro', () => {
    expect(confirmedRubis('hive-engine', 0)).toBe(0);
    expect(confirmedRubis('hive-hbd-conversion', 0.35)).toBe(0.35);
    // HBD fallback after every Hive-Engine node failed: RUBIS unknown.
    expect(confirmedRubis('hive-hbd-conversion', null)).toBeNull();
  });
  it('never trusts cached, trust-window or optimistic values', () => {
    for (const source of ['localStorage-cache', 'trust-window', 'optimistic-update', null]) {
      expect(confirmedRubis(source, 0)).toBeNull();
    }
  });
});

describe('Spend RUBIS first preference', () => {
  it('defaults to checked and round-trips an explicit choice', () => {
    const storage = memoryStorage();
    expect(readSpendRubisFirst(storage)).toBe(true);
    writeSpendRubisFirst(storage, false);
    expect(storage.data.get(SPEND_RUBIS_FIRST_KEY)).toBe('0');
    expect(readSpendRubisFirst(storage)).toBe(false);
    writeSpendRubisFirst(storage, true);
    expect(readSpendRubisFirst(storage)).toBe(true);
  });
  it('falls back to the default when storage is blocked', () => {
    expect(readSpendRubisFirst(broken)).toBe(true);
    expect(() => writeSpendRubisFirst(broken, false)).not.toThrow();
  });
});

describe('teaser session flag', () => {
  it('plays once per session', () => {
    const storage = memoryStorage();
    expect(readTeaserShown(storage)).toBe(false);
    markTeaserShown(storage);
    expect(readTeaserShown(storage)).toBe(true);
  });
  it('skips the teaser rather than repeat it when storage is blocked', () => {
    expect(readTeaserShown(broken)).toBe(true);
    expect(() => markTeaserShown(broken)).not.toThrow();
  });
});

describe('RUBIS cache', () => {
  it('round-trips a balance and ignores missing or invalid values', () => {
    const storage = memoryStorage();
    expect(readCachedRubis(storage)).toBeNull();
    saveCachedRubis(storage, 0.35);
    expect(readCachedRubis(storage)).toBe(0.35);
    expect(readCachedRubis(memoryStorage({ [RUBIS_CACHE_KEY]: 'x' }))).toBeNull();
    expect(readCachedRubis(memoryStorage({ [RUBIS_CACHE_KEY]: '-1' }))).toBeNull();
    expect(readCachedRubis(broken)).toBeNull();
  });
});

describe('isPaymentReturn', () => {
  it('recognises a hub return, but not ordinary menu links', () => {
    expect(isPaymentReturn('?table=4&payment=success')).toBe(true);
    expect(isPaymentReturn('?credential_token=abc')).toBe(true);
    expect(isPaymentReturn('?table=4')).toBe(false);
    expect(isPaymentReturn('')).toBe(false);
  });
});
