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

  it('imported account (credential-session, flow=4) wins over a stale marker', () => {
    expect(classifyReturn(q('credential_token=ct&account_created=true&flow=4'), 'flow5_create_and_pay', false))
      .toMatchObject({ kind: 'credentials', outcome: 'flow4_account', credentialToken: 'ct' });
  });

  it('Flow 5 with an account the hub already knew (execute-order-payment)', () => {
    expect(classifyReturn(q('order_success=true&existing_account=true&credential_token=ct&flow=6&table=7'), 'flow5_create_and_pay', false))
      .toMatchObject({ kind: 'credentials', outcome: 'existing_account_paid' });
    expect(classifyReturn(q('existing_account=true&credential_token=ct'), 'flow5_create_and_pay', false))
      .toMatchObject({ kind: 'credentials', outcome: 'existing_account_unpaid' });
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

  it('top-up returns (lib/flows.ts)', () => {
    expect(classifyReturn(q('topup_success=true&session_id=cs&amount=15'), null, true))
      .toEqual({ kind: 'topup_credentials', sessionId: 'cs', amount: 15, accountOnly: false });
    expect(classifyReturn(q('topup_success=true&session_id=cs&flow=create_account_only'), null, false))
      .toEqual({ kind: 'topup_credentials', sessionId: 'cs', amount: null, accountOnly: true });
    expect(classifyReturn(q('topup_success=true&amount=10'), null, true)).toEqual({ kind: 'topup_only', amount: 10 });
    expect(classifyReturn(q('topup_success=true&amount=abc'), null, true)).toEqual({ kind: 'topup_only', amount: null });
  });
});
