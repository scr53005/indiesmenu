// What indies does when the customer pays (R4c, INDIESMENU-REFACTOR-PLAN.md §5b): the outgoing
// half, mirror of apply-return.ts. Replaces handleOrder (account part), handleCallWaiter (account
// part), handleCreateAccount and proceedWithGuestCheckout of the old app/menu/page.tsx.
// Everything the browser provides is passed in, so each flow is unit-tested
// (payment-actions.test.ts); hooks/usePaymentFlow.ts is the React glue. The hub contract (URLs,
// params, memo format) is the one in payment-requests.ts, unchanged.
//
// Deliberate differences from the old handlers:
//   - every failure shows the grey error banner with a gentle message (no alert(), and Flow 6 no
//     longer fails silently);
//   - an account waiter call with less than 0.02 € goes through Flow 7 like an order (Q-R4-2; it
//     used to land on a hub page that no longer reads those params);
//   - a waiter call that leaves for the hub (Flows 3, 5, 7) is remembered (WAITER_PENDING_KEY): on
//     return the cart is kept and the waiter banner shows, not "order sent";
//   - Flow 6 no longer fetches the EUR/USD rate in the browser (the hub fetches it);
//   - the Flow 6 waiter call sends the hub its memo without the reference, which the hub appends:
//     it used to appear twice in the restaurant's memo.

import { createEuroTransferOperation } from '../utils';
import { startBalanceSettling } from './balance-settle';
import { buildHandoffProof, handoffParams } from './handoff';
import { customerFacingError } from './customer-error';
import { FLOW_MARKER_KEY, WAITER_PENDING_KEY } from './payment-return';
import {
  GUEST_WAITER_FEE_EUR, WAITER_FEE_EUR, accountFlow, createAccountCarriesOrder, createAccountUrl,
  guestCheckoutRequest, guestOrderAmount, orderMemo, reconcileBalance, signPayload, topupWithoutKeyUrl,
  waiterMemo, walletHandoffUrl, walletPaymentBody,
} from './payment-requests';
import type { PaymentEvent } from './paymentStateMachine';
import type { WalletView } from './apply-return';

const LAST_BALANCE_KEY = 'innopay_lastBalance';
const LAST_BALANCE_TS_KEY = 'innopay_lastBalance_timestamp';
/** The guest checkout POST gives up after 30 s (old page), so the spinner never runs forever. */
export const GUEST_TIMEOUT_MS = 30_000;
/**
 * Every call to the hub has a time limit. Without one, a hub that does not answer (found
 * 2026-11-07 with the dev hub stopped: on a LAN, Windows drops the phone's packets instead of
 * refusing them) left the order button on "0s" until Safari gave up a minute later, with no message.
 * Signing is quick when the hub is up; forwarding waits for the hub's Hive broadcast, so longer.
 */
export const SIGN_TIMEOUT_MS = 20_000;
export const FORWARD_TIMEOUT_MS = 45_000;
/** The "is the hub up?" check before leaving for a hub page: it answers in milliseconds when up. */
export const HUB_PING_TIMEOUT_MS = 5_000;
/** Thrown when a hub call runs out of time. */
export class HubTimeoutError extends Error {
  constructor() { super('hub timeout'); this.name = 'HubTimeoutError'; }
}

/** A hub call that gives up after `ms` (HubTimeoutError). */
async function hubCall(deps: ActionDeps, url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await deps.http(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new HubTimeoutError();
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** What is being paid: the cart, or a call for the waiter. */
export type Purchase =
  | { kind: 'order'; amountEuro: string; cartMemo: string; noDiscountEuro: string; discount: string }
  | { kind: 'waiter'; reasonEncoded: string };

export interface ActionDeps {
  dispatch: (event: PaymentEvent) => void;
  hubUrl: string;
  /** The page's origin, for the return URLs. */
  origin: string;
  table: string;
  /** The restaurant's Hive account (NEXT_PUBLIC_HIVE_ACCOUNT): indies-test on dev. */
  recipient: string;
  http: (url: string, init?: RequestInit) => Promise<Response>;
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  now: () => number;
  /** A fresh `-inno-` reference (lib/utils distriate). */
  newSuffix: (tag?: 'kcs' | 'gst') => string;
  /**
   * Duplicate-order guard: false when the same order left less than 15 min ago (the page then
   * shows its modal and nothing is paid). On true the memo is stored for the pulse.
   */
  claimOrder: (memo: string) => boolean;
  navigate: (url: string) => void;
  getAccountName: () => string | null;
  getActiveKey: () => string | null;
  clearCart: () => void;
  startOrderPulsing: (memo: string) => void;
  showWallet: (wallet: WalletView) => void;
  /** Already translated: the machine holds no strings. */
  messages: {
    connection: string;
    failed: string;
    technicalProblem: string;
    notForwarded: string;
    guestTimeout: string;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function fail(deps: ActionDeps, error: unknown, fallback = deps.messages.failed): void {
  // A hub that does not answer reads like a lost connection to the customer.
  const shown = error instanceof HubTimeoutError ? deps.messages.connection
    : customerFacingError(error, deps.messages.connection, fallback);
  deps.dispatch({ type: 'ERROR', error: shown });
}

/** The balance the Flow 6/7 decision uses: last shown, checked against the chain (±1 €). */
async function readBalance(accountName: string, deps: ActionDeps): Promise<number | null> {
  const stored = deps.storage.getItem(LAST_BALANCE_KEY);
  const optimistic = stored !== null && Number.isFinite(parseFloat(stored)) ? parseFloat(stored) : null;
  let chain: number | null = null;
  try {
    const response = await deps.http(`/api/balance/euro?account=${encodeURIComponent(accountName)}`);
    if (response.ok) {
      const value = Number((await response.json())?.balance);
      chain = Number.isFinite(value) ? value : null;
    }
  } catch {
    // Hive-Engine unreachable: the last balance shown decides, as before.
  }
  return reconcileBalance(optimistic, chain);
}

/**
 * An order or a waiter call paid from the account on this phone: Flow 6 when the balance covers
 * it, Flow 7 (top-up on the hub) otherwise. Returns false when there is no account here (the
 * caller then offers the other ways to pay).
 */
export async function payFromAccount(purchase: Purchase, deps: ActionDeps): Promise<boolean> {
  const accountName = deps.getAccountName();
  if (!accountName) return false;
  const waiter = purchase.kind === 'waiter';
  const amount = waiter ? WAITER_FEE_EUR : parseFloat(purchase.amountEuro);
  deps.dispatch({ type: 'SELECT_FLOW', flow: 6, step: waiter ? 'waiterCalling' : 'paying' });

  try {
    const balance = await readBalance(accountName, deps);
    if (balance === null) {
      deps.dispatch({ type: 'ERROR', error: deps.messages.technicalProblem });
      return true;
    }
    deps.storage.setItem(LAST_BALANCE_KEY, balance.toFixed(2));

    if (accountFlow(balance, amount) === 7) {
      await leaveForTopup(purchase, accountName, amount, balance, deps);
      return true;
    }

    // ── Flow 6: customer → innopay on chain, then the hub pays the restaurant ──
    const suffix = deps.newSuffix();
    const hubMemo = waiter ? waiterMemo(deps.table, '', purchase.reasonEncoded) : purchase.cartMemo;
    const fullMemo = waiter ? waiterMemo(deps.table, suffix, purchase.reasonEncoded) : orderMemo(purchase.cartMemo, suffix);
    if (!waiter && !deps.claimOrder(fullMemo)) {
      deps.dispatch({ type: 'RESET' });
      return true;
    }

    const operation = createEuroTransferOperation(accountName, 'innopay', amount.toFixed(2), fullMemo);
    const signed = await hubCall(deps, `${deps.hubUrl}/api/sign-and-broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signPayload(operation, accountName, deps.getActiveKey())),
    }, SIGN_TIMEOUT_MS);
    if (!signed.ok) {
      const body = await signed.json().catch(() => ({}));
      throw new Error(body?.message || deps.messages.failed);
    }
    const { txId } = await signed.json();

    // The customer's EURO left: show the new balance now (the chain lags a few seconds).
    const newBalance = Math.max(0, round2(balance - amount));
    deps.showWallet({ accountName, euroBalance: newBalance });
    if (waiter) {
      deps.storage.setItem(LAST_BALANCE_KEY, newBalance.toFixed(2));
      deps.storage.setItem(LAST_BALANCE_TS_KEY, String(deps.now()));
    }

    // From here on the customer has paid. Any failure (refusal, network, time limit) must say so
    // and must not invite a retry, which would pay a second time (the hub's audit sees the gap).
    let forwarded: Response | null = null;
    try {
      forwarded = await hubCall(deps, `${deps.hubUrl}/api/wallet-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walletPaymentBody({
          accountName, customerTxId: txId, recipient: deps.recipient,
          amountEuro: waiter ? amount.toFixed(2) : purchase.amountEuro, orderMemo: hubMemo, suffix,
        })),
      }, FORWARD_TIMEOUT_MS);
    } catch (error) {
      console.error('[FLOW 6] wallet-payment unreachable:', error);
    }
    if (!forwarded?.ok) {
      if (forwarded) console.error('[FLOW 6] wallet-payment refused:', forwarded.status, await forwarded.text().catch(() => ''));
      deps.dispatch({ type: 'ERROR', error: deps.messages.notForwarded, canRetry: false });
      return true;
    }

    if (waiter) {
      deps.dispatch({ type: 'WAITER_CALLED', table: deps.table });
      return true;
    }
    deps.clearCart();
    // Trust the new balance and hold the next Flow 6 for 12 s, until the chain shows the payment.
    startBalanceSettling(deps.storage, newBalance, deps.now());
    deps.dispatch({ type: 'PAYMENT_SUCCESS', banner: 'orderSent' });
    deps.startOrderPulsing(fullMemo);
  } catch (error) {
    fail(deps, error);
  }
  return true;
}

/**
 * Does the hub answer? Checked just before sending the customer to a hub page: once the browser
 * has started leaving, a hub that does not answer freezes this page (counter included) until the
 * browser shows its own error page, about a minute later (found 2026-11-07 with Safari).
 */
async function hubReachable(deps: ActionDeps): Promise<boolean> {
  try {
    return (await hubCall(deps, `${deps.hubUrl}/api/health`, { method: 'GET' }, HUB_PING_TIMEOUT_MS)).ok;
  } catch {
    return false;
  }
}

/** Flow 7: too little money; the hub tops up by card, then pays (also for a 0.02 € waiter call). */
async function leaveForTopup(purchase: Purchase, accountName: string, amount: number, balance: number, deps: ActionDeps): Promise<void> {
  const waiter = purchase.kind === 'waiter';
  if (!(await hubReachable(deps))) {
    deps.dispatch({ type: 'ERROR', error: deps.messages.connection });
    return;
  }
  const memo = waiter
    ? waiterMemo(deps.table, deps.newSuffix(), purchase.reasonEncoded)
    : orderMemo(purchase.cartMemo, deps.newSuffix());
  if (!waiter && !deps.claimOrder(memo)) {
    deps.dispatch({ type: 'RESET' });
    return;
  }
  deps.storage.setItem(FLOW_MARKER_KEY, 'flow7_topup_and_pay');
  if (waiter) deps.storage.setItem(WAITER_PENDING_KEY, deps.table);
  else deps.storage.removeItem(WAITER_PENDING_KEY);
  // The hub sends the balance after the top-up and the order; the old one is wrong from now on.
  deps.storage.removeItem(LAST_BALANCE_KEY);
  deps.dispatch({ type: 'SWITCH_TO_REDIRECT', flow: 7 });
  // R4d: prove the wallet with the local active key and let the hub's /wallet-handoff import it
  // and start the top-up. Without a local key ("mixed" posture) there is nothing to sign with:
  // the hub's /user page takes the order, like Flow 5.
  const activeKey = deps.getActiveKey();
  const common = { hubUrl: deps.hubUrl, origin: deps.origin, table: deps.table, recipient: deps.recipient, orderAmount: amount, memo };
  deps.navigate(activeKey
    ? walletHandoffUrl({ ...common, balance, handoff: handoffParams(buildHandoffProof(accountName, activeKey, deps.now())) })
    : topupWithoutKeyUrl({ ...common, accountName }));
}

/**
 * Flow 3: card payment without an account. The cart is cleared only once the order is on chain.
 * Returns whether it left for Stripe (false: duplicate modal or error banner).
 */
export async function startGuestCheckout(purchase: Purchase, deps: ActionDeps): Promise<boolean> {
  const waiter = purchase.kind === 'waiter';
  const suffix = deps.newSuffix('gst');
  const memo = waiter ? waiterMemo(deps.table, suffix, purchase.reasonEncoded) : orderMemo(purchase.cartMemo, suffix);
  const amountEuro = waiter ? GUEST_WAITER_FEE_EUR : guestOrderAmount(parseFloat(purchase.noDiscountEuro));

  deps.dispatch({ type: 'SELECT_FLOW', flow: 3 });
  if (!deps.claimOrder(memo)) {
    deps.dispatch({ type: 'RESET' });
    return false;
  }
  if (waiter) deps.storage.setItem(WAITER_PENDING_KEY, deps.table);
  else deps.storage.removeItem(WAITER_PENDING_KEY);

  const request = guestCheckoutRequest({
    hubUrl: deps.hubUrl, origin: deps.origin, table: deps.table, recipient: deps.recipient, amountEuro, memo,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GUEST_TIMEOUT_MS);
  try {
    const response = await deps.http(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      console.error('[FLOW 3] checkout refused:', response.status, body);
      throw new Error(typeof body?.error === 'string' ? body.error : deps.messages.failed);
    }
    const { url } = await response.json();
    deps.dispatch({ type: 'START_REDIRECT', url });
    deps.navigate(url);
    return true;
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError';
    deps.storage.removeItem(WAITER_PENDING_KEY);
    fail(deps, timedOut ? new Error(deps.messages.guestTimeout) : error);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * "Créer un compte": Flow 5 (create the account and pay the cart or the waiter call), or Flow 4
 * (empty cart: the account only). Returns whether it left for the hub (false: duplicate modal or
 * hub unreachable), so the banner button can spring back.
 */
export async function startCreateAccount(purchase: Purchase, deps: ActionDeps): Promise<boolean> {
  const waiter = purchase.kind === 'waiter';
  const orderAmount = waiter ? WAITER_FEE_EUR.toFixed(2) : purchase.amountEuro;
  const carriesOrder = createAccountCarriesOrder(waiter, orderAmount);

  deps.dispatch({ type: 'SELECT_FLOW', flow: carriesOrder ? 5 : 4 });
  if (!(await hubReachable(deps))) {
    deps.dispatch({ type: 'ERROR', error: deps.messages.connection });
    return false;
  }
  const memo = waiter
    ? waiterMemo(deps.table, deps.newSuffix(), purchase.reasonEncoded)
    : orderMemo(purchase.cartMemo, deps.newSuffix());
  // Flow 4 carries no order: no duplicate check and no stored memo (it would pulse for nothing).
  if (carriesOrder && !deps.claimOrder(memo)) {
    deps.dispatch({ type: 'RESET' });
    return false;
  }

  deps.storage.setItem(FLOW_MARKER_KEY, 'flow5_create_and_pay');
  if (waiter) deps.storage.setItem(WAITER_PENDING_KEY, deps.table);
  else deps.storage.removeItem(WAITER_PENDING_KEY);
  deps.navigate(createAccountUrl({
    hubUrl: deps.hubUrl, origin: deps.origin, table: deps.table, recipient: deps.recipient,
    orderAmount, discount: waiter ? '0' : purchase.discount, memo,
  }));
  return true;
}
