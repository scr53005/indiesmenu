import { describe, expect, it } from 'vitest';
import { classifyReturn } from './payment-return';

const q = (s: string) => new URLSearchParams(s);

describe('classifyReturn — one case per hub return URL', () => {
  it('no return', () => {
    expect(classifyReturn(q('table=7'), null, false)).toEqual({ kind: 'none' });
    expect(classifyReturn(q('table=7'), 'flow5_create_and_pay', true)).toEqual({ kind: 'none' });
  });

  it('guest checkout: Stripe success and cancel', () => {
    expect(classifyReturn(q('table=7&payment=success&session_id=cs_1'), null, false)).toEqual({ kind: 'guest_paid', sessionId: 'cs_1' });
    expect(classifyReturn(q('table=7&payment=cancelled'), 'flow5_create_and_pay', false)).toEqual({ kind: 'cancelled' });
    // payment=success without a session id is not a guest return
    expect(classifyReturn(q('payment=success'), null, false)).toEqual({ kind: 'none' });
  });

  it('new account from /user/success: the marker says Flow 5 or Flow 4', () => {
    expect(classifyReturn(q('table=7&account_created=true&session_id=cs_2'), 'flow5_create_and_pay', false)).toEqual({
      kind: 'credentials', outcome: 'flow5_paid', credentialToken: null, sessionId: 'cs_2', optimisticBalance: null,
    });
    expect(classifyReturn(q('account_created=true&session_id=cs_2'), 'flow4_create_account_only', false))
      .toMatchObject({ kind: 'credentials', outcome: 'flow4_account' });
  });

  it('account created with no marker: legacy path', () => {
    expect(classifyReturn(q('account_created=true&session_id=cs_2'), null, false))
      .toMatchObject({ kind: 'credentials', outcome: 'account_legacy' });
  });

  it('Flow 4 variant B (credential-session, flow=4) wins over a stale marker', () => {
    expect(classifyReturn(q('credential_token=ct&account_created=true&flow=4'), 'flow5_create_and_pay', false))
      .toMatchObject({ kind: 'credentials', outcome: 'flow4_account', credentialToken: 'ct' });
  });

  it('Flow 5 with an account the hub already knew (execute-order-payment)', () => {
    expect(classifyReturn(q('order_success=true&existing_account=true&credential_token=ct&flow=6&table=7'), 'flow5_create_and_pay', false))
      .toMatchObject({ kind: 'credentials', outcome: 'existing_account_paid' });
    // Never sent by the hub (2026-11-06); if it were, keep the keys and the cart (nothing paid).
    expect(classifyReturn(q('existing_account=true&credential_token=ct'), 'flow5_create_and_pay', false))
      .toMatchObject({ kind: 'credentials', outcome: 'flow4_account' });
  });

  it('variant 5b: Flow 5 finds an underfunded account on the hub and returns as Flow 7', () => {
    expect(classifyReturn(q('table=7&order_success=true&flow=7&session_id=cs&credential_pending=true&optimistic_balance=1.30'), 'flow5_create_and_pay', false))
      .toEqual({ kind: 'credentials', outcome: 'flow7_paid', credentialToken: null, sessionId: 'cs', optimisticBalance: 1.3 });
  });

  it('Flow 7 started on this phone: keys already here, nothing to fetch', () => {
    expect(classifyReturn(q('order_success=true&credential_token=ct&flow=7'), 'flow7_topup_and_pay', true))
      .toEqual({ kind: 'flow7_paid', optimisticBalance: null });
    expect(classifyReturn(q('order_success=true&flow=7&session_id=cs&credential_pending=true&optimistic_balance=4.20'), 'flow7_topup_and_pay', true))
      .toEqual({ kind: 'flow7_paid', optimisticBalance: 4.2 });
  });

  it('Flow 7 on a phone without the keys: fetch the credentials', () => {
    expect(classifyReturn(q('order_success=true&credential_token=ct&flow=7'), 'flow7_topup_and_pay', false))
      .toMatchObject({ kind: 'credentials', outcome: 'flow7_paid', credentialToken: 'ct' });
    expect(classifyReturn(q('order_success=true&credential_token=ct&flow=7'), null, false))
      .toMatchObject({ kind: 'credentials', outcome: 'flow7_paid' });
  });

  it('Flows 4/5 via api/checkout/account (topup_success + session): not a top-up', () => {
    expect(classifyReturn(q('table=7&topup_success=true&session_id=cs&amount=7.5&flow=create_account_and_pay'), null, false))
      .toEqual({ kind: 'credentials', outcome: 'flow5_paid', credentialToken: null, sessionId: 'cs', optimisticBalance: 7.5 });
    expect(classifyReturn(q('topup_success=true&session_id=cs&amount=20&flow=create_account_only'), null, false))
      .toMatchObject({ kind: 'credentials', outcome: 'flow4_account', optimisticBalance: 20 });
  });

  it('topup_success without a session (dead hub redirect; Flows 1/2 never reach a spoke) is ignored', () => {
    expect(classifyReturn(q('table=7&topup_success=true'), null, true)).toEqual({ kind: 'none' });
    expect(classifyReturn(q('topup_success=true&amount=10'), null, true)).toEqual({ kind: 'none' });
  });
});
