'use client';

// Returns from the hub / Stripe and the popup hand-off (R4b, INDIESMENU-REFACTOR-PLAN.md §5b).
// Replaces the four return effects and the postMessage listener of the old app/menu/page.tsx.
// What each return does is in lib/innopay/apply-return.ts (unit-tested); this hook only connects
// it to the browser: the URL on mount, fetch, localStorage, timers, and the page's callbacks.
import { useEffect, useRef, type Dispatch } from 'react';
import { useI18n } from '@/lib/i18n';
import { getInnopayUrl } from '@/lib/utils';
import { getAccountName, saveKeys, saveWalletBlob } from '@/lib/innopay/keystore';
import { classifyReturn, FLOW_MARKER_KEY } from '@/lib/innopay/payment-return';
import {
  ACCOUNT_CREATING_MS, applyHubReturn, finishPaid, isAllowedWalletOrigin, parseWalletMessage,
  type HubCredentials, type WalletView,
} from '@/lib/innopay/apply-return';
import type { PaymentEvent, PaymentState } from '@/lib/innopay/paymentStateMachine';

/** Guest order (Flow 3): ask the hub every 10 s whether it reached the chain, for 10 minutes. */
const GUEST_POLL_MS = 10_000;
const GUEST_MAX_POLLS = 60;

export interface PaymentReturnOptions {
  state: PaymentState;
  dispatch: Dispatch<PaymentEvent>;
  clearCart: () => void;
  startOrderPulsing: (memo: string) => void;
  showWallet: (wallet: WalletView) => void;
  refetchBalance: () => void;
  cleanUrl: () => void;
  /** Popup hand-off: an account now exists on this phone. */
  onWalletConnected: (accountName: string) => void;
}

export function usePaymentReturn(options: PaymentReturnOptions): void {
  const { t } = useI18n();
  // Latest callbacks and t() in a ref: the effects below must run once, not on every render.
  const latest = useRef({ ...options, t });
  useEffect(() => { latest.current = { ...options, t }; });

  // ── Return from the hub / Stripe, read once from the URL ─────────────────
  const handled = useRef(false);
  useEffect(() => {
    // A ref, not a cleanup flag: React's dev double-mount must not apply a return twice, and the
    // credential fetch must not be abandoned when it re-mounts.
    if (handled.current) return;
    handled.current = true;

    const ret = classifyReturn(
      new URLSearchParams(window.location.search),
      localStorage.getItem(FLOW_MARKER_KEY),
      !!getAccountName(),
    );
    if (ret.kind === 'none') return;
    console.warn('[PAYMENT RETURN]', ret.kind, 'outcome' in ret ? ret.outcome : '');

    const hubUrl = getInnopayUrl();
    const L = () => latest.current;
    void applyHubReturn(ret, {
      dispatch: (e) => L().dispatch(e),
      fetchCredentials: async ({ credentialToken, sessionId }) => {
        const response = await fetch(`${hubUrl}/api/account/credentials`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(credentialToken && { credentialToken }),
            ...(sessionId && { sessionId }),
          }),
        });
        if (!response.ok) {
          console.error('[PAYMENT RETURN] credentials fetch failed:', response.status);
          return null;
        }
        return (await response.json()) as HubCredentials;
      },
      saveKeys,
      getAccountName,
      storage: localStorage,
      now: Date.now,
      later: (fn, ms) => { window.setTimeout(fn, ms); },
      clearCart: () => L().clearCart(),
      startOrderPulsing: (memo) => L().startOrderPulsing(memo),
      showWallet: (wallet) => L().showWallet(wallet),
      refetchBalance: () => L().refetchBalance(),
      cleanUrl: () => L().cleanUrl(),
      reload: () => window.location.reload(),
      messages: { credentialsFailed: L().t('payment.credentialsFailed') },
    }).catch((error) => console.error('[PAYMENT RETURN] failed:', error));
  }, []);

  // ── Guest order (Flow 3): wait until the hub has put it on the chain ─────
  const { state } = options;
  const guestSessionId = state.status === 'processing' && state.step === 'awaitingChain' ? state.sessionId : undefined;
  useEffect(() => {
    if (!guestSessionId) return;
    const hubUrl = getInnopayUrl();
    let polls = 0;
    let stopped = false;
    const stop = () => { stopped = true; window.clearInterval(timer); };

    const timer = window.setInterval(async () => {
      polls++;
      try {
        const response = await fetch(`${hubUrl}/api/checkout/status?session_id=${encodeURIComponent(guestSessionId)}`);
        const data = response.ok ? await response.json() : null;
        if (stopped) return;
        if (data?.isComplete) {
          stop();
          const { clearCart, startOrderPulsing, dispatch } = latest.current;
          // Only now: the order is on the chain. A guest waiter call keeps the cart.
          finishPaid({ dispatch, storage: localStorage, clearCart, startOrderPulsing });
          return;
        }
      } catch (error) {
        console.warn('[GUEST POLL] status check failed:', error);
      }
      if (!stopped && polls >= GUEST_MAX_POLLS) {
        stop();
        const { dispatch, t: tr } = latest.current;
        // Stripe was paid but the order never showed up: grey banner, "show order" / "clear order".
        dispatch({ type: 'ERROR', error: tr('payment.transmissionError'), canRetry: false, reason: 'transmission' });
      }
    }, GUEST_POLL_MS);
    return stop;
  }, [guestSessionId]);

  // ── Popup hand-off: wallet.innopay.lu opened with window.open posts the new account ──
  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (!isAllowedWalletOrigin(event.origin, window.location.hostname)) return;
      const message = parseWalletMessage(event.data);
      if (!message) return;
      const { accountName, activeKey, euroBalance } = message;
      latest.current.dispatch({ type: 'RETURN_FROM_HUB', flow: 5, step: 'accountCreating' });
      if (!activeKey) {
        console.warn('[WALLET HAND-OFF] no active key in the message (old hub?): signing will use the innopay authority.');
      }
      // Only the account name and the active key are stored (SPOKE-KEY-SECURITY.md §9).
      await saveKeys(activeKey ? { accountName, activeKey } : { accountName });
      saveWalletBlob({ username: accountName });
      latest.current.onWalletConnected(accountName);
      window.setTimeout(() => {
        latest.current.dispatch({ type: 'ACCOUNT_CREATED', accountName, euroBalance });
      }, ACCOUNT_CREATING_MS);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
}
