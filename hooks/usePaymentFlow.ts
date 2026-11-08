'use client';

// Outgoing payments (R4c, INDIESMENU-REFACTOR-PLAN.md §5b): order, waiter call, guest checkout,
// account creation. Replaces the account parts of handleOrder / handleCallWaiter,
// handleCreateAccount and proceedWithGuestCheckout of the old app/menu/page.tsx. What each flow
// does is in lib/innopay/payment-actions.ts (unit-tested); this hook only connects it to the
// browser (fetch, localStorage, navigation, translations) and the page's callbacks.
import { useMemo, useRef, useEffect, type Dispatch } from 'react';
import { useI18n } from '@/lib/i18n';
import { distriate, getInnopayUrl } from '@/lib/utils';
import { getAccountName, getActiveKey } from '@/lib/innopay/keystore';
import {
  payFromAccount, startCreateAccount, startGuestCheckout, type ActionDeps, type Purchase,
} from '@/lib/innopay/payment-actions';
import type { WalletView } from '@/lib/innopay/apply-return';
import { isBusy, type PaymentEvent, type PaymentState } from '@/lib/innopay/paymentStateMachine';

export interface PaymentFlowOptions {
  state: PaymentState;
  dispatch: Dispatch<PaymentEvent>;
  table: string;
  recipient: string;
  /** Duplicate-order guard: false → the page showed its modal. On true the memo is stored. */
  claimOrder: (memo: string) => boolean;
  clearCart: () => void;
  startOrderPulsing: (memo: string) => void;
  showWallet: (wallet: WalletView) => void;
}

export interface PaymentFlow {
  /** false when there is no account on this phone (the caller offers the other ways to pay). */
  payFromAccount: (purchase: Purchase) => Promise<boolean>;
  /** false when it did not leave for Stripe (duplicate modal or error banner). */
  guestCheckout: (purchase: Purchase) => Promise<boolean>;
  /** false when it did not leave for the hub (duplicate modal, or the hub does not answer). */
  createAccount: (purchase: Purchase) => Promise<boolean>;
}

export function usePaymentFlow(options: PaymentFlowOptions): PaymentFlow {
  const { t } = useI18n();
  // Latest values in a ref: the returned functions stay the same object across renders.
  const latest = useRef({ ...options, t });
  useEffect(() => { latest.current = { ...options, t }; });

  return useMemo(() => {
    const deps = (): ActionDeps => {
      const L = latest.current;
      return {
        dispatch: L.dispatch,
        hubUrl: getInnopayUrl(),
        origin: window.location.origin,
        table: L.table,
        recipient: L.recipient,
        http: (url, init) => fetch(url, init),
        storage: localStorage,
        now: Date.now,
        newSuffix: (tag) => distriate(tag),
        claimOrder: L.claimOrder,
        navigate: (url) => { window.location.href = url; },
        getAccountName,
        getActiveKey,
        clearCart: L.clearCart,
        startOrderPulsing: L.startOrderPulsing,
        showWallet: L.showWallet,
        messages: {
          connection: L.t('payment.connectionError'),
          failed: L.t('payment.failed'),
          technicalProblem: L.t('payment.technicalProblem'),
          notForwarded: L.t('payment.notForwarded'),
          guestTimeout: L.t('payment.guestTimeout'),
        },
      };
    };
    // One payment at a time: a second tap while one is running must not pay twice.
    const busy = () => isBusy(latest.current.state);
    return {
      payFromAccount: async (purchase) => (busy() ? !!getAccountName() : payFromAccount(purchase, deps())),
      guestCheckout: async (purchase) => (busy() ? false : startGuestCheckout(purchase, deps())),
      createAccount: async (purchase) => (busy() ? false : startCreateAccount(purchase, deps())),
    };
  }, []);
}
