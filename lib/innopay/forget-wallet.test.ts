// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearWalletStorage, forgetLocalWallet, walletReloadUrl } from './forget-wallet';
import { saveKeys, getActiveKey, getMemoKey, hasWallet, __resetForTest } from './keystore';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  __resetForTest();
});

describe('forget wallet', () => {
  it('clears identity, keys, balance and return markers from storage and memory', async () => {
    await saveKeys({ accountName: 'alice', activeKey: 'test-active', memoKey: 'test-memo' });
    for (const key of ['innopay_lastBalance', 'innopay_balance_trustUntil', 'innopay_latestMemoContent',
      'innopay_orderConfirmedForMemo', 'innopay_debug_last_params', 'innopay_flow_pending', 'innopay_credentialToken', 'innopay_wallet_credentials']) {
      localStorage.setItem(key, 'old');
      sessionStorage.setItem(key, 'old');
    }
    localStorage.setItem('cart', 'keep cart');
    localStorage.setItem('table', '7');
    localStorage.setItem('language', 'fr');
    sessionStorage.setItem('unrelated', 'keep');
    const replace = vi.fn();
    forgetLocalWallet({ localStorage, sessionStorage, location: {
      href: 'https://spoke.example/menu?table=7&credential_token=old&session_id=old&order_success=true#drinks', replace,
    } });
    expect(hasWallet()).toBe(false);
    expect(getActiveKey()).toBeNull();
    expect(getMemoKey()).toBeNull();
    expect(Object.keys(localStorage).sort()).toEqual(['cart', 'language', 'table']);
    expect(Object.keys(sessionStorage)).toEqual(['unrelated']);
    expect(replace).toHaveBeenCalledWith('https://spoke.example/menu?table=7#drinks');
    expect(localStorage.getItem('cart')).toBe('keep cart');
  });

  it('removes forbidden legacy keys and is safe to repeat with no wallet', () => {
    localStorage.setItem('innopay_ownerPrivate', 'legacy');
    localStorage.setItem('innopay_masterPassword', 'legacy');
    localStorage.setItem('innopay_email', 'alice@example.test');
    clearWalletStorage(localStorage);
    clearWalletStorage(localStorage);
    expect(localStorage.length).toBe(0);
  });

  it('strips recovery/payment return signals while preserving page, table, order and language', () => {
    expect(walletReloadUrl('https://spoke.example/menu?table=7&order=abc&lang=en&account_created=true&existing_account=true&topup_success=true&payment=success&flow=7&balance=12&optimistic_balance=12#drinks'))
      .toBe('https://spoke.example/menu?table=7&order=abc&lang=en#drinks');
  });
});
