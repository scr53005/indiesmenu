import { describe, expect, it, vi } from 'vitest';
import {
  applyHubReturn, isAllowedWalletOrigin, looksLikeActiveWif, parseWalletMessage,
  type HubCredentials, type ReturnDeps,
} from './apply-return';
import { classifyReturn, FLOW_MARKER_KEY } from './payment-return';
import { initialPaymentState, paymentReducer, type PaymentEvent, type PaymentState } from './paymentStateMachine';

const ACTIVE = '5' + 'K'.repeat(50);
const CREDS: HubCredentials = {
  accountName: 'test000-000-067', euroBalance: 4.2,
  keys: { active: { privateKey: ACTIVE }, memo: { privateKey: '5memo' } },
};
const NOW = 1_000_000;

function setup(opts: { credentials?: HubCredentials | null | 'throw'; account?: string | null; store?: Record<string, string> } = {}) {
  const store = new Map(Object.entries(opts.store ?? {}));
  const events: PaymentEvent[] = [];
  const timers: { fn: () => void; ms: number }[] = [];
  const deps: ReturnDeps = {
    dispatch: (e) => { events.push(e); },
    fetchCredentials: vi.fn(async () => {
      if (opts.credentials === 'throw') throw new TypeError('Failed to fetch');
      return opts.credentials === undefined ? CREDS : opts.credentials;
    }),
    saveKeys: vi.fn(async () => {}),
    getAccountName: () => (opts.account === undefined ? null : opts.account),
    storage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => { store.set(k, v); },
      removeItem: (k) => { store.delete(k); },
    },
    now: () => NOW,
    later: (fn, ms) => { timers.push({ fn, ms }); },
    clearCart: vi.fn(),
    startOrderPulsing: vi.fn(),
    showWallet: vi.fn(),
    refetchBalance: vi.fn(),
    cleanUrl: vi.fn(),
    reload: vi.fn(),
    messages: { credentialsFailed: 'KEYS FAILED' },
  };
  const state = (): PaymentState => events.reduce(paymentReducer, initialPaymentState);
  const runTimers = () => { for (const t of timers.splice(0)) t.fn(); };
  return { deps, store, events, timers, state, runTimers };
}

/** Classify a hub return URL the way usePaymentReturn does, then apply it. */
async function returnTo(query: string, env: ReturnType<typeof setup>, hasLocalAccount = false) {
  const ret = classifyReturn(new URLSearchParams(query), env.store.get(FLOW_MARKER_KEY) ?? null, hasLocalAccount);
  await applyHubReturn(ret, env.deps);
}

describe('applyHubReturn — one case per return', () => {
  it('no return: nothing happens', async () => {
    const env = setup();
    await returnTo('table=7', env);
    expect(env.events).toEqual([]);
    expect(env.deps.cleanUrl).not.toHaveBeenCalled();
  });

  it('Stripe cancel: URL cleaned, cart kept, no banner', async () => {
    const env = setup();
    await returnTo('table=7&payment=cancelled', env);
    expect(env.deps.cleanUrl).toHaveBeenCalled();
    expect(env.deps.clearCart).not.toHaveBeenCalled();
    expect(env.state()).toEqual({ status: 'idle' });
  });

  // R4c (planned 2026-11-06): an order abandoned at Stripe kept the MiniWallet pulsing for 2 h, and
  // paying the same cart again tripped the duplicate-order modal.
  it('Stripe cancel forgets the stored order, the waiter flag and the flow marker', async () => {
    const env = setup({ store: {
      innopay_latestMemoContent: 'memo-x', innopay_latestMemoDateTime: '123',
      innopay_waiter_call_pending: '7', [FLOW_MARKER_KEY]: 'flow5_create_and_pay', cart: '[1]',
    } });
    await returnTo('table=7&payment=cancelled', env);
    for (const key of ['innopay_latestMemoContent', 'innopay_latestMemoDateTime', 'innopay_waiter_call_pending', FLOW_MARKER_KEY]) {
      expect(env.store.has(key), key).toBe(false);
    }
    expect(env.store.get('cart')).toBe('[1]');
  });

  // R4c: a waiter call paid through the hub (Q-R4-2: Flow 7 when the balance is short) used to
  // empty the cart and say "order sent".
  it('waiter call back from Flow 7: cart kept, waiter banner, no pulse', async () => {
    const env = setup({ account: 'alice', store: { [FLOW_MARKER_KEY]: 'flow7_topup_and_pay', innopay_waiter_call_pending: '7', cart: '[1]', innopay_latestMemoContent: 'm' } });
    await returnTo('order_success=true&flow=7&session_id=cs&credential_pending=true&optimistic_balance=14.98', env, true);
    expect(env.deps.clearCart).not.toHaveBeenCalled();
    expect(env.store.get('cart')).toBe('[1]');
    expect(env.state()).toEqual({ status: 'waiter_called', table: '7' });
    expect(env.deps.startOrderPulsing).not.toHaveBeenCalled();
    expect(env.store.has('innopay_waiter_call_pending')).toBe(false);
    expect(env.deps.showWallet).toHaveBeenCalledWith({ accountName: 'alice', euroBalance: 14.98 });
  });

  it('waiter call back from Flow 5 (new account): keys saved, cart kept, waiter banner', async () => {
    const env = setup({ store: { [FLOW_MARKER_KEY]: 'flow5_create_and_pay', innopay_waiter_call_pending: '12', cart: '[1]' } });
    await returnTo('account_created=true&session_id=cs_9', env);
    expect(env.deps.saveKeys).toHaveBeenCalled();
    expect(env.deps.clearCart).not.toHaveBeenCalled();
    expect(env.state()).toEqual({ status: 'waiter_called', table: '12' });
  });

  it('Flow 3 guest paid: yellow "awaiting the chain", cart kept until the poll confirms', async () => {
    const env = setup();
    await returnTo('table=7&payment=success&session_id=cs_1', env);
    expect(env.state()).toEqual({ status: 'processing', flow: 3, step: 'awaitingChain', sessionId: 'cs_1' });
    expect(env.deps.clearCart).not.toHaveBeenCalled();
    expect(env.deps.cleanUrl).toHaveBeenCalled();
  });

  it('Flow 7 on this phone with the hub balance: cart cleared, balance trusted, green, pulse', async () => {
    const env = setup({ account: 'alice', store: { [FLOW_MARKER_KEY]: 'flow7_topup_and_pay', innopay_latestMemoContent: 'memo-1', cart: '[1]' } });
    await returnTo('order_success=true&flow=7&session_id=cs&credential_pending=true&optimistic_balance=3.50', env, true);
    expect(env.deps.fetchCredentials).not.toHaveBeenCalled();
    expect(env.deps.clearCart).toHaveBeenCalled();
    expect(env.store.get('cart')).toBe('[]');
    expect(env.store.has(FLOW_MARKER_KEY)).toBe(false);
    expect(env.store.get('innopay_lastBalance')).toBe('3.50');
    expect(env.store.get('innopay_balance_trustUntil')).toBe(String(NOW + 12_000));
    expect(env.deps.showWallet).toHaveBeenCalledWith({ accountName: 'alice', euroBalance: 3.5 });
    expect(env.state()).toEqual({ status: 'success', flow: 7, banner: 'orderSent' });
    expect(env.deps.startOrderPulsing).toHaveBeenCalledWith('memo-1');
  });

  it('Flow 7 on this phone without a hub balance: no 0.00 placeholder, chain read after 12 s', async () => {
    const env = setup({ account: 'alice', store: { [FLOW_MARKER_KEY]: 'flow7_topup_and_pay' } });
    await returnTo('order_success=true&credential_token=ct&flow=7', env, true);
    expect(env.deps.showWallet).not.toHaveBeenCalled();
    expect(env.timers.map(t => t.ms)).toEqual([12_000]);
    env.runTimers();
    expect(env.deps.refetchBalance).toHaveBeenCalled();
  });

  it('Flow 7 on a phone without the keys: keys fetched and saved, hub balance trusted', async () => {
    const env = setup({ store: { innopay_latestMemoContent: 'memo-7' } });
    await returnTo('order_success=true&credential_token=ct&flow=7&optimistic_balance=2', env);
    expect(env.deps.fetchCredentials).toHaveBeenCalledWith({ credentialToken: 'ct', sessionId: null });
    expect(env.deps.saveKeys).toHaveBeenCalledWith({ accountName: CREDS.accountName, activeKey: ACTIVE, memoKey: '5memo' });
    expect(env.deps.showWallet).toHaveBeenCalledWith({ accountName: CREDS.accountName, euroBalance: 2 });
    expect(env.state()).toEqual({ status: 'success', flow: 7, banner: 'orderSent' });
    expect(env.deps.startOrderPulsing).toHaveBeenCalledWith('memo-7');
  });

  it('Flow 5 new account: keys saved, balance settles, cart cleared, green, pulse', async () => {
    const env = setup({ store: { [FLOW_MARKER_KEY]: 'flow5_create_and_pay', innopay_latestMemoContent: 'memo-5' } });
    await returnTo('table=7&account_created=true&session_id=cs_2', env);
    expect(env.deps.saveKeys).toHaveBeenCalled();
    expect(env.store.get('innopay_lastBalance')).toBe('4.20');
    expect(env.store.get('innopay_flow6_cooldown_until')).toBe(String(NOW + 12_000));
    expect(env.deps.clearCart).toHaveBeenCalled();
    expect(env.store.has(FLOW_MARKER_KEY)).toBe(false);
    expect(env.state()).toEqual({ status: 'success', flow: 5, banner: 'orderSent' });
    expect(env.deps.startOrderPulsing).toHaveBeenCalledWith('memo-5');
    expect(env.deps.cleanUrl).toHaveBeenCalled();
  });

  it('Flow 5, account the hub already knew, paid by the hub: green + pulse (was a 5 s yellow)', async () => {
    const env = setup({ store: { [FLOW_MARKER_KEY]: 'flow5_create_and_pay', innopay_latestMemoContent: 'memo-5e' } });
    await returnTo('order_success=true&existing_account=true&credential_token=ct&flow=6&table=7', env);
    expect(env.deps.clearCart).toHaveBeenCalled();
    expect(env.state()).toEqual({ status: 'success', flow: 5, banner: 'orderSent' });
    expect(env.deps.startOrderPulsing).toHaveBeenCalledWith('memo-5e');
  });

  // Regression guard (2026-11-07): the MiniWallet showed 0.00 € (the hub's credential-session
  // placeholder) until the next refresh.
  it('Flow 5 → 6: the balance after the order is shown at once, never the session placeholder', async () => {
    const env = setup({ credentials: { ...CREDS, euroBalance: 0 }, store: { [FLOW_MARKER_KEY]: 'flow5_create_and_pay' } });
    await returnTo('order_success=true&existing_account=true&credential_token=ct&flow=6&optimistic_balance=17.50', env);
    expect(env.deps.showWallet).toHaveBeenCalledWith({ accountName: CREDS.accountName, euroBalance: 17.5 });
    expect(env.store.get('innopay_lastBalance')).toBe('17.50');
    expect(env.store.get('innopay_balance_trustUntil')).toBe(String(NOW + 12_000));
  });

  it('Flow 5 → 6 without a balance from the hub: no 0.00, the chain is read now and after 12 s', async () => {
    const env = setup({ credentials: { ...CREDS, euroBalance: 0 }, store: { [FLOW_MARKER_KEY]: 'flow5_create_and_pay' } });
    await returnTo('order_success=true&existing_account=true&credential_token=ct&flow=6', env);
    expect(env.deps.showWallet).not.toHaveBeenCalled();
    expect(env.deps.refetchBalance).toHaveBeenCalledTimes(1);
    expect(env.timers.map(t => t.ms)).toEqual([12_000]);
    env.runTimers();
    expect(env.deps.refetchBalance).toHaveBeenCalledTimes(2);
    expect(env.state()).toEqual({ status: 'success', flow: 5, banner: 'orderSent' });
  });

  it('variant 5b: Flow 5 found an underfunded account, topped up via Flow 7: keys fetched, green, pulse', async () => {
    const env = setup({ store: { [FLOW_MARKER_KEY]: 'flow5_create_and_pay', innopay_latestMemoContent: 'memo-5b' } });
    await returnTo('table=7&order_success=true&flow=7&session_id=cs&credential_pending=true&optimistic_balance=1.30', env);
    expect(env.deps.fetchCredentials).toHaveBeenCalledWith({ credentialToken: null, sessionId: 'cs' });
    expect(env.deps.showWallet).toHaveBeenCalledWith({ accountName: CREDS.accountName, euroBalance: 1.3 });
    expect(env.deps.clearCart).toHaveBeenCalled();
    expect(env.store.has(FLOW_MARKER_KEY)).toBe(false);
    expect(env.state()).toEqual({ status: 'success', flow: 7, banner: 'orderSent' });
    expect(env.deps.startOrderPulsing).toHaveBeenCalledWith('memo-5b');
  });

  it('Flow 4 account only (variant B, credential_token): wallet ready, cart kept', async () => {
    const env = setup({ store: { [FLOW_MARKER_KEY]: 'flow5_create_and_pay' } });
    await returnTo('credential_token=ct&account_created=true&flow=4', env);
    expect(env.deps.clearCart).not.toHaveBeenCalled();
    expect(env.store.has(FLOW_MARKER_KEY)).toBe(false);
    expect(env.deps.showWallet).toHaveBeenCalledWith({ accountName: CREDS.accountName, euroBalance: 4.2 });
    expect(env.state()).toEqual({ status: 'success', flow: 4, banner: 'walletReady' });
  });

  it('account created with no marker (legacy): blue banner, then a reload', async () => {
    const env = setup();
    await returnTo('account_created=true&session_id=cs_2', env);
    expect(env.state()).toEqual({ status: 'account_created', flow: 4, accountName: CREDS.accountName, euroBalance: 4.2 });
    expect(env.deps.clearCart).toHaveBeenCalled();
    env.runTimers();
    expect(env.deps.reload).toHaveBeenCalled();
  });

  it('credential fetch fails (or throws): error banner, nothing saved, URL kept for a reload', async () => {
    for (const credentials of [null, 'throw'] as const) {
      const env = setup({ credentials, store: { [FLOW_MARKER_KEY]: 'flow5_create_and_pay' } });
      await returnTo('account_created=true&session_id=cs_2', env);
      expect(env.state()).toEqual({ status: 'error', flow: 5, error: 'KEYS FAILED', canRetry: false, reason: 'failed' });
      expect(env.deps.saveKeys).not.toHaveBeenCalled();
      expect(env.deps.clearCart).not.toHaveBeenCalled();
      expect(env.deps.cleanUrl).not.toHaveBeenCalled();
    }
  });

  it('Flow 5 via api/checkout/account (topup_success + session): handled as Flow 5, hub amount as balance', async () => {
    const env = setup({ store: { innopay_latestMemoContent: 'memo-5c' } });
    await returnTo('table=7&topup_success=true&session_id=cs&amount=7.5&flow=create_account_and_pay', env);
    expect(env.deps.fetchCredentials).toHaveBeenCalledWith({ credentialToken: null, sessionId: 'cs' });
    expect(env.store.get('innopay_lastBalance')).toBe('7.50');
    expect(env.deps.clearCart).toHaveBeenCalled();
    expect(env.state()).toEqual({ status: 'success', flow: 5, banner: 'orderSent' });
    expect(env.deps.startOrderPulsing).toHaveBeenCalledWith('memo-5c');
    expect(env.deps.reload).not.toHaveBeenCalled();
  });

  it('Flow 4 via api/checkout/account: wallet ready, cart kept', async () => {
    const env = setup();
    await returnTo('topup_success=true&session_id=cs&amount=20&flow=create_account_only', env);
    expect(env.deps.clearCart).not.toHaveBeenCalled();
    expect(env.deps.showWallet).toHaveBeenCalledWith({ accountName: CREDS.accountName, euroBalance: 20 });
    expect(env.state()).toEqual({ status: 'success', flow: 4, banner: 'walletReady' });
  });

  it('topup_success without a session (Flows 1/2 are hub-only): nothing happens', async () => {
    const env = setup();
    await returnTo('table=7&topup_success=true&amount=10', env, true);
    expect(env.events).toEqual([]);
    expect(env.timers).toEqual([]);
  });
});

describe('popup hand-off (postMessage from wallet.innopay.lu)', () => {
  it('only the hub origins are accepted', () => {
    expect(isAllowedWalletOrigin('https://wallet.innopay.lu', 'indies.innopay.lu')).toBe(true);
    expect(isAllowedWalletOrigin('http://localhost:3000', 'localhost')).toBe(true);
    expect(isAllowedWalletOrigin('http://192.168.178.55:3000', '192.168.178.55')).toBe(true);
    expect(isAllowedWalletOrigin('https://evil.example', 'indies.innopay.lu')).toBe(false);
    expect(isAllowedWalletOrigin('http://192.168.178.99:3000', '192.168.178.55')).toBe(false);
  });

  it('reads both message types and both name fields', () => {
    expect(parseWalletMessage({ type: 'INNOPAY_ACCOUNT_CREATED', accountName: 'a', activeKey: ACTIVE, euroBalance: 5 }))
      .toEqual({ accountName: 'a', activeKey: ACTIVE, euroBalance: 5 });
    expect(parseWalletMessage({ type: 'INNOPAY_WALLET_CREATED', username: 'b' }))
      .toEqual({ accountName: 'b', activeKey: null, euroBalance: 0 });
  });

  it('never keeps a master password sent in place of the active key', () => {
    expect(parseWalletMessage({ type: 'INNOPAY_ACCOUNT_CREATED', accountName: 'a', activeKey: 'P5' + 'x'.repeat(49) })?.activeKey).toBeNull();
    expect(looksLikeActiveWif(ACTIVE)).toBe(true);
    expect(looksLikeActiveWif('5short')).toBe(false);
  });

  it('ignores other messages', () => {
    expect(parseWalletMessage(null)).toBeNull();
    expect(parseWalletMessage('hello')).toBeNull();
    expect(parseWalletMessage({ type: 'OTHER', accountName: 'a' })).toBeNull();
    expect(parseWalletMessage({ type: 'INNOPAY_ACCOUNT_CREATED' })).toBeNull();
  });
});
