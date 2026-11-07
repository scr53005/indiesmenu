// What a return from the hub / Stripe means (R4, INDIESMENU-REFACTOR-PLAN.md §5b).
// One pure function instead of the four return effects of the old app/menu/page.tsx; the
// decisions are the same. The hub's return URLs (checked 2026-11-06):
//   - guest checkout (api/checkout/guest):            payment=success&session_id=… | payment=cancelled
//   - new account (user/success, Flows 4 and 5):      account_created=true&session_id=…
//   - Flow 4 variant B (lib/credential-session):      account_created=true&credential_token=…&flow=4
//   (Flow 8, import by email + code, never leaves the page: hooks/useImportAccount.ts.)
//   - Flow 5 existing account (execute-order-payment): order_success=true&existing_account=true&credential_token=…&flow=6[&optimistic_balance=…]
//   - Flow 7 (webhooks, checkout/flow7-return):       order_success=true&flow=7&(credential_token=… | session_id=…&credential_pending=true)[&optimistic_balance=…]
//   - Flows 4/5 via api/checkout/account:              topup_success=true&session_id=…&amount=…&flow=create_account_only|create_account_and_pay
//     (despite the param name this is not a top-up: `amount` is the new account's balance)
// Flows 1 and 2 (create / top up from wallet.innopay.lu) never return to a spoke. A spoke's only
// top-up is Flow 7 (including variant 5b: a Flow 5 whose email has a known, underfunded wallet).
// `topup_success` without a session id comes only from a dead hub redirect: ignored.
// The flow marker is localStorage `innopay_flow_pending`, written just before leaving for the hub.

export const FLOW_MARKER_KEY = 'innopay_flow_pending';

// Flow 5 when the hub already knows the customer's email (an account created earlier at this or
// another spoke): enough balance → the hub pays at once, like Flow 6 (`existing_account_paid`);
// too little → variant 5b, a Flow 7 top-up (`flow7_paid`). Flow 4 with a known email imports that
// account (`flow4_account`, same as a new one). The hub never sends `existing_account` without
// `order_success` (checked 2026-11-06); if it ever did, the keys are taken as a Flow 4 (cart kept).
export type CredentialOutcome =
  | 'existing_account_paid'   // Flow 5 with an account the hub already knew; order paid by the hub
  | 'flow7_paid'              // top-up + order paid by the webhook (Flow 7, variant 5b)
  | 'flow5_paid'              // new account, order paid by the webhook
  | 'flow4_account'           // Flow 4: account created before ordering (iPhone Safari banner), no order
  | 'account_legacy';         // account created with no known flow: old path, the page reloads

export type HubReturn =
  | { kind: 'none' }
  | { kind: 'cancelled' }
  | { kind: 'guest_paid'; sessionId: string }
  /** Flow 7 with the keys already on this phone: nothing to fetch. */
  | { kind: 'flow7_paid'; optimisticBalance: number | null }
  | { kind: 'credentials'; outcome: CredentialOutcome; credentialToken: string | null; sessionId: string | null; optimisticBalance: number | null };

function num(v: string | null): number | null {
  if (v === null || v.trim() === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function classifyReturn(
  params: URLSearchParams,
  flowMarker: string | null,
  hasLocalAccount: boolean,
): HubReturn {
  const payment = params.get('payment');
  const sessionId = params.get('session_id');
  const credentialToken = params.get('credential_token');
  const accountCreated = params.get('account_created') === 'true';
  const existingAccount = params.get('existing_account') === 'true';
  const orderSuccess = params.get('order_success') === 'true';
  const flowParam = params.get('flow');
  const optimisticBalance = num(params.get('optimistic_balance'));

  if (payment === 'cancelled') return { kind: 'cancelled' };
  if (payment === 'success' && sessionId) return { kind: 'guest_paid', sessionId };

  // Flow 7 started from this phone, which already holds the keys: no credential fetch.
  if (orderSuccess && flowMarker === 'flow7_topup_and_pay' && hasLocalAccount) {
    return { kind: 'flow7_paid', optimisticBalance };
  }

  if ((accountCreated || existingAccount || orderSuccess) && (credentialToken || sessionId)) {
    // The hub's explicit `flow` wins over the marker.
    const flow =
      flowParam === '4' ? 'flow4_create_account_only'
      : flowParam === '6' ? 'flow6_pay_with_account'
      : flowParam === '7' ? 'flow7_topup_and_pay'
      : flowMarker;
    const outcome: CredentialOutcome =
      existingAccount ? (orderSuccess ? 'existing_account_paid' : 'flow4_account')
      : flow === 'flow7_topup_and_pay' ? 'flow7_paid'
      : flow === 'flow5_create_and_pay' ? 'flow5_paid'
      : flow === 'flow4_create_account_only' ? 'flow4_account'
      : 'account_legacy';
    return { kind: 'credentials', outcome, credentialToken, sessionId, optimisticBalance };
  }

  // Flow 4 / 5 through api/checkout/account: the webhook created the account (and paid the order).
  if (params.get('topup_success') === 'true' && sessionId) {
    return {
      kind: 'credentials',
      outcome: flowParam === 'create_account_only' ? 'flow4_account' : 'flow5_paid',
      credentialToken: null,
      sessionId,
      optimisticBalance: num(params.get('amount')),
    };
  }

  return { kind: 'none' };
}

/** The query keys a return adds; removed from the URL once handled (the table stays). */
export const RETURN_PARAM_KEYS = [
  'payment', 'session_id', 'credential_token', 'credential_pending', 'account_created',
  'existing_account', 'order_success', 'topup_success', 'flow', 'amount', 'balance',
  'optimistic_balance', 'error',
] as const;
