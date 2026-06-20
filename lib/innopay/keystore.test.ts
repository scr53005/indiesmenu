import { describe, it, expect, beforeEach } from 'vitest';
import {
  KEYS,
  FORBIDDEN_KEYS,
  saveKeys,
  getAccountName,
  getActiveKey,
  getMemoKey,
  hasWallet,
  saveWalletBlob,
  loadWalletBlob,
  purgeForbidden,
  clearCredentials,
  isCiphertextEnvelope,
  bytesToBase64,
  base64ToBytes,
  __resetForTest,
} from './keystore';

// jsdom provides a real localStorage but no IndexedDB / SubtleCrypto, so these
// tests exercise the PLAINTEXT-fallback mode (Phase-0-equivalent behaviour).
// The encrypted path (round-trip + envelope) is covered in keystore-crypto.test.ts.
beforeEach(() => {
  localStorage.clear();
  __resetForTest();
});

describe('saveKeys / getters', () => {
  it('persists only accountName + active + memo and round-trips them', async () => {
    await saveKeys({ accountName: 'alice', activeKey: 'ACTIVE_WIF', memoKey: 'MEMO_WIF' });
    expect(getAccountName()).toBe('alice');
    expect(getActiveKey()).toBe('ACTIVE_WIF');
    expect(getMemoKey()).toBe('MEMO_WIF');
  });

  it('never writes the forbidden master/posting keys', async () => {
    await saveKeys({ accountName: 'alice', activeKey: 'ACTIVE_WIF', memoKey: 'MEMO_WIF' });
    for (const k of FORBIDDEN_KEYS) {
      expect(localStorage.getItem(k)).toBeNull();
    }
  });

  it('skips undefined fields rather than clobbering existing values', async () => {
    await saveKeys({ accountName: 'alice', activeKey: 'ACTIVE_WIF', memoKey: 'MEMO_WIF' });
    // Re-import that omits the memo key must not erase the stored one.
    await saveKeys({ accountName: 'alice', activeKey: 'ACTIVE_WIF2' });
    expect(getActiveKey()).toBe('ACTIVE_WIF2');
    expect(getMemoKey()).toBe('MEMO_WIF');
  });

  it('purges any pre-existing forbidden key on the next save (defensive)', async () => {
    localStorage.setItem('innopay_masterPassword', 'P5_LEAKED');
    localStorage.setItem('innopay_postingPrivate', 'POSTING_WIF');
    await saveKeys({ accountName: 'alice', activeKey: 'ACTIVE_WIF' });
    expect(localStorage.getItem('innopay_masterPassword')).toBeNull();
    expect(localStorage.getItem('innopay_postingPrivate')).toBeNull();
  });
});

describe('hasWallet', () => {
  it('requires BOTH account name and a stored active key (presence-based)', () => {
    expect(hasWallet()).toBe(false);

    localStorage.setItem(KEYS.accountName, 'alice');
    expect(getActiveKey()).toBeNull(); // cache empty (no unlock ran)
    expect(hasWallet()).toBe(false);

    localStorage.setItem(KEYS.active, 'ACTIVE_WIF');
    expect(hasWallet()).toBe(true);
  });
});

describe('wallet blob (trimmed to { username } — §9.8)', () => {
  it('saveWalletBlob stores only the username (no activeKey)', () => {
    saveWalletBlob({ username: 'alice' });
    const stored = JSON.parse(localStorage.getItem(KEYS.blob)!);
    expect(stored).toEqual({ username: 'alice' });
  });

  it('loadWalletBlob returns only username, ignoring any legacy activeKey/secrets', () => {
    localStorage.setItem(
      KEYS.blob,
      JSON.stringify({ username: 'alice', activeKey: 'ACTIVE_WIF', masterPassword: 'P5', postingKey: 'POST' }),
    );
    expect(loadWalletBlob()).toEqual({ username: 'alice' });
  });

  it('loadWalletBlob returns null for missing or malformed blobs', () => {
    expect(loadWalletBlob()).toBeNull();
    localStorage.setItem(KEYS.blob, 'not json');
    expect(loadWalletBlob()).toBeNull();
  });
});

describe('purgeForbidden', () => {
  it('removes the forbidden keys', () => {
    localStorage.setItem('innopay_masterPassword', 'P5_LEAKED');
    localStorage.setItem('innopay_postingPrivate', 'POSTING_WIF');
    purgeForbidden();
    expect(localStorage.getItem('innopay_masterPassword')).toBeNull();
    expect(localStorage.getItem('innopay_postingPrivate')).toBeNull();
  });

  it('strips masterPassword/postingKey/activeKey from a legacy blob, keeping only username', () => {
    localStorage.setItem(
      KEYS.blob,
      JSON.stringify({ username: 'alice', activeKey: 'ACTIVE_WIF', masterPassword: 'P5', postingKey: 'POST' }),
    );
    purgeForbidden();
    expect(JSON.parse(localStorage.getItem(KEYS.blob)!)).toEqual({ username: 'alice' });
  });

  it('is idempotent and leaves a clean { username } blob untouched', () => {
    saveWalletBlob({ username: 'alice' });
    const before = localStorage.getItem(KEYS.blob);
    purgeForbidden();
    purgeForbidden();
    expect(localStorage.getItem(KEYS.blob)).toBe(before);
  });

  it('leaves a malformed blob alone instead of throwing', () => {
    localStorage.setItem(KEYS.blob, '{ broken json');
    expect(() => purgeForbidden()).not.toThrow();
    expect(localStorage.getItem(KEYS.blob)).toBe('{ broken json');
  });
});

describe('clearCredentials', () => {
  it('removes every credential key including forbidden leftovers and clears the cache', async () => {
    await saveKeys({ accountName: 'alice', activeKey: 'ACTIVE_WIF', memoKey: 'MEMO_WIF' });
    saveWalletBlob({ username: 'alice' });
    localStorage.setItem('innopay_masterPassword', 'P5_LEAKED'); // simulate a stale leftover
    clearCredentials();
    expect(getAccountName()).toBeNull();
    expect(getActiveKey()).toBeNull(); // in-memory cache nulled too
    expect(getMemoKey()).toBeNull();
    expect(localStorage.getItem(KEYS.blob)).toBeNull();
    expect(localStorage.getItem('innopay_masterPassword')).toBeNull();
  });
});

describe('envelope + base64 helpers (pure)', () => {
  it('detects the enc:v1: ciphertext envelope prefix', () => {
    expect(isCiphertextEnvelope('enc:v1:aXY=:Y3Q=')).toBe(true);
    expect(isCiphertextEnvelope('5JphiHDeadbeefPlainWif')).toBe(false);
    expect(isCiphertextEnvelope('')).toBe(false);
    expect(isCiphertextEnvelope(null)).toBe(false);
    expect(isCiphertextEnvelope(undefined)).toBe(false);
  });

  it('round-trips arbitrary bytes through base64', () => {
    const samples: Uint8Array[] = [
      new Uint8Array([]),
      new Uint8Array([0, 1, 2, 254, 255]),
      new Uint8Array([12, 34, 56, 78, 90, 123, 200, 255, 0, 1]),
      new Uint8Array(Array.from({ length: 64 }, (_, i) => (i * 7) % 256)),
    ];
    for (const bytes of samples) {
      expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
    }
  });
});
