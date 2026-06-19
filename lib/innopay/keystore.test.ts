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
} from './keystore';

// jsdom provides a real localStorage; reset it between tests.
beforeEach(() => {
  localStorage.clear();
});

describe('saveKeys / getters', () => {
  it('persists only accountName + active + memo and round-trips them', () => {
    saveKeys({ accountName: 'alice', activeKey: 'ACTIVE_WIF', memoKey: 'MEMO_WIF' });
    expect(getAccountName()).toBe('alice');
    expect(getActiveKey()).toBe('ACTIVE_WIF');
    expect(getMemoKey()).toBe('MEMO_WIF');
  });

  it('never writes the forbidden master/posting keys', () => {
    saveKeys({ accountName: 'alice', activeKey: 'ACTIVE_WIF', memoKey: 'MEMO_WIF' });
    for (const k of FORBIDDEN_KEYS) {
      expect(localStorage.getItem(k)).toBeNull();
    }
  });

  it('skips undefined fields rather than clobbering existing values', () => {
    saveKeys({ accountName: 'alice', activeKey: 'ACTIVE_WIF', memoKey: 'MEMO_WIF' });
    // Re-import that omits the memo key must not erase the stored one.
    saveKeys({ accountName: 'alice', activeKey: 'ACTIVE_WIF2' });
    expect(getActiveKey()).toBe('ACTIVE_WIF2');
    expect(getMemoKey()).toBe('MEMO_WIF');
  });

  it('purges any pre-existing forbidden key on the next save (defensive)', () => {
    localStorage.setItem('innopay_masterPassword', 'P5_LEAKED');
    localStorage.setItem('innopay_postingPrivate', 'POSTING_WIF');
    saveKeys({ accountName: 'alice', activeKey: 'ACTIVE_WIF' });
    expect(localStorage.getItem('innopay_masterPassword')).toBeNull();
    expect(localStorage.getItem('innopay_postingPrivate')).toBeNull();
  });
});

describe('hasWallet', () => {
  it('requires BOTH account name and active key (account-only is not a usable local wallet)', () => {
    expect(hasWallet()).toBe(false);

    // Account name alone is not enough — eviction is origin-atomic, so a missing
    // active key means "re-import via Flow 8", not "keep ordering".
    localStorage.setItem(KEYS.accountName, 'alice');
    expect(getActiveKey()).toBeNull();
    expect(hasWallet()).toBe(false);

    // Add the active key → now it's a locally usable wallet.
    localStorage.setItem(KEYS.active, 'ACTIVE_WIF');
    expect(hasWallet()).toBe(true);
  });
});

describe('wallet blob', () => {
  it('saveWalletBlob stores only username + activeKey', () => {
    saveWalletBlob({ username: 'alice', activeKey: 'ACTIVE_WIF' });
    const stored = JSON.parse(localStorage.getItem(KEYS.blob)!);
    expect(stored).toEqual({ username: 'alice', activeKey: 'ACTIVE_WIF' });
  });

  it('loadWalletBlob returns trimmed fields and ignores legacy secrets in the blob', () => {
    localStorage.setItem(
      KEYS.blob,
      JSON.stringify({ username: 'alice', activeKey: 'ACTIVE_WIF', masterPassword: 'P5', postingKey: 'POST' }),
    );
    expect(loadWalletBlob()).toEqual({ username: 'alice', activeKey: 'ACTIVE_WIF' });
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

  it('strips masterPassword/postingKey embedded in a legacy blob, keeping username + activeKey', () => {
    localStorage.setItem(
      KEYS.blob,
      JSON.stringify({ username: 'alice', activeKey: 'ACTIVE_WIF', masterPassword: 'P5', postingKey: 'POST' }),
    );
    purgeForbidden();
    expect(JSON.parse(localStorage.getItem(KEYS.blob)!)).toEqual({
      username: 'alice',
      activeKey: 'ACTIVE_WIF',
    });
  });

  it('is idempotent and leaves a clean blob untouched', () => {
    saveWalletBlob({ username: 'alice', activeKey: 'ACTIVE_WIF' });
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
  it('removes every credential key including forbidden leftovers', () => {
    saveKeys({ accountName: 'alice', activeKey: 'ACTIVE_WIF', memoKey: 'MEMO_WIF' });
    saveWalletBlob({ username: 'alice', activeKey: 'ACTIVE_WIF' });
    localStorage.setItem('innopay_masterPassword', 'P5_LEAKED'); // simulate a stale leftover
    clearCredentials();
    expect(getAccountName()).toBeNull();
    expect(getActiveKey()).toBeNull();
    expect(getMemoKey()).toBeNull();
    expect(localStorage.getItem(KEYS.blob)).toBeNull();
    expect(localStorage.getItem('innopay_masterPassword')).toBeNull();
  });
});
