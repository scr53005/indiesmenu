import { describe, expect, it, vi } from 'vitest';
import { PrivateKey, Signature, cryptoUtils } from '@hiveio/dhive';
import { handoffMessage } from './handoff';
import {
  payFromAccount, startCreateAccount, startGuestCheckout, type ActionDeps, type Purchase,
} from './payment-actions';
import { FLOW_MARKER_KEY, WAITER_PENDING_KEY } from './payment-return';
import { initialPaymentState, paymentReducer, type PaymentEvent, type PaymentState } from './paymentStateMachine';

const HUB = 'http://hub';
const ORDER: Purchase = { kind: 'order', amountEuro: '12.50', cartMemo: 'b:7 TABLE 4', noDiscountEuro: '13.00', discount: '0.50' };
const WAITER: Purchase = { kind: 'waiter', reasonEncoded: 'eau' };
const NOW = 5_000_000;
// A real (test-only) active key: the Flow 7 hand-off signs with it.
const ACTIVE = PrivateKey.fromLogin('alice', 'test-password-not-real', 'active').toString();

/** A canned hub answer, a thrown error, or 'hang': a hub that never answers (until aborted). */
type Reply = { status?: number; body?: unknown } | Error | 'hang';

/** Never resolves; rejects with an AbortError when the caller's time limit aborts it. */
function hang(init?: RequestInit): Promise<Response> {
  return new Promise((_, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
  });
}

function setup(opts: {
  account?: string | null; activeKey?: string | null; store?: Record<string, string>;
  chainBalance?: number | null; sign?: Reply; forward?: Reply; guest?: Reply; health?: Reply; duplicate?: boolean;
} = {}) {
  const store = new Map(Object.entries(opts.store ?? {}));
  const events: PaymentEvent[] = [];
  const calls: { url: string; body?: any }[] = [];
  const reply = (r: Reply | undefined, fallback: unknown, init?: RequestInit): Promise<Response> | Response => {
    if (r === 'hang') return hang(init);
    if (r instanceof Error) throw r;
    const status = r?.status ?? 200;
    const body = r?.body ?? fallback;
    return { ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
  };
  const deps: ActionDeps = {
    dispatch: (e) => { events.push(e); },
    hubUrl: HUB, origin: 'http://menu', table: '4', recipient: 'indies-test',
    http: vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.startsWith('/api/balance/euro')) {
        if (opts.chainBalance === null) throw new TypeError('Failed to fetch');
        return reply({ body: { balance: opts.chainBalance ?? 20 } }, null);
      }
      if (url.endsWith('/api/health')) return reply(opts.health, { ok: true }, init);
      if (url.endsWith('/api/sign-and-broadcast')) return reply(opts.sign, { txId: 'tx-1' }, init);
      if (url.endsWith('/api/wallet-payment')) return reply(opts.forward, { success: true }, init);
      if (url.endsWith('/api/checkout/guest')) return reply(opts.guest, { url: 'https://stripe/cs_1' }, init);
      throw new Error('unexpected ' + url);
    }),
    storage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => { store.set(k, v); },
      removeItem: (k) => { store.delete(k); },
    },
    now: () => NOW,
    newSuffix: (tag) => `${tag ?? 'kcs'}-inno-abcd-efgh`,
    claimOrder: vi.fn(() => !opts.duplicate),
    navigate: vi.fn(),
    getAccountName: () => (opts.account === undefined ? 'alice' : opts.account),
    getActiveKey: () => (opts.activeKey === undefined ? ACTIVE : opts.activeKey),
    clearCart: vi.fn(),
    startOrderPulsing: vi.fn(),
    showWallet: vi.fn(),
    messages: { connection: 'CONNECTION', failed: 'FAILED', technicalProblem: 'TECH', notForwarded: 'NOT FORWARDED', guestTimeout: 'TIMEOUT' },
  };
  const state = (): PaymentState => events.reduce(paymentReducer, initialPaymentState);
  const call = (suffix: string) => calls.find((c) => c.url.endsWith(suffix));
  return { deps, store, events, calls, call, state };
}

describe('payFromAccount: Flow 6', () => {
  it('order paid on the page: customer leg signed, hub pays, cart cleared, balance trusted, green, pulse', async () => {
    const env = setup({ chainBalance: 20 });
    expect(await payFromAccount(ORDER, env.deps)).toBe(true);
    const signed = env.call('/api/sign-and-broadcast')!.body;
    expect(signed.activePrivateKey).toBe(ACTIVE);
    expect(JSON.parse(signed.operation.json).contractPayload).toMatchObject({ symbol: 'EURO', to: 'innopay', quantity: '12.50', memo: 'b:7 TABLE 4 kcs-inno-abcd-efgh' });
    // The hub appends the reference to orderMemo itself; no EUR/USD rate any more (the hub fetches it).
    expect(env.call('/api/wallet-payment')!.body).toEqual({
      customerAccount: 'alice', customerTxId: 'tx-1', recipient: 'indies-test',
      amountEuro: '12.50', orderMemo: 'b:7 TABLE 4', distriateSuffix: 'kcs-inno-abcd-efgh',
    });
    expect(env.deps.claimOrder).toHaveBeenCalledWith('b:7 TABLE 4 kcs-inno-abcd-efgh');
    expect(env.deps.showWallet).toHaveBeenCalledWith({ accountName: 'alice', euroBalance: 7.5 });
    expect(env.deps.clearCart).toHaveBeenCalled();
    expect(env.store.get('innopay_lastBalance')).toBe('7.50');
    expect(env.store.get('innopay_flow6_cooldown_until')).toBe(String(NOW + 12_000));
    expect(env.state()).toEqual({ status: 'success', flow: 6, banner: 'orderSent' });
    expect(env.deps.startOrderPulsing).toHaveBeenCalled();
  });

  it('no local active key (mixed posture): the hub signs with innopay authority', async () => {
    const env = setup({ activeKey: null });
    await payFromAccount(ORDER, env.deps);
    expect(env.call('/api/sign-and-broadcast')!.body).toMatchObject({ useInnopayAuthority: true, accountName: 'alice' });
  });

  it('no account on this phone: nothing happens, the caller offers the other ways to pay', async () => {
    const env = setup({ account: null });
    expect(await payFromAccount(ORDER, env.deps)).toBe(false);
    expect(env.events).toEqual([]);
  });

  it('duplicate order: modal (claimOrder false), nothing signed, machine back to idle', async () => {
    const env = setup({ duplicate: true });
    await payFromAccount(ORDER, env.deps);
    expect(env.call('/api/sign-and-broadcast')).toBeUndefined();
    expect(env.state()).toEqual({ status: 'idle' });
  });

  it('balance unknown (no chain answer, nothing shown before): grey banner, nothing paid', async () => {
    const env = setup({ chainBalance: null });
    await payFromAccount(ORDER, env.deps);
    expect(env.state()).toMatchObject({ status: 'error', error: 'TECH' });
    expect(env.call('/api/sign-and-broadcast')).toBeUndefined();
  });

  // Behaviour change: Flow 6 failures were silent (the button just came back).
  it('signing fails with a network error: gentle connection message, cart kept', async () => {
    const env = setup({ sign: new TypeError('Failed to fetch') });
    await payFromAccount(ORDER, env.deps);
    expect(env.state()).toMatchObject({ status: 'error', flow: 6, error: 'CONNECTION', canRetry: true });
    expect(env.deps.clearCart).not.toHaveBeenCalled();
  });

  it('the hub refuses to sign: its message is shown', async () => {
    const env = setup({ sign: { status: 400, body: { message: 'Solde insuffisant' } } });
    await payFromAccount(ORDER, env.deps);
    expect(env.state()).toMatchObject({ status: 'error', error: 'Solde insuffisant' });
  });

  it('customer paid but the hub did not forward: say so, no retry button, cart kept', async () => {
    const env = setup({ forward: { status: 500, body: { error: 'x' } } });
    await payFromAccount(ORDER, env.deps);
    expect(env.state()).toMatchObject({ status: 'error', error: 'NOT FORWARDED', canRetry: false });
    expect(env.deps.clearCart).not.toHaveBeenCalled();
  });

  it('waiter call: 0.02 €, no duplicate check, waiter banner, cart kept, reference sent once to the hub', async () => {
    const env = setup({ chainBalance: 5 });
    await payFromAccount(WAITER, env.deps);
    const op = JSON.parse(env.call('/api/sign-and-broadcast')!.body.operation.json).contractPayload;
    expect(op).toMatchObject({ quantity: '0.02', memo: 'Un serveur est appelé n:eau TABLE 4 kcs-inno-abcd-efgh' });
    // Before R4c the hub got the memo WITH the reference and appended it again.
    expect(env.call('/api/wallet-payment')!.body).toMatchObject({ amountEuro: '0.02', orderMemo: 'Un serveur est appelé n:eau TABLE 4', distriateSuffix: 'kcs-inno-abcd-efgh' });
    expect(env.deps.claimOrder).not.toHaveBeenCalled();
    expect(env.deps.clearCart).not.toHaveBeenCalled();
    expect(env.state()).toEqual({ status: 'waiter_called', table: '4' });
    expect(env.store.get('innopay_lastBalance')).toBe('4.98');
  });
});

describe('payFromAccount: Flow 7 (too little balance)', () => {
  // R4d: the secure hand-off. The old landing URL sent `account=` and the hub handed out that
  // account's keys to anyone; now the URL carries a one-time proof signed with the active key.
  it('order: memo claimed, marker set, off to /wallet-handoff with a proof the hub can verify', async () => {
    const env = setup({ chainBalance: 3.2, store: { innopay_lastBalance: '3.20' } });
    await payFromAccount(ORDER, env.deps);
    expect(env.deps.claimOrder).toHaveBeenCalledWith('b:7 TABLE 4 kcs-inno-abcd-efgh');
    expect(env.store.get(FLOW_MARKER_KEY)).toBe('flow7_topup_and_pay');
    expect(env.store.has('innopay_lastBalance')).toBe(false);
    expect(env.state()).toEqual({ status: 'redirecting', flow: 7 });
    const url = new URL((env.deps.navigate as any).mock.calls[0][0]);
    expect(url.pathname).toBe('/wallet-handoff');
    const p = Object.fromEntries(url.searchParams);
    expect(p).toMatchObject({
      handoff_account: 'alice', handoff_ts: String(NOW), restaurant: 'indies', restaurant_account: 'indies-test',
      table: '4', order_amount: '12.50', order_memo: 'b:7 TABLE 4 kcs-inno-abcd-efgh', balance: '3.20',
    });
    // What the hub does (innopay/lib/handoff.ts): the signature recovers to the active public key.
    const recovered = Signature.fromString(p.handoff_sig)
      .recover(cryptoUtils.sha256(handoffMessage('alice', NOW, p.handoff_nonce))).toString();
    expect(recovered).toBe(PrivateKey.fromString(ACTIVE).createPublic().toString());
    expect(p.handoff_nonce).toMatch(/^[0-9a-f]{32}$/);
    // Never a private key in the URL.
    expect(url.toString()).not.toContain(ACTIVE);
    expect(env.call('/api/sign-and-broadcast')).toBeUndefined();
  });

  it('no local active key (mixed posture): the hub /user page with the order, no proof', async () => {
    const env = setup({ chainBalance: 3.2, activeKey: null });
    await payFromAccount(ORDER, env.deps);
    const url = new URL((env.deps.navigate as any).mock.calls[0][0]);
    expect(url.pathname).toBe('/user');
    expect(url.searchParams.get('topup_for')).toBe('order');
    expect(url.searchParams.has('handoff_sig')).toBe(false);
  });

  // Q-R4-2: the waiter call with too little money landed on a hub page that ignored its params.
  it('waiter call with less than 0.02 €: Flow 7 for 0.02 €, remembered as a waiter call', async () => {
    const env = setup({ chainBalance: 0 });
    await payFromAccount(WAITER, env.deps);
    expect(env.store.get(WAITER_PENDING_KEY)).toBe('4');
    const url = new URL((env.deps.navigate as any).mock.calls[0][0]);
    expect(url.searchParams.get('order_amount')).toBe('0.02');
    expect(url.searchParams.get('order_memo')).toBe('Un serveur est appelé n:eau TABLE 4 kcs-inno-abcd-efgh');
  });

  it('a Flow 7 order clears a stale waiter flag', async () => {
    const env = setup({ chainBalance: 0, store: { [WAITER_PENDING_KEY]: '9' } });
    await payFromAccount(ORDER, env.deps);
    expect(env.store.has(WAITER_PENDING_KEY)).toBe(false);
  });
});

describe('startGuestCheckout: Flow 3', () => {
  it('order: no-discount price + 5 %, gst reference, off to Stripe', async () => {
    const env = setup();
    expect(await startGuestCheckout(ORDER, env.deps)).toBe(true);
    expect(env.call('/api/checkout/guest')!.body).toEqual({
      amountEuro: 13 * 1.05, recipient: 'indies-test', memo: 'b:7 TABLE 4 gst-inno-abcd-efgh', returnUrl: 'http://menu/menu?table=4',
    });
    expect(env.deps.navigate).toHaveBeenCalledWith('https://stripe/cs_1');
    expect(env.state()).toEqual({ status: 'redirecting', flow: 3, url: 'https://stripe/cs_1' });
  });

  it('waiter call: flat 1 €, remembered as a waiter call', async () => {
    const env = setup();
    await startGuestCheckout(WAITER, env.deps);
    expect(env.call('/api/checkout/guest')!.body).toMatchObject({ amountEuro: 1, memo: 'Un serveur est appelé n:eau TABLE 4 gst-inno-abcd-efgh' });
    expect(env.store.get(WAITER_PENDING_KEY)).toBe('4');
  });

  it('duplicate: nothing sent, idle', async () => {
    const env = setup({ duplicate: true });
    expect(await startGuestCheckout(ORDER, env.deps)).toBe(false);
    expect(env.call('/api/checkout/guest')).toBeUndefined();
    expect(env.state()).toEqual({ status: 'idle' });
  });

  // Behaviour change: was an alert() with the raw error.
  it('hub refuses: grey banner with its message, no stale waiter flag', async () => {
    const env = setup({ guest: { status: 400, body: { error: 'Restaurant fermé' } } });
    expect(await startGuestCheckout(WAITER, env.deps)).toBe(false);
    expect(env.state()).toMatchObject({ status: 'error', flow: 3, error: 'Restaurant fermé' });
    expect(env.store.has(WAITER_PENDING_KEY)).toBe(false);
    expect(env.deps.navigate).not.toHaveBeenCalled();
  });

  it('network error: gentle connection message', async () => {
    const env = setup({ guest: new TypeError('Load failed') });
    await startGuestCheckout(ORDER, env.deps);
    expect(env.state()).toMatchObject({ status: 'error', error: 'CONNECTION' });
  });
});

describe('startCreateAccount: Flows 5 and 4', () => {
  it('Flow 5 with the cart: memo claimed, marker, off to the hub /user', async () => {
    const env = setup({ account: null });
    expect(await startCreateAccount(ORDER, env.deps)).toBe(true);
    const url = new URL((env.deps.navigate as any).mock.calls[0][0]);
    expect(url.pathname).toBe('/user');
    expect(url.searchParams.get('order_amount')).toBe('12.50');
    expect(url.searchParams.get('discount')).toBe('0.50');
    expect(url.searchParams.get('memo')).toBe('b:7 TABLE 4 kcs-inno-abcd-efgh');
    expect(url.searchParams.get('restaurant_account')).toBe('indies-test');
    expect(env.store.get(FLOW_MARKER_KEY)).toBe('flow5_create_and_pay');
    expect(env.state()).toEqual({ status: 'redirecting', flow: 5 });
  });

  it('Flow 4 (empty cart): no duplicate check, no stored memo', async () => {
    const env = setup({ account: null });
    await startCreateAccount({ ...ORDER, amountEuro: '0.00', cartMemo: '' }, env.deps);
    expect(env.deps.claimOrder).not.toHaveBeenCalled();
    expect(env.state()).toEqual({ status: 'redirecting', flow: 4 });
  });

  it('waiter call: 0.02 €, no discount, remembered as a waiter call', async () => {
    const env = setup({ account: null });
    await startCreateAccount(WAITER, env.deps);
    const url = new URL((env.deps.navigate as any).mock.calls[0][0]);
    expect(url.searchParams.get('order_amount')).toBe('0.02');
    expect(url.searchParams.has('discount')).toBe(false);
    expect(env.store.get(WAITER_PENDING_KEY)).toBe('4');
  });

  it('duplicate: stays (false), so the banner button springs back', async () => {
    const env = setup({ account: null, duplicate: true });
    expect(await startCreateAccount(ORDER, env.deps)).toBe(false);
    expect(env.deps.navigate).not.toHaveBeenCalled();
    expect(env.state()).toEqual({ status: 'idle' });
  });
});

// Regression guards (2026-11-07, dev hub stopped): Flow 7 sent the browser to a hub that did not
// answer; Safari froze the page ("0s" on the button) and showed its own error page a minute later.
describe('the hub does not answer', () => {
  it('Flow 7: checked before leaving; grey banner, nothing claimed, the page stays', async () => {
    const env = setup({ chainBalance: 3.2, health: new TypeError('Load failed') });
    await payFromAccount(ORDER, env.deps);
    expect(env.state()).toMatchObject({ status: 'error', flow: 6, error: 'CONNECTION' });
    expect(env.deps.navigate).not.toHaveBeenCalled();
    expect(env.deps.claimOrder).not.toHaveBeenCalled();
    expect(env.store.has(FLOW_MARKER_KEY)).toBe(false);
  });

  it('Flow 7: a hub that hangs is given up after 5 s', async () => {
    vi.useFakeTimers();
    try {
      const env = setup({ chainBalance: 3.2, health: 'hang' });
      const running = payFromAccount(ORDER, env.deps);
      await vi.advanceTimersByTimeAsync(5_000);
      await running;
      expect(env.state()).toMatchObject({ status: 'error', error: 'CONNECTION' });
      expect(env.deps.navigate).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('"Créer un compte": false (the button springs back), grey banner, nothing stored', async () => {
    const env = setup({ account: null, health: { status: 503 } });
    expect(await startCreateAccount(ORDER, env.deps)).toBe(false);
    expect(env.state()).toMatchObject({ status: 'error', flow: 5, error: 'CONNECTION' });
    expect(env.deps.claimOrder).not.toHaveBeenCalled();
    expect(env.store.has(FLOW_MARKER_KEY)).toBe(false);
  });

  it('Flow 6: signing that hangs is given up after 20 s with the connection message', async () => {
    vi.useFakeTimers();
    try {
      const env = setup({ sign: 'hang' });
      const running = payFromAccount(ORDER, env.deps);
      await vi.advanceTimersByTimeAsync(20_000);
      await running;
      expect(env.state()).toMatchObject({ status: 'error', error: 'CONNECTION', canRetry: true });
      expect(env.deps.clearCart).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('Flow 6: customer leg signed, then the hub is gone: "paid but not forwarded", no retry', async () => {
    const env = setup({ forward: new TypeError('Load failed') });
    await payFromAccount(ORDER, env.deps);
    expect(env.state()).toMatchObject({ status: 'error', error: 'NOT FORWARDED', canRetry: false });
  });
});
