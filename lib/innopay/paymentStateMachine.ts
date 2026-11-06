// Payment state machine (R4, INDIESMENU-REFACTOR-PLAN.md §5b). Ported from millewee's
// lib/innopay/paymentStateMachine.ts, adapted to indies:
//   - no strings inside: banners pick their text with t() from the state (lib/i18n);
//   - a new order may start from a finished state (success / error / waiter_called /
//     account_created): the green banner lingers for seconds and must not block the button;
//   - ERROR is accepted while redirecting: the guest checkout POST can fail after the click
//     (millewee drops that event and the spinner never stops);
//   - processing → redirecting (SWITCH_TO_REDIRECT): an account order turns into Flow 7 when the
//     balance check finds too little money;
//   - 'transmission' errors: Stripe paid, but the order did not reach the chain in time
//     (indies' grey banner with "show order" / "clear order").
// The states are mutually exclusive, which replaces the ~20 boolean flags of the old page.

export type FlowType = 3 | 4 | 5 | 6 | 7;

/** What the yellow banner is waiting for. */
export type ProcessingStep = 'paying' | 'waiterCalling' | 'finalizing' | 'awaitingChain';

/** Which green banner a success shows. */
export type SuccessBanner = 'orderSent' | 'walletReady' | 'topup';

export type PaymentState =
  | { status: 'idle' }
  | { status: 'redirecting'; flow: FlowType; url?: string }
  | { status: 'processing'; flow: FlowType; step: ProcessingStep; sessionId?: string }
  | { status: 'success'; flow: FlowType; banner: SuccessBanner }
  | { status: 'account_created'; flow: FlowType; accountName: string }
  | { status: 'waiter_called'; table: string }
  | { status: 'error'; flow: FlowType; error: string; canRetry: boolean; reason: 'failed' | 'transmission' };

export type PaymentEvent =
  | { type: 'SELECT_FLOW'; flow: FlowType; step?: ProcessingStep }
  | { type: 'START_REDIRECT'; url: string }
  | { type: 'SWITCH_TO_REDIRECT'; flow: FlowType }
  | { type: 'RETURN_FROM_HUB'; flow: FlowType; step?: ProcessingStep; sessionId?: string }
  | { type: 'PROCESSING_UPDATE'; step: ProcessingStep }
  | { type: 'PAYMENT_SUCCESS'; banner: SuccessBanner }
  | { type: 'ACCOUNT_CREATED'; accountName: string }
  | { type: 'WAITER_CALLED'; table: string }
  | { type: 'ERROR'; error: string; canRetry?: boolean; reason?: 'failed' | 'transmission' }
  | { type: 'RESET' }
  | { type: 'DISMISS_BANNER' };

export const initialPaymentState: PaymentState = { status: 'idle' };

/** Redirecting or processing: the order button must not start a second payment. */
export function isBusy(state: PaymentState): boolean {
  return state.status === 'redirecting' || state.status === 'processing';
}

function startFlow(flow: FlowType, step?: ProcessingStep): PaymentState {
  // Flow 6 (and an account waiter call) runs on the page; every other flow leaves for the hub.
  return step || flow === 6
    ? { status: 'processing', flow, step: step ?? 'paying' }
    : { status: 'redirecting', flow };
}

export function paymentReducer(state: PaymentState, event: PaymentEvent): PaymentState {
  // From anywhere: a return from the hub is the truth about what happened (it arrives on a fresh
  // page load, so the state is normally idle; accepting it everywhere keeps a reload safe).
  if (event.type === 'RETURN_FROM_HUB') {
    return { status: 'processing', flow: event.flow, step: event.step ?? 'finalizing', sessionId: event.sessionId };
  }

  switch (state.status) {
    case 'idle':
    case 'success':
    case 'account_created':
    case 'waiter_called':
    case 'error':
      if (event.type === 'SELECT_FLOW') return startFlow(event.flow, event.step);
      if (event.type === 'RESET' || event.type === 'DISMISS_BANNER') {
        return state.status === 'idle' ? state : { status: 'idle' };
      }
      break;

    case 'redirecting':
      if (event.type === 'START_REDIRECT') return { ...state, url: event.url };
      if (event.type === 'ERROR') {
        return { status: 'error', flow: state.flow, error: event.error, canRetry: event.canRetry ?? true, reason: event.reason ?? 'failed' };
      }
      // RESET: duplicate-order modal opened instead, or the page came back from bfcache.
      if (event.type === 'RESET' || event.type === 'DISMISS_BANNER') return { status: 'idle' };
      break;

    case 'processing':
      if (event.type === 'PROCESSING_UPDATE') return { ...state, step: event.step };
      if (event.type === 'SWITCH_TO_REDIRECT') return { status: 'redirecting', flow: event.flow };
      if (event.type === 'PAYMENT_SUCCESS') return { status: 'success', flow: state.flow, banner: event.banner };
      if (event.type === 'ACCOUNT_CREATED') return { status: 'account_created', flow: state.flow, accountName: event.accountName };
      if (event.type === 'WAITER_CALLED') return { status: 'waiter_called', table: event.table };
      if (event.type === 'ERROR') {
        return { status: 'error', flow: state.flow, error: event.error, canRetry: event.canRetry ?? true, reason: event.reason ?? 'failed' };
      }
      // RESET: duplicate-order modal, or a check that ended without a payment (nothing to show).
      if (event.type === 'RESET') return { status: 'idle' };
      break;
  }

  console.warn('[PaymentStateMachine] Invalid transition:', state.status, '->', event.type);
  return state;
}
