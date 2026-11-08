// What indies does when the customer comes back from the hub / Stripe (R4b,
// INDIESMENU-REFACTOR-PLAN.md §5b). `classifyReturn` (payment-return.ts) says which return it is;
// this file carries it out. It replaces the three return effects of the old app/menu/page.tsx.
// Everything the browser provides (fetch, storage, timers, the page's callbacks) is passed in, so
// each return is unit-tested (apply-return.test.ts); hooks/usePaymentReturn.ts is the React glue.
//
// Deliberate differences from the old effects:
//   - a failed credential fetch shows the error banner (it was only logged), and the URL is kept
//     so a reload tries again;
//   - Flow 5 existing account, paid by the hub: green "order sent" + pulse, like Flow 5 (it was a
//     5-second yellow "transmitting" banner with no pulse). The old "known account, not paid yet →
//     pay here" branch is gone: the hub never sends that return (it pays itself, or tops up
//     through Flow 7 = variant 5b);
//   - Flow 7: the hub's balance is trusted for 12 s (startBalanceSettling), as Flows 4/5 since R3;
//     the "pure" Flow 7 return no longer shows 0.00 while waiting for the chain;
//   - Flows 4/5 returning through api/checkout/account (`topup_success&session_id`) are handled as
//     Flows 4/5 (the old page showed "Rechargement réussi" and reloaded: it took them for top-ups).

import { SETTLE_MS, startBalanceSettling } from './balance-settle';
import { FLOW_MARKER_KEY, WAITER_PENDING_KEY, type CredentialOutcome, type HubReturn } from './payment-return';
import type { FlowType, PaymentEvent } from './paymentStateMachine';

/** The memo stored before leaving for the hub (lib/utils storeMemoBeforeOrder); feeds the pulse. */
export const LATEST_MEMO_KEY = 'innopay_latestMemoContent';
const LATEST_MEMO_TIME_KEY = 'innopay_latestMemoDateTime';
const LAST_BALANCE_KEY = 'innopay_lastBalance';

/** The legacy account return reloads the page so the wallet appears (old page: 3 s). */
export const LEGACY_RELOAD_MS = 3000;
/** Popup account creation: yellow "account created" before the blue banner (old page: 2 s). */
export const ACCOUNT_CREATING_MS = 2000;

/** What the hub's POST /api/account/credentials returns (only the fields indies reads). */
export interface HubCredentials {
  accountName: string;
  euroBalance?: number | null;
  keys?: { active?: { privateKey?: string }; memo?: { privateKey?: string } };
}

export interface WalletView { accountName: string; euroBalance: number }

export interface ReturnDeps {
  dispatch: (event: PaymentEvent) => void;
  /** null when the hub answered with an error or could not be reached. */
  fetchCredentials: (ids: { credentialToken?: string | null; sessionId?: string | null }) => Promise<HubCredentials | null>;
  saveKeys: (keys: { accountName: string; activeKey?: string; memoKey?: string }) => Promise<void>;
  getAccountName: () => string | null;
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  now: () => number;
  later: (fn: () => void, ms: number) => void;
  clearCart: () => void;
  startOrderPulsing: (memo: string) => void;
  showWallet: (wallet: WalletView) => void;
  refetchBalance: () => void;
  /** Removes the return params from the URL, keeping the table. */
  cleanUrl: () => void;
  reload: () => void;
  /** Already translated: the machine holds no strings. */
  messages: { credentialsFailed: string };
}

/** Which flow the machine shows while the keys are fetched. */
export function flowOfOutcome(outcome: CredentialOutcome): FlowType {
  switch (outcome) {
    case 'flow7_paid': return 7;
    case 'flow4_account':
    case 'account_legacy': return 4;
    default: return 5;
  }
}

/**
 * The hub has paid what the customer left for. A waiter call (WAITER_PENDING_KEY, R4c) keeps the
 * cart and shows the waiter banner; an order empties the cart, shows "order sent" and pulses.
 * Exported for the guest poll in usePaymentReturn.
 */
export function finishPaid(deps: Pick<ReturnDeps, 'dispatch' | 'storage' | 'clearCart' | 'startOrderPulsing'>): void {
  const waiterTable = deps.storage.getItem(WAITER_PENDING_KEY);
  deps.storage.removeItem(FLOW_MARKER_KEY);
  if (waiterTable !== null) {
    deps.storage.removeItem(WAITER_PENDING_KEY);
    deps.dispatch({ type: 'WAITER_CALLED', table: waiterTable });
    return;
  }
  deps.clearCart();
  deps.storage.setItem('cart', '[]');
  deps.dispatch({ type: 'PAYMENT_SUCCESS', banner: 'orderSent' });
  const memo = deps.storage.getItem(LATEST_MEMO_KEY);
  if (memo) deps.startOrderPulsing(memo);
}

function balanceOf(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** Hub balance shown at once and trusted for 12 s, while Hive-Engine catches up (R3 fix). */
function settle(deps: ReturnDeps, accountName: string, balance: number): void {
  startBalanceSettling(deps.storage, balance, deps.now());
  deps.showWallet({ accountName, euroBalance: balance });
}

function failCredentials(deps: ReturnDeps): void {
  // URL kept on purpose: a reload fetches the keys again.
  deps.dispatch({ type: 'ERROR', error: deps.messages.credentialsFailed, canRetry: false });
}

async function fetchAndSave(
  deps: ReturnDeps, ids: { credentialToken?: string | null; sessionId?: string | null },
): Promise<HubCredentials | null> {
  let credentials: HubCredentials | null;
  try {
    credentials = await deps.fetchCredentials(ids);
  } catch {
    credentials = null;
  }
  if (!credentials?.accountName) return null;
  // Only the active + memo keys are stored (SPOKE-KEY-SECURITY.md §4).
  await deps.saveKeys({
    accountName: credentials.accountName,
    activeKey: credentials.keys?.active?.privateKey,
    memoKey: credentials.keys?.memo?.privateKey,
  });
  return credentials;
}

export async function applyHubReturn(ret: HubReturn, deps: ReturnDeps): Promise<void> {
  switch (ret.kind) {
    case 'none':
      return;

    case 'cancelled':
      // Stripe "back": nothing was paid, the cart is still there. Forget the order stored before
      // leaving (R4c): otherwise the MiniWallet pulses for it for up to 2 h, and paying the same
      // cart again at once trips the duplicate-order modal.
      deps.storage.removeItem(LATEST_MEMO_KEY);
      deps.storage.removeItem(LATEST_MEMO_TIME_KEY);
      deps.storage.removeItem(WAITER_PENDING_KEY);
      deps.storage.removeItem(FLOW_MARKER_KEY);
      deps.cleanUrl();
      return;

    case 'guest_paid':
      // Flow 3. The cart is cleared only once the order is on the chain (usePaymentReturn polls).
      deps.dispatch({ type: 'RETURN_FROM_HUB', flow: 3, step: 'awaitingChain', sessionId: ret.sessionId });
      deps.cleanUrl();
      return;

    case 'flow7_paid': {
      // Flow 7 started on this phone: the keys are already here.
      deps.dispatch({ type: 'RETURN_FROM_HUB', flow: 7 });
      const accountName = deps.getAccountName();
      if (accountName && ret.optimisticBalance !== null) {
        settle(deps, accountName, ret.optimisticBalance);
      } else {
        // No balance from the hub: read the chain once it has the top-up.
        deps.later(deps.refetchBalance, SETTLE_MS);
      }
      finishPaid(deps);
      deps.cleanUrl();
      return;
    }

    case 'credentials':
      return applyCredentialReturn(ret, deps);
  }
}

async function applyCredentialReturn(
  ret: Extract<HubReturn, { kind: 'credentials' }>, deps: ReturnDeps,
): Promise<void> {
  deps.dispatch({ type: 'RETURN_FROM_HUB', flow: flowOfOutcome(ret.outcome) });
  const credentials = await fetchAndSave(deps, { credentialToken: ret.credentialToken, sessionId: ret.sessionId });
  if (!credentials) return failCredentials(deps);
  const { accountName } = credentials;
  const hubBalance = balanceOf(credentials.euroBalance);
  // The balance the hub put in the URL (after the order), when it sent one.
  const newBalance = ret.optimisticBalance ?? hubBalance;

  switch (ret.outcome) {
    case 'existing_account_paid':
      // The hub sends the balance after the payment as optimistic_balance (2026-11-07). The
      // credential session's euroBalance is NOT it: the hub used to store a 0 placeholder there,
      // and indies showed 0.00 € until its next refresh.
      if (ret.optimisticBalance !== null) {
        settle(deps, accountName, ret.optimisticBalance);
      } else {
        // Older hub, or Hive-Engine unreachable when the hub paid: read the chain now, and again
        // once it shows the payment.
        deps.refetchBalance();
        deps.later(deps.refetchBalance, SETTLE_MS);
      }
      finishPaid(deps);
      break;

    case 'flow5_paid':
    case 'flow7_paid':
      settle(deps, accountName, newBalance);
      finishPaid(deps);
      break;

    case 'flow4_account':
      // Flow 4, before ordering (iPhone Safari banner): a new account, or the one the hub already
      // had for this email. Either way the wallet is ready and the cart stays.
      settle(deps, accountName, newBalance);
      deps.storage.removeItem(FLOW_MARKER_KEY);
      deps.dispatch({ type: 'PAYMENT_SUCCESS', banner: 'walletReady' });
      break;

    case 'account_legacy':
      // Account created with no known flow (old hub path): blue banner, then a reload.
      deps.storage.setItem(LAST_BALANCE_KEY, hubBalance.toString());
      deps.clearCart();
      deps.dispatch({ type: 'ACCOUNT_CREATED', accountName, euroBalance: hubBalance });
      deps.later(deps.reload, LEGACY_RELOAD_MS);
      break;
  }
  deps.cleanUrl();
}

// ── Popup hand-off (wallet.innopay.lu opened with window.open) ───────────────

/** A Hive active WIF starts with '5' (51 chars); the master password starts with 'P'. */
export function looksLikeActiveWif(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith('5') && value.length >= 50 && value.length <= 52;
}

export function isAllowedWalletOrigin(origin: string, currentHost: string): boolean {
  return origin === 'https://wallet.innopay.lu'
    || origin === 'http://localhost:3000'
    || origin === `http://${currentHost}:3000`;
}

export interface WalletMessage { accountName: string; activeKey: string | null; euroBalance: number }

/** The account the popup sent, or null for any other message. */
export function parseWalletMessage(data: unknown): WalletMessage | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.type !== 'INNOPAY_WALLET_CREATED' && d.type !== 'INNOPAY_ACCOUNT_CREATED') return null;
  const accountName = (typeof d.accountName === 'string' && d.accountName) || (typeof d.username === 'string' && d.username) || '';
  if (!accountName) return null;
  return {
    accountName,
    // Never store anything that is not an active key (an old hub sent the master password).
    activeKey: looksLikeActiveWif(d.activeKey) ? d.activeKey : null,
    euroBalance: typeof d.euroBalance === 'number' && Number.isFinite(d.euroBalance) ? d.euroBalance : 0,
  };
}
