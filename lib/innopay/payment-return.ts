// What a return from the hub / Stripe means (R4, INDIESMENU-REFACTOR-PLAN.md §5b).
// One pure function instead of the four return effects of the old app/menu/page.tsx; the
// decisions are the same. The hub's return URLs (checked 2026-11-06):
//   - guest checkout (api/checkout/guest):            payment=success&session_id=… | payment=cancelled
//   - new account (user/success):                     account_created=true&session_id=…
//   - imported account (lib/credential-session):      account_created=true&credential_token=…&flow=4
//   - Flow 5 existing account (execute-order-payment): order_success=true&existing_account=true&credential_token=…&flow=6
//   - Flow 7 (webhooks, checkout/flow7-return):       order_success=true&flow=7&(credential_token=… | session_id=…&credential_pending=true)[&optimistic_balance=…]
//   - top-up (lib/flows.ts):                           topup_success=true[&session_id=…][&amount=…]
// The flow marker is localStorage `innopay_flow_pending`, written just before leaving for the hub.

export const FLOW_MARKER_KEY = 'innopay_flow_pending';

export type CredentialOutcome =
  | 'existing_account_paid'   // Flow 5 with an account the hub already knew; order paid by the hub
  | 'existing_account_unpaid' // same, but the order still has to be paid here (Flow 6 or 7)
  | 'flow7_paid'              // top-up + order paid by the webhook
  | 'flow5_paid'              // new account, order paid by the webhook
  | 'flow4_account'           // new or imported account, no order
  | 'account_legacy';         // account created with no known flow: old path, the page reloads

export type HubReturn =
  | { kind: 'none' }
  | { kind: 'cancelled' }
  | { kind: 'guest_paid'; sessionId: string }
  /** Flow 7 with the keys already on this phone: nothing to fetch. */
  | { kind: 'flow7_paid'; optimisticBalance: number | null }
  | { kind: 'credentials'; outcome: CredentialOutcome; credentialToken: string | null; sessionId: string | null; optimisticBalance: number | null }
  | { kind: 'topup_credentials'; sessionId: string; amount: number | null; accountOnly: boolean }
  | { kind: 'topup_only'; amount: number | null };

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
      existingAccount ? (orderSuccess ? 'existing_account_paid' : 'existing_account_unpaid')
      : flow === 'flow7_topup_and_pay' ? 'flow7_paid'
      : flow === 'flow5_create_and_pay' ? 'flow5_paid'
      : flow === 'flow4_create_account_only' ? 'flow4_account'
      : 'account_legacy';
    return { kind: 'credentials', outcome, credentialToken, sessionId, optimisticBalance };
  }

  if (params.get('topup_success') === 'true') {
    const amount = num(params.get('amount'));
    return sessionId
      ? { kind: 'topup_credentials', sessionId, amount, accountOnly: flowParam === 'create_account_only' }
      : { kind: 'topup_only', amount };
  }

  return { kind: 'none' };
}

/** The query keys a return adds; removed from the URL once handled (the table stays). */
export const RETURN_PARAM_KEYS = [
  'payment', 'session_id', 'credential_token', 'credential_pending', 'account_created',
  'existing_account', 'order_success', 'topup_success', 'flow', 'amount', 'balance',
  'optimistic_balance', 'error',
] as const;
