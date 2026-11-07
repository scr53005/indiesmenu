// What indies sends to the hub, one pure builder per flow (R4, INDIESMENU-REFACTOR-PLAN.md §5b).
// Copied from the handlers in app/menu/page.tsx as they were on 2026-11-06, so the hub contract
// (URLs, params, memo format, amounts) does not change. Random suffixes, the hub URL and the page
// origin are passed in, which keeps every function testable.

/** Waiter call paid from an account (Flow 6 / Flow 5 onboarding): a symbolic 2 cents. */
export const WAITER_FEE_EUR = 0.02;
/** Waiter call paid by card without an account (Flow 3): flat 1 €, card fees included. */
export const GUEST_WAITER_FEE_EUR = 1.0;
/** Guest checkout surcharge on the no-discount price (card fees). */
export const GUEST_FEE_RATE = 0.05;

/**
 * Does "Créer un compte" carry something to pay? A waiter call always does; otherwise only a
 * non-empty cart (Flow 5). With nothing to pay it is Flow 4 (create the account only): no memo may
 * be stored then, or the MiniWallet pulses for an order that never existed (found 2026-11-07),
 * and no duplicate-order check, which would compare two empty carts.
 */
export function createAccountCarriesOrder(waiterCall: boolean, orderAmount: string): boolean {
  if (waiterCall) return true;
  const amount = parseFloat(orderAmount);
  return Number.isFinite(amount) && amount > 0;
}

// ── memos ────────────────────────────────────────────────────────────────────

/** `<cart memo> <suffix>`: the format of every order memo (merchant-hub needs the `-inno-` suffix). */
export function orderMemo(cartMemo: string, suffix: string): string {
  return cartMemo ? `${cartMemo} ${suffix}` : suffix;
}

/**
 * The waiter-call memo, for every flow. The CO page reads "Un serveur est appelé", the optional
 * `n:` comment and "TABLE n"; merchant-hub forwards it only with the `-inno-` suffix.
 * `reasonEncoded` is `encodeComment(reason)` (lib/utils), empty when there is no reason.
 */
export function waiterMemo(table: string, suffix: string, reasonEncoded = ''): string {
  const comment = reasonEncoded ? ` n:${reasonEncoded}` : '';
  return `Un serveur est appelé${comment} ${table ? `TABLE ${table} ` : ''}${suffix}`
    .replace(/\s+/g, ' ')
    .trim();
}

// ── amounts ──────────────────────────────────────────────────────────────────

/** Guest total: the no-discount price + 5 %. Sent unrounded, as before (the hub rounds). */
export function guestOrderAmount(totalNoDiscount: number): number {
  return totalNoDiscount * (1 + GUEST_FEE_RATE);
}

/**
 * Missing money for Flow 7, rounded UP to the cent so the top-up always covers the order.
 * The cents are cleaned of float noise before rounding up: 12.5 − 3.2 gives 930.0000000000001
 * cents, which the old page code rounded up to 9.31 €.
 */
export function topupDeficit(orderAmount: number, balance: number): string {
  const cents = Number(((orderAmount - balance) * 100).toFixed(6));
  return (Math.ceil(cents) / 100).toFixed(2);
}

/** Flow 6 when the balance covers the order, Flow 7 (top-up + pay) otherwise. */
export function accountFlow(balance: number, orderAmount: number): 6 | 7 {
  return balance >= orderAmount ? 6 : 7;
}

/**
 * Balance used to choose between Flow 6 and 7. The last balance shown (optimistic, updated right
 * after each payment) is kept when Hive-Engine roughly agrees (within 1 €, since the chain lags a
 * few seconds behind a payment); otherwise the chain wins. With no chain answer, the optimistic
 * balance is used; with neither, null (the caller shows the "technical problem" error).
 */
export function reconcileBalance(optimistic: number | null, chain: number | null): number | null {
  if (chain === null) return optimistic;
  if (optimistic === null) return chain;
  return Math.abs(Math.round(chain) - Math.round(optimistic)) <= 1 ? optimistic : chain;
}

// ── requests ─────────────────────────────────────────────────────────────────

/** Flow 3: POST to the hub, which answers with the Stripe checkout URL. */
export function guestCheckoutRequest(p: {
  hubUrl: string; origin: string; table: string; recipient: string; amountEuro: number; memo: string;
}): { url: string; body: { amountEuro: number; recipient: string; memo: string; returnUrl: string } } {
  return {
    url: `${p.hubUrl}/api/checkout/guest`,
    body: {
      amountEuro: p.amountEuro,
      recipient: p.recipient,
      memo: p.memo,
      returnUrl: `${p.origin}/menu?table=${p.table}`,
    },
  };
}

/** Flow 5 (create an account and pay), for an order or a waiter call. */
export function createAccountUrl(p: {
  hubUrl: string; origin: string; table: string; recipient: string;
  orderAmount: string; discount?: string; memo: string;
}): string {
  const params = new URLSearchParams();
  params.set('restaurant', 'indies');
  params.set('restaurant_account', p.recipient);
  params.set('table', p.table);
  params.set('order_amount', p.orderAmount);
  if (p.discount && parseFloat(p.discount) > 0) params.set('discount', p.discount);
  params.set('memo', p.memo);
  params.set('return_url', `${p.origin}/menu`);
  return `${p.hubUrl}/user?${params.toString()}`;
}

/**
 * Flow 7 (top-up + pay), legacy hub landing page. `order_memo` and `return_url` are encoded once
 * more by URLSearchParams: the hub decodes them twice, keep it that way.
 * (R4d replaces this with the signed /wallet-handoff when a local active key exists.)
 */
export function topupAndPayUrl(p: {
  hubUrl: string; origin: string; table: string; accountName: string;
  orderAmount: number; balance: number; memo: string;
}): string {
  const returnUrl = `${p.origin}/menu?table=${p.table}`;
  const params = new URLSearchParams({
    topup_for: 'order',
    source: 'indiesmenu',
    table: p.table,
    order_amount: p.orderAmount.toFixed(2),
    order_memo: encodeURIComponent(p.memo),
    deficit: topupDeficit(p.orderAmount, p.balance),
    account: p.accountName,
    balance: p.balance.toFixed(2),
    return_url: encodeURIComponent(returnUrl),
  });
  return `${p.hubUrl}?${params.toString()}`;
}

/** Flow 6 leg 1: the hub signs with the local active key, or with innopay's authority without one. */
export function signPayload(operation: unknown, accountName: string, activeKey: string | null): Record<string, unknown> {
  return activeKey
    ? { operation, activePrivateKey: activeKey }
    : { operation, useInnopayAuthority: true, accountName };
}

/**
 * Flow 6 leg 2: the hub pays the restaurant once it sees the customer's transfer. `distriateSuffix`
 * must be the reference inside the customer memo (the hub refuses the payment otherwise). No
 * eurUsdRate: the hub fetches it itself when it is absent.
 */
export function walletPaymentBody(p: {
  accountName: string; customerTxId: string; recipient: string;
  amountEuro: string; orderMemo: string; suffix: string;
}): Record<string, unknown> {
  return {
    customerAccount: p.accountName,
    customerTxId: p.customerTxId,
    recipient: p.recipient,
    amountEuro: p.amountEuro,
    orderMemo: p.orderMemo,
    distriateSuffix: p.suffix,
  };
}
