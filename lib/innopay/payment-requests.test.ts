import { describe, expect, it } from 'vitest';
import {
  GUEST_WAITER_FEE_EUR, WAITER_FEE_EUR, accountFlow, createAccountCarriesOrder, createAccountUrl, guestCheckoutRequest,
  guestOrderAmount, orderMemo, reconcileBalance, signPayload, topupWithoutKeyUrl, walletHandoffUrl,
  waiterMemo, walletPaymentBody,
} from './payment-requests';

const HUB = 'http://localhost:3000';
const ORIGIN = 'http://192.168.178.55:3001';
const CART_MEMO = 'd:12,q:2; TABLE 7 ';
const SUFFIX = 'kcs-inno-ab12-cd34';

// Regression (2026-11-07): Flow 4 with an empty cart stored a memo, so the new MiniWallet pulsed.
describe('createAccountCarriesOrder', () => {
  it('empty cart = Flow 4, nothing to pay', () => {
    expect(createAccountCarriesOrder(false, '0.00')).toBe(false);
    expect(createAccountCarriesOrder(false, '')).toBe(false);
  });
  it('a cart or a waiter call carries a payment', () => {
    expect(createAccountCarriesOrder(false, '12.50')).toBe(true);
    expect(createAccountCarriesOrder(true, '0.02')).toBe(true);
  });
});

describe('memos', () => {
  it('order memo = cart memo + space + suffix (same as generateDistriatedHiveOp)', () => {
    expect(orderMemo(CART_MEMO, SUFFIX)).toBe('d:12,q:2; TABLE 7  kcs-inno-ab12-cd34');
    expect(orderMemo('', SUFFIX)).toBe(SUFFIX);
  });

  it('waiter memo with and without a comment / table, always with -inno-', () => {
    expect(waiterMemo('7', SUFFIX)).toBe('Un serveur est appelé TABLE 7 kcs-inno-ab12-cd34');
    expect(waiterMemo('7', 'gst-inno-aaaa-bbbb', 'addition')).toBe('Un serveur est appelé n:addition TABLE 7 gst-inno-aaaa-bbbb');
    expect(waiterMemo('', SUFFIX)).toBe('Un serveur est appelé kcs-inno-ab12-cd34');
    expect(waiterMemo('7', SUFFIX)).toContain('-inno-');
  });
});

describe('amounts', () => {
  it('fees', () => {
    expect(WAITER_FEE_EUR).toBe(0.02);
    expect(GUEST_WAITER_FEE_EUR).toBe(1);
    expect(guestOrderAmount(20)).toBeCloseTo(21, 10);
  });

  it('Flow 6 when the balance covers the order, else Flow 7 (also for a 2-cent waiter call)', () => {
    expect(accountFlow(10, 10)).toBe(6);
    expect(accountFlow(9.99, 10)).toBe(7);
    expect(accountFlow(0.01, WAITER_FEE_EUR)).toBe(7);
  });

  it('balance reconciliation: optimistic kept within 1 €, chain wins otherwise', () => {
    expect(reconcileBalance(8.5, 8.9)).toBe(8.5);
    expect(reconcileBalance(8.5, 3)).toBe(3);
    expect(reconcileBalance(null, 3)).toBe(3);
    expect(reconcileBalance(8.5, null)).toBe(8.5);
    expect(reconcileBalance(null, null)).toBeNull();
  });
});

describe('requests', () => {
  it('Flow 3 guest checkout', () => {
    expect(guestCheckoutRequest({ hubUrl: HUB, origin: ORIGIN, table: '7', recipient: 'indies.cafe', amountEuro: 21, memo: 'm gst-inno-x-y' }))
      .toEqual({
        url: 'http://localhost:3000/api/checkout/guest',
        body: { amountEuro: 21, recipient: 'indies.cafe', memo: 'm gst-inno-x-y', returnUrl: 'http://192.168.178.55:3001/menu?table=7' },
      });
  });

  it('Flow 5 create account (discount only when > 0)', () => {
    const url = new URL(createAccountUrl({ hubUrl: HUB, origin: ORIGIN, table: '7', recipient: 'indies-test', orderAmount: '12.50', discount: '0', memo: 'm' }));
    expect(url.origin + url.pathname).toBe('http://localhost:3000/user');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      restaurant: 'indies', restaurant_account: 'indies-test', table: '7', order_amount: '12.50', memo: 'm',
      return_url: 'http://192.168.178.55:3001/menu',
    });
    const withDiscount = new URL(createAccountUrl({ hubUrl: HUB, origin: ORIGIN, table: '7', recipient: 'r', orderAmount: '10', discount: '1.50', memo: 'm' }));
    expect(withDiscount.searchParams.get('discount')).toBe('1.50');
  });

  // R4d: Flow 7 goes through the hub's secure /wallet-handoff (the hub decodes each param once).
  it('Flow 7 wallet hand-off: the proof, the order and the balance; no key in the URL', () => {
    const handoff = { handoff_account: 'alice', handoff_ts: '1', handoff_nonce: 'n', handoff_sig: 's' };
    const url = new URL(walletHandoffUrl({ hubUrl: HUB, origin: ORIGIN, table: '7', recipient: 'indies-test', orderAmount: 12.5, balance: 3.2, memo: 'a b;', handoff }));
    expect(url.origin + url.pathname).toBe('http://localhost:3000/wallet-handoff');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      ...handoff, restaurant: 'indies', restaurant_account: 'indies-test', table: '7',
      order_amount: '12.50', order_memo: 'a b;', balance: '3.20', return_url: 'http://192.168.178.55:3001/menu?table=7',
    });
  });

  it('Flow 7 without a local active key: the hub /user page with the order (no landing import)', () => {
    const url = new URL(topupWithoutKeyUrl({ hubUrl: HUB, origin: ORIGIN, table: '7', recipient: 'indies-test', accountName: 'alice', orderAmount: 0.02, memo: 'm' }));
    expect(url.origin + url.pathname).toBe('http://localhost:3000/user');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      restaurant: 'indies', restaurant_account: 'indies-test', table: '7', order_amount: '0.02', memo: 'm',
      return_url: 'http://192.168.178.55:3001/menu?table=7', account: 'alice', topup_for: 'order',
    });
  });

  it('sign payload: local active key, or innopay authority without one', () => {
    expect(signPayload({ op: 1 }, 'alice', '5Kkey')).toEqual({ operation: { op: 1 }, activePrivateKey: '5Kkey' });
    expect(signPayload({ op: 1 }, 'alice', null)).toEqual({ operation: { op: 1 }, useInnopayAuthority: true, accountName: 'alice' });
  });

  it('wallet-payment body carries the suffix referenced in the customer memo, no rate', () => {
    const body = walletPaymentBody({ accountName: 'alice', customerTxId: 'tx', recipient: 'indies-test', amountEuro: '12.50', orderMemo: CART_MEMO, suffix: SUFFIX });
    expect(body).toEqual({ customerAccount: 'alice', customerTxId: 'tx', recipient: 'indies-test', amountEuro: '12.50', orderMemo: CART_MEMO, distriateSuffix: SUFFIX });
    expect(body).not.toHaveProperty('eurUsdRate');
  });
});
