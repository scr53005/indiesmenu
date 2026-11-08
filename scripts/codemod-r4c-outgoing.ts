// R4c codemod (INDIESMENU-REFACTOR-PLAN.md §5b): the outgoing payments of app/menu/page.tsx move
// to hooks/usePaymentFlow.ts + lib/innopay/payment-actions.ts, and the flags they drove
// (orderProcessing, redirecting, guestCheckoutProcessing, flow6Success, waiterCalledSuccess, the
// two timers) give way to the payment state machine.
// Each block is replaced from a unique start anchor to the end of a unique end anchor.
// Idempotent: a block whose start anchor is gone is reported and skipped.
// Run: npx tsx scripts/codemod-r4c-outgoing.ts
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PAGE = join(__dirname, '..', 'app', 'menu', 'page.tsx');

type Block = { name: string; start: string; end: string; replacement: string };

const BLOCKS: Block[] = [
  {
    name: 'guest checkout processing flag + timer',
    start: '  // Prevents double-click on the guest checkout confirm button (duplicate Stripe sessions)\n',
    end: '  const guestCheckoutTimerRef = useRef<NodeJS.Timeout | null>(null);\n',
    replacement: '',
  },
  {
    name: 'flow6Success / waiterCalledSuccess flags',
    start: '  // Flow 6 and waiter successes stay flags until R4c moves those buttons onto the machine.\n',
    end: '  const [waiterCalledSuccess, setWaiterCalledSuccess] = useState(false); // call_waiter\n\n',
    replacement: '',
  },
  {
    name: 'order processing / redirecting flags, timers and their cleanup → busy ticker + payment flow',
    start: '  // State for order processing timer\n',
    end: '  const paymentProgress = progressOf(paymentState);\n',
    replacement: `  // A payment is running (the machine says which): the order button is frozen and shows the
  // seconds since the tap, like the guest modal.
  const paymentBusy = isBusy(paymentState);
  const [busySeconds, setBusySeconds] = useState(0);
  useEffect(() => {
    if (!paymentBusy) return;
    setBusySeconds(0);
    const timer = setInterval(() => setBusySeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [paymentBusy]);
  useEffect(() => {
    // Back button from the hub / Stripe: Safari/Chrome restore this page from memory (bfcache)
    // with its state frozen, so un-freeze the button or it would stay on "Veuillez patienter…".
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) dispatchPayment({ type: 'RESET' }); };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);
  // The waiter banner goes after 15 s, as before.
  useEffect(() => {
    if (paymentState.status !== 'waiter_called') return;
    const timer = setTimeout(() => dispatchPayment({ type: 'DISMISS_BANNER' }), 15_000);
    return () => clearTimeout(timer);
  }, [paymentState.status]);

  // State for header carousel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselImages = [
    '/images/indiesInt1600x878.jpg',
    '/images/indiesExt1600x878.jpg'
  ];

  const showWallet = useCallback((wallet: { accountName: string; euroBalance: number }) => {
    setWalletBalance(wallet);
    setShowWalletBalance(true);
  }, []);

  // Returns from the hub / Stripe and the popup hand-off (hooks/usePaymentReturn.ts; what each
  // return does is in lib/innopay/apply-return.ts).
  usePaymentReturn({
    state: paymentState,
    dispatch: dispatchPayment,
    clearCart,
    startOrderPulsing,
    showWallet,
    refetchBalance,
    cleanUrl: () => cleanUrlPreservingTable('PAYMENT RETURN'),
    onWalletConnected: (username) => {
      setWalletCredentials({ username });
      setShowWalletNotification(false);
    },
  });

  // Duplicate-order guard (Level 2): the same order less than 15 min ago opens the modal; its
  // "order anyway" sets skipDuplicateCheckRef for one retry. Otherwise the memo is stored for the pulse.
  const claimOrder = useCallback((memo: string): boolean => {
    if (!skipDuplicateCheckRef.current && checkDuplicateMemo(memo)) {
      setShowDuplicateModal(true);
      return false;
    }
    skipDuplicateCheckRef.current = false;
    storeMemoBeforeOrder(memo);
    return true;
  }, []);

  // Outgoing payments (hooks/usePaymentFlow.ts; what each flow does is in
  // lib/innopay/payment-actions.ts).
  const paymentFlow = usePaymentFlow({
    state: paymentState,
    dispatch: dispatchPayment,
    table,
    recipient,
    claimOrder,
    clearCart,
    startOrderPulsing,
    showWallet,
  });
  // What is being paid, read from the cart at tap time.
  const purchaseOf = useCallback((waiter: boolean, reason?: string | null): Purchase => (waiter
    ? { kind: 'waiter', reasonEncoded: reason?.trim() ? encodeComment(reason.trim()) : '' }
    : {
      kind: 'order',
      amountEuro: getTotalEurPrice(),
      cartMemo: getMemo(),
      noDiscountEuro: getTotalEurPriceNoDiscount(),
      discount: getDiscountAmount(),
    }), [getTotalEurPrice, getMemo, getTotalEurPriceNoDiscount, getDiscountAmount]);
  // Guest modal: its "pay" button spins while the Stripe session is being created.
  const guestCheckoutProcessing = paymentState.status === 'redirecting' && paymentState.flow === 3;

  const paymentProgress = progressOf(paymentState);
`,
  },
  {
    name: 'handleCallWaiter: account payment',
    start: "    // Check if user has a wallet (SPOKE-KEY-SECURITY.md): only active + memo are stored.\n    const accountName = getAccountName();\n    const activeKey = getActiveKey();\n\n    // Call waiter parameters (0.02 EURO tokens, special memo)\n",
    end: "    } else {\n      // No credentials - show wallet notification (create_account_and_pay flow)\n",
    replacement: `    // An account on this phone pays the 0.02 €: Flow 6, or Flow 7 when the balance is short
    // (lib/innopay/payment-actions.ts). Without a local active key the hub signs with innopay's
    // authority ("mixed" posture).
    const paidFromAccount = await paymentFlow.payFromAccount(purchaseOf(true, reason));
    if (!paidFromAccount) {
      // No credentials - show wallet notification (create_account_and_pay flow)
`,
  },
  {
    name: 'handleCallWaiter deps',
    start: '  }, [table, callWaiter, walletCredentials, getInnopayUrl]);\n',
    end: '  }, [table, callWaiter, walletCredentials, getInnopayUrl]);\n',
    replacement: '  }, [isRestaurantClosed, paymentFlow, purchaseOf, callWaiter, walletCredentials]);\n',
  },
  {
    name: 'handleOrder: account payment (Flows 6 and 7)',
    start: "    // Check if user has a wallet (SPOKE-KEY-SECURITY.md): only active + memo are stored.\n    const accountName = getAccountName();\n    const activeKey = getActiveKey();\n\n    console.log('[WALLET PAYMENT] Checking credentials:', {\n",
    end: "      return; // Exit early - don't run the hive://sign/ flow\n    }\n",
    replacement: `    // An account on this phone: Flow 6, or Flow 7 when the balance is short
    // (lib/innopay/payment-actions.ts). Without a local active key the hub signs with innopay's
    // authority ("mixed" posture).
    if (getAccountName()) {
      // Not during the Flow 6 cooldown: the chain has not shown the last payment yet.
      if (flow6Cooldown > 0) return;
      await paymentFlow.payFromAccount(purchaseOf(false));
      return;
    }
`,
  },
  {
    name: 'handleOrder deps',
    start: '  }, [cart, cart.length, orderNow, walletCredentials, isRestaurantClosed, delayedTiming, startOrderPulsing]);\n',
    end: '  }, [cart, cart.length, orderNow, walletCredentials, isRestaurantClosed, delayedTiming, startOrderPulsing]);\n',
    replacement: '  }, [cart, orderNow, walletCredentials, isRestaurantClosed, delayedTiming, startOrderPulsing, flow6Cooldown, paymentFlow, purchaseOf]);\n',
  },
  {
    name: 'handleCreateAccount',
    start: '  // Handle "Créer un compte" button in wallet notification banner\n',
    end: '  }, [isCallWaiterFlow, waiterReason, table, recipient, getTotalEurPrice, getDiscountAmount, getMemoWithDistriate]);\n',
    replacement: `  // "Créer un compte" in the wallet notification banner: Flow 5 (account + the cart or the waiter
  // call), or Flow 4 with an empty cart. Returns whether it left for the hub (false: duplicate
  // modal), so the banner button springs back.
  const handleCreateAccount = useCallback(
    (): boolean => paymentFlow.createAccount(purchaseOf(isCallWaiterFlow, waiterReason)),
    [paymentFlow, purchaseOf, isCallWaiterFlow, waiterReason],
  );
`,
  },
  {
    name: 'proceedWithGuestCheckout',
    start: '  const proceedWithGuestCheckout = useCallback(async () => {\n',
    end: '  }, [getTotalEurPriceNoDiscount, getMemo, clearCart, table, guestCheckoutProcessing, isCallWaiterFlow, waiterReason, recipient]);\n',
    replacement: `  // Flow 3, from the guest modal's "pay" button (lib/innopay/payment-actions.ts).
  const proceedWithGuestCheckout = useCallback(async () => {
    if (guestCheckoutProcessing) return; // one Stripe session per tap
    setGuestCheckoutStarted(true);
    const left = await paymentFlow.guestCheckout(purchaseOf(isCallWaiterFlow, waiterReason));
    if (!left) {
      // Duplicate modal or grey error banner: back on the menu, the guest key usable again.
      setGuestCheckoutStarted(false);
      setShowGuestWarningModal(false);
    }
  }, [guestCheckoutProcessing, paymentFlow, purchaseOf, isCallWaiterFlow, waiterReason]);
`,
  },
  {
    name: 'success banners read the machine',
    start: "        kind={paymentState.status === 'success' ? paymentState.banner : flow6Success ? 'orderSent' : null}\n",
    end: '      <WaiterCalledBanner show={waiterCalledSuccess} onDismiss={() => setWaiterCalledSuccess(false)} />\n',
    replacement: `        kind={paymentState.status === 'success' ? paymentState.banner : null}
        onDismiss={() => dispatchPayment({ type: 'DISMISS_BANNER' })}
      />
      <WaiterCalledBanner show={paymentState.status === 'waiter_called'} onDismiss={() => dispatchPayment({ type: 'DISMISS_BANNER' })} />
`,
  },
  {
    name: 'guest modal seconds',
    start: '        seconds={guestCheckoutSeconds}\n',
    end: '        seconds={guestCheckoutSeconds}\n',
    replacement: '        seconds={busySeconds}\n',
  },
  {
    name: 'order button',
    start: '            <button onClick={handleOrder} className="order-now-button" disabled={redirecting || orderProcessing || flow6Cooldown > 0}>\n              {redirecting\n',
    end: "                  : orderProcessing ? `${orderElapsedSeconds}s` : t('order.button')}\n",
    replacement: '',
  },
];

function once(text: string, needle: string, from = 0): number {
  const i = text.indexOf(needle, from);
  if (i >= 0 && text.indexOf(needle, i + 1) >= 0) throw new Error(`anchor not unique: ${JSON.stringify(needle.slice(0, 70))}`);
  return i;
}

const raw = readFileSync(PAGE, 'utf8');
const crlf = raw.includes('\r\n');
let page = raw.replace(/\r\n/g, '\n');

for (const block of BLOCKS) {
  const start = once(page, block.start);
  if (start < 0) { console.log(`skip (already done): ${block.name}`); continue; }
  const endAt = once(page, block.end, start);
  if (endAt < 0) throw new Error(`end anchor not found for: ${block.name}`);
  const end = endAt + block.end.length;
  const removed = page.slice(start, end).split('\n').length - 1;
  if (block.name === 'order button') {
    // Keep the button's middle lines (cooldown label) and rewrite only what used the old flags.
    const original = page.slice(start, end);
    block.replacement = original
      .replace('disabled={redirecting || orderProcessing || flow6Cooldown > 0}', 'disabled={paymentBusy || flow6Cooldown > 0}')
      .replace('{redirecting\n', "{paymentState.status === 'redirecting'\n")
      .replace(': orderProcessing ? `${orderElapsedSeconds}s`', ': paymentBusy ? `${busySeconds}s`');
  }
  page = page.slice(0, start) + block.replacement + page.slice(end);
  console.log(`replaced ${removed} lines: ${block.name}`);
}

writeFileSync(PAGE, crlf ? page.replace(/\n/g, '\r\n') : page);
