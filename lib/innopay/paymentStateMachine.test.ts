import { describe, expect, it, vi } from 'vitest';
import { initialPaymentState, isBusy, paymentReducer, type PaymentEvent, type PaymentState } from './paymentStateMachine';

const run = (events: PaymentEvent[], from: PaymentState = initialPaymentState) => events.reduce(paymentReducer, from);

describe('paymentReducer', () => {
  it('Flow 6: paying → success → idle on dismiss', () => {
    const s1 = run([{ type: 'SELECT_FLOW', flow: 6 }]);
    expect(s1).toEqual({ status: 'processing', flow: 6, step: 'paying' });
    const s2 = paymentReducer(s1, { type: 'PAYMENT_SUCCESS', banner: 'orderSent' });
    expect(s2).toEqual({ status: 'success', flow: 6, banner: 'orderSent' });
    expect(paymentReducer(s2, { type: 'DISMISS_BANNER' })).toEqual({ status: 'idle' });
  });

  it('hub flows start by redirecting and remember the URL', () => {
    for (const flow of [3, 4, 5, 7] as const) {
      const s = run([{ type: 'SELECT_FLOW', flow }, { type: 'START_REDIRECT', url: 'https://hub/x' }]);
      expect(s).toEqual({ status: 'redirecting', flow, url: 'https://hub/x' });
    }
  });

  it('an account waiter call is processed on the page', () => {
    const s = run([{ type: 'SELECT_FLOW', flow: 6, step: 'waiterCalling' }, { type: 'WAITER_CALLED', table: '7' }]);
    expect(s).toEqual({ status: 'waiter_called', table: '7' });
  });

  it('an account order turns into Flow 7 when the balance is too low', () => {
    const s = run([{ type: 'SELECT_FLOW', flow: 6 }, { type: 'SWITCH_TO_REDIRECT', flow: 7 }]);
    expect(s).toEqual({ status: 'redirecting', flow: 7 });
  });

  it('a failed guest checkout POST leaves "redirecting" for the error banner (millewee bug)', () => {
    const s = run([{ type: 'SELECT_FLOW', flow: 3 }, { type: 'ERROR', error: 'Hmm' }]);
    expect(s).toEqual({ status: 'error', flow: 3, error: 'Hmm', canRetry: true, reason: 'failed' });
  });

  it('Flow 6 errors are shown, not swallowed', () => {
    const s = run([{ type: 'SELECT_FLOW', flow: 6 }, { type: 'ERROR', error: 'Erreur', canRetry: false }]);
    expect(s).toMatchObject({ status: 'error', canRetry: false });
  });

  it('a new order may start while the green / grey banner is still up', () => {
    const finished: PaymentState[] = [
      { status: 'success', flow: 6, banner: 'orderSent' },
      { status: 'waiter_called', table: '3' },
      { status: 'account_created', flow: 4, accountName: 'a' },
      { status: 'error', flow: 6, error: 'x', canRetry: true, reason: 'failed' },
    ];
    for (const s of finished) {
      expect(paymentReducer(s, { type: 'SELECT_FLOW', flow: 6 })).toEqual({ status: 'processing', flow: 6, step: 'paying' });
    }
  });

  it('a second click while busy does not start a second payment', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const busy = run([{ type: 'SELECT_FLOW', flow: 6 }]);
    expect(paymentReducer(busy, { type: 'SELECT_FLOW', flow: 6 })).toBe(busy);
    const leaving = run([{ type: 'SELECT_FLOW', flow: 7 }]);
    expect(paymentReducer(leaving, { type: 'SELECT_FLOW', flow: 3 })).toBe(leaving);
    warn.mockRestore();
  });

  it('guest return: awaiting the chain, then success or a transmission error', () => {
    const waiting = run([{ type: 'RETURN_FROM_HUB', flow: 3, step: 'awaitingChain', sessionId: 'cs_1' }]);
    expect(waiting).toEqual({ status: 'processing', flow: 3, step: 'awaitingChain', sessionId: 'cs_1' });
    expect(paymentReducer(waiting, { type: 'PAYMENT_SUCCESS', banner: 'orderSent' })).toMatchObject({ status: 'success' });
    expect(paymentReducer(waiting, { type: 'ERROR', error: '', reason: 'transmission', canRetry: false }))
      .toMatchObject({ status: 'error', reason: 'transmission' });
  });

  it('account creation return ends in account_created', () => {
    const s = run([{ type: 'RETURN_FROM_HUB', flow: 4 }, { type: 'ACCOUNT_CREATED', accountName: 'test000-000-1' }]);
    expect(s).toEqual({ status: 'account_created', flow: 4, accountName: 'test000-000-1' });
  });

  it('RESET from redirecting (duplicate modal, bfcache restore) and from processing', () => {
    expect(run([{ type: 'SELECT_FLOW', flow: 5 }, { type: 'RESET' }])).toEqual({ status: 'idle' });
    expect(run([{ type: 'SELECT_FLOW', flow: 6 }, { type: 'RESET' }])).toEqual({ status: 'idle' });
  });

  it('RESET / DISMISS on idle keep the same object (no re-render)', () => {
    expect(paymentReducer(initialPaymentState, { type: 'RESET' })).toBe(initialPaymentState);
    expect(paymentReducer(initialPaymentState, { type: 'DISMISS_BANNER' })).toBe(initialPaymentState);
  });

  it('invalid transitions leave the state unchanged', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(paymentReducer(initialPaymentState, { type: 'PAYMENT_SUCCESS', banner: 'orderSent' })).toBe(initialPaymentState);
    const success: PaymentState = { status: 'success', flow: 6, banner: 'orderSent' };
    expect(paymentReducer(success, { type: 'ERROR', error: 'late' })).toBe(success);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('isBusy is true only while redirecting or processing', () => {
    expect(isBusy({ status: 'redirecting', flow: 7 })).toBe(true);
    expect(isBusy({ status: 'processing', flow: 6, step: 'paying' })).toBe(true);
    expect(isBusy(initialPaymentState)).toBe(false);
    expect(isBusy({ status: 'error', flow: 6, error: '', canRetry: true, reason: 'failed' })).toBe(false);
  });
});
