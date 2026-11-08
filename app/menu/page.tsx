// indiesmenu-front/app/menu/page.tsx
'use client';
import { useEffect, useState, useRef, useCallback, useMemo, useReducer } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '@/app/context/CartContext';
import { useBalance, useInvalidateBalance } from '@/hooks/useBalance';
import MenuItem from '@/components/menu/MenuItem';
import CartItemDisplay from '@/components/menu/CartItemDisplay';
import DelayedOrderPanel from '@/components/menu/DelayedOrderPanel';
import WalletNotificationBanner from '@/components/menu/WalletNotificationBanner';
import MiniWallet, { RubisTeaser, WalletReopenButton } from '@/components/ui/SharedMiniWallet';
import { shouldShowRubisTeaser } from '@innopay/ui';
import { useI18n } from '@/lib/i18n';
import { useWalletPulse } from '@/hooks/useWalletPulse';
import { useMenu } from '@/hooks/useMenu';
import { useImportAccount } from '@/hooks/useImportAccount';
import PaymentProgressBanners, { progressOf } from '@/components/menu/overlays/PaymentProgressBanners';
import PaymentErrorBanner from '@/components/menu/overlays/PaymentErrorBanner';
import { usePaymentReturn } from '@/hooks/usePaymentReturn';
import { initialPaymentState, isBusy, paymentReducer } from '@/lib/innopay/paymentStateMachine';
import { FlowSuccessBanner, WaiterCalledBanner } from '@/components/menu/overlays/SuccessBanners';
import { KitchenClosedBanner, RestaurantClosedPopup } from '@/components/menu/overlays/ClosedNotices';
import AccountCreatedBanner from '@/components/menu/overlays/AccountCreatedBanner';
import DuplicateOrderModal from '@/components/menu/overlays/DuplicateOrderModal';
import ExternalWalletModal from '@/components/menu/overlays/ExternalWalletModal';
import ImportAccountModal from '@/components/menu/overlays/ImportAccountModal';
import GuestCheckoutModal from '@/components/menu/overlays/GuestCheckoutModal';
import WalletStatusBar from '@/components/menu/overlays/WalletStatusBar';
import { CallWaiterModal, WaiterRequestedStrip } from '@/components/menu/overlays/CallWaiterOverlays';
import CartCompositionModal from '@/components/menu/overlays/CartCompositionModal';
import BottomBanner from '@/components/ui/BottomBanner';
import { usePaymentFlow } from '@/hooks/usePaymentFlow';
import type { Purchase } from '@/lib/innopay/payment-actions';
import { encodeComment, checkDuplicateMemo, storeMemoBeforeOrder, getMemoFixedPart } from '@/lib/utils';
import { isKitchenOpen, getKitchenCloseTime, isRestaurantOpen, getNextOpenDay } from '@/lib/config/kitchen-hours';
import {
  getAccountName,
  loadWalletBlob,
  purgeForbidden,
  clearCredentials,
  ensureReady,
} from '@/lib/innopay/keystore';
import {
  RUBIS_EARNABLE, confirmedRubis, isPaymentReturn, markTeaserShown, readSpendRubisFirst, readTeaserShown,
  writeSpendRubisFirst,
} from '@/lib/innopay/rubis';
// import { Prisma} from '@prisma/client';
import '@/app/globals.css'; // Import global styles

// Import the enriched types directly from your menu data file
import type { FormattedDish, FormattedDrink } from '@/lib/data/menu'; // types only: menu.ts is server code
import { useInitialMenu } from '@/lib/data/menu-context';
import { defaultMenuSection, groupMenu, luxembourgMinutes } from '@/lib/data/group-menu';


/** Height of the dishes/drinks bar; must match `.fixed-menu-selector { height }` in globals.css. */
const MENU_SELECTOR_HEIGHT = 73;

export default function MenuPage() {
  const { cart, table, addItem, removeItem, updateQuantity, clearCart, orderNow, callWaiter, getTotalItems, getTotalPrice, getTotalEurPrice, getTotalEurPriceNoDiscount, getDiscountAmount, getMemo, setTable, updateComment, delayedTiming, setDelayedTiming } = useCart();
  // Server-rendered menu (app/menu/layout.tsx); null only when the server could not load it.
  const initialMenu = useInitialMenu();
  // Customer language (lib/i18n): always 'fr' until R5 adds en/lb to SUPPORTED_LANGUAGES.
  const { language, t } = useI18n();
  // Server-sent menu, or the /api/menu fallback (hooks/useMenu.ts).
  const { menu, loading, error, ready: menuReady } = useMenu(initialMenu);
  const [selectedSizes, setSelectedSizes] = useState<{ [key: string]: string }>({}); // Track selected drink sizes
  const [selectedCuisson, setSelectedCuisson] = useState<{ [key: string]: string }>({}); // Track selected cuisson for dishes
  const [selectedIngredients, setSelectedIngredients] = useState<{ [key: string]: string }>({}); // Track selected ingredients for drinks
  const searchParams = useSearchParams();
  // Note: 'table' is now managed by CartContext and persisted in localStorage
  // CartContext automatically reads from URL param or localStorage, with URL taking precedence
  const recipient = process.env.NEXT_PUBLIC_HIVE_ACCOUNT || 'indies.cafe';

  /**
   * Helper function to clean up URL params while preserving the table number
   * Priority: URL param > localStorage > CartContext fallback
   */
  const cleanUrlPreservingTable = useCallback((context: string) => {
    const urlTableParam = searchParams.get('table');
    const preservedTable = urlTableParam || localStorage.getItem('cartTable') || table;
    const newUrl = `${window.location.pathname}?table=${preservedTable}`;
    window.history.replaceState({}, '', newUrl);
    console.log(`[${context}] URL cleaned, preserved table:`, preservedTable);
  }, [searchParams, table]);

  // State for menu navigation
  // With a server-rendered menu, pick the section now so it is in the HTML; Luxembourg time on both sides.
  const [activeMenuSection, setActiveMenuSection] = useState<'dishes' | 'drinks' | null>(
    () => (initialMenu ? defaultMenuSection(luxembourgMinutes(new Date()).minutes) : null));
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());

  // Grouped menu data for easier rendering - ensure types are correct
  // Computed during render (not in an effect) so the server HTML already lists the dishes.
  const { dishes: groupedDishes, drinks: groupedDrinks } = useMemo(() => groupMenu(menu), [menu]);

  // Refs for dynamic height calculation
  const cartRef = useRef<HTMLDivElement>(null);
  const cartItemsListRef = useRef<HTMLDivElement>(null); // Ref for scrollable cart items list
  const menuSelectorRef = useRef<HTMLDivElement>(null);
  const welcomeCarouselRef = useRef<HTMLDivElement>(null);
  const [cartHeight, setCartHeight] = useState(0);
  // Start at the bar's CSS height (globals.css .fixed-menu-selector), not 0: the server HTML
  // must already pad the content, or the menu jumps once JS measures the bar (layout shift).
  const [menuSelectorHeight, setMenuSelectorHeight] = useState(MENU_SELECTOR_HEIGHT);
  const [welcomeCarouselHeight, setWelcomeCarouselHeight] = useState(0);

  // State for wallet notification
  const [showWalletNotification, setShowWalletNotification] = useState(false);
  const [isSafariBanner, setIsSafariBanner] = useState(false); // Track if banner is shown for Safari
  const [isCallWaiterFlow, setIsCallWaiterFlow] = useState(false); // Track if banner is for call waiter
  const [walletCredentials, setWalletCredentials] = useState<{username: string} | null>(null);

  // Payment state machine (lib/innopay/paymentStateMachine.ts). R4b: returns from the hub drive
  // it (hooks/usePaymentReturn.ts); R4c moves the order / waiter buttons onto it too.
  const [paymentState, dispatchPayment] = useReducer(paymentReducer, initialPaymentState);
  const [showCartComposition, setShowCartComposition] = useState(false);

  // State for guest checkout warning modal
  const [showGuestWarningModal, setShowGuestWarningModal] = useState(false);

  // Guest checkout button click state (for visual feedback while Stripe initializes)
  const [guestCheckoutStarted, setGuestCheckoutStarted] = useState(false);

  // Restaurant / kitchen closed states
  const [isRestaurantClosed, setIsRestaurantClosed] = useState(false);
  const [nextOpenInfo, setNextOpenInfo] = useState<{ fr: string; en: string; openTime: string } | null>(null);
  const [showClosedPopup, setShowClosedPopup] = useState(false);
  const [isKitchenClosed, setIsKitchenClosed] = useState(false);
  const [kitchenCloseTime, setKitchenCloseTime] = useState('21h30');
  const [kitchenClosedBannerMinimized, setKitchenClosedBannerMinimized] = useState(false);
  const [showDelayedPanel, setShowDelayedPanel] = useState(false);
  const pendingDishRef = useRef<{ item: any; options?: { [key: string]: string } } | null>(null);
  const [showWaiterModal, setShowWaiterModal] = useState(false);
  const [waiterReason, setWaiterReason] = useState('');
  const [waiterConfirmed, setWaiterConfirmed] = useState(false);

  // State for persistent wallet balance indicator
  const [showWalletBalance, setShowWalletBalance] = useState(false);
  const [walletBalance, setWalletBalance] = useState<{
    accountName: string;
    euroBalance: number;
  } | null>(null);

  // The page is server-rendered (app/menu/layout.tsx), so the server render and the phone's
  // first (hydration) render must not read browser storage: both must produce the same HTML.
  // `hydrated` flips right after the first render; everything browser-only keys off it.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);

  // Get account name for React Query balance fetching. Re-read on every render after
  // hydration (not stored in state) so an account created/imported mid-session is picked up.
  const accountName = hydrated ? getAccountName() : null;
  const isDevHost = hydrated && (
    window.location.hostname === 'localhost' ||
    window.location.hostname.includes('127.0.0.1') ||
    window.location.hostname.startsWith('192.168.'));

  // Fetch balance using React Query (replaces manual useEffect at line 602-705)
  const { balance, rubis, isLoading: balanceLoading, refetch: refetchBalance, source: balanceSource } = useBalance(accountName, {
    enabled: !!accountName && !accountName.startsWith('mockaccount'),
  });

  // Hook to invalidate balance cache (for use after payments)
  // const invalidateBalance = useInvalidateBalance();

  // Sync React Query balance to walletBalance state
  useEffect(() => {
    if (balance !== null && accountName) {
      setWalletBalance({
        accountName,
        euroBalance: balance
      });
      setShowWalletBalance(true);
    }
  }, [balance, accountName]);

  // Flow 6 cooldown: prevent ordering before blockchain finalizes previous payment
  const [flow6Cooldown, setFlow6Cooldown] = useState(0); // seconds remaining
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check and tick Flow 6 cooldown
  useEffect(() => {
    const tick = () => {
      const cooldownUntil = localStorage.getItem('innopay_flow6_cooldown_until');
      if (cooldownUntil) {
        const remaining = Math.ceil((parseInt(cooldownUntil) - Date.now()) / 1000);
        if (remaining > 0) {
          setFlow6Cooldown(remaining);
        } else {
          localStorage.removeItem('innopay_flow6_cooldown_until');
          setFlow6Cooldown(0);
          refetchBalance();
          if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
        }
      } else {
        setFlow6Cooldown(0);
      }
    };
    tick();
    cooldownTimerRef.current = setInterval(tick, 1000);
    return () => { if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current); };
  }, [refetchBalance]);

  // Import an existing account by email + code (hooks/useImportAccount.ts)
  const { importDisabled, openImport: handleImportAccount, modalProps: importModalProps } = useImportAccount();

  // State for external wallet warning modal (FreeNow collision issue)
  const [showExternalWalletWarning, setShowExternalWalletWarning] = useState(false);
  const [pendingHiveUrl, setPendingHiveUrl] = useState<string>('');
  // Full memo (base + distriate suffix) for the pending external-wallet order.
  // Held in a ref so proceedWithExternalWallet can persist it to LS right
  // before the hive:// redirect — that's the point of no return.
  const pendingMemoRef = useRef<string>('');
  const [freeNowOpened, setFreeNowOpened] = useState(false);

  // State for duplicate order prevention modal
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const skipDuplicateCheckRef = useRef(false);

  // State for post-order MiniWallet pulsing (Level 3 guardrail)
  // Persistent: survives page refreshes via localStorage keys:
  //   innopay_latestMemoContent, innopay_latestMemoDateTime, innopay_fulfilledDetectedAt
  // (hooks/useWalletPulse.ts; the rules are in lib/innopay/pulse.ts). The cart is cleared
  // when the order's transfer first shows up in the spoke DB.
  const {
    pulseState: walletPulseState, startOrderPulsing, resetPulse, hidePulse,
  } = useWalletPulse({ onOrderConfirmed: clearCart });

  // RUBIS (RUBIS-PLAN.md §5, SPOKE-DOCUMENTATION.md MiniWallet → RUBIS). Display only.
  const [rubisMounted, setRubisMounted] = useState(false);
  // Start "shown" so nothing plays before the session flag has been read.
  const [teaserShown, setTeaserShown] = useState(true);
  const [paymentReturn, setPaymentReturn] = useState(false);
  const [spendRubisFirst, setSpendRubisFirst] = useState(true);
  useEffect(() => {
    setRubisMounted(true);
    setTeaserShown(readTeaserShown(sessionStorage));
    setPaymentReturn(isPaymentReturn(window.location.search));
    setSpendRubisFirst(readSpendRubisFirst(localStorage));
  }, []);
  // An order in flight (pulse) or a hub return being finalised counts as "paying": no teaser.
  const rubisPaying = paymentReturn || walletPulseState !== 'none';
  // Only while the wallet card is actually on screen (not minimised), on a fresh chain read.
  const holderTeaser = !!accountName && showWalletBalance && !!walletBalance && shouldShowRubisTeaser({
    earnable: RUBIS_EARNABLE, balance: confirmedRubis(balanceSource, rubis), paying: rubisPaying,
    shownThisSession: teaserShown,
  });
  // A guest has no balance: 0 is the honest input (guest checkout earns nothing).
  const guestTeaser = rubisMounted && !accountName && shouldShowRubisTeaser({
    earnable: RUBIS_EARNABLE, balance: 0, paying: rubisPaying, shownThisSession: teaserShown,
  });
  // Remember at the start, so a reload during the teaser does not replay it. The local state
  // flips only at the end, because flipping it now would stop the teaser at once.
  useEffect(() => {
    if (holderTeaser || guestTeaser) markTeaserShown(sessionStorage);
  }, [holderTeaser, guestTeaser]);
  const handleTeaserEnd = useCallback(() => setTeaserShown(true), []);
  const handleSpendRubisFirstChange = useCallback((value: boolean) => {
    setSpendRubisFirst(value);
    writeSpendRubisFirst(localStorage, value);
  }, []);

  // A payment is running (the machine says which): the order button is frozen and shows the
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
  // A hub return is being shown: the "create an account" banner must stay out of the way.
  const hubReturnShowing = paymentState.status === 'processing' || paymentState.status === 'success'
    || paymentState.status === 'account_created' || paymentProgress === 'transmissionError';


  useEffect(() => {
    // Set the table number in the cart context
    setTable(table);
  }, [setTable, table]);

  // Default section and the closed popups, from Luxembourg time, once the menu is there (at once
  // when the server sent it, after the fallback fetch otherwise). Client-side only (effect): the
  // popups must reflect the phone's "now", and they are not part of the first paint.
  const serviceRulesApplied = useRef(false);
  useEffect(() => {
    if (!menuReady || serviceRulesApplied.current) return;
    serviceRulesApplied.current = true;
    const { minutes: totalMinutes, dayOfWeek } = luxembourgMinutes(new Date());
    // Lunch 11:45-14:15 and dinner 18:30-21:59 open on the dishes, otherwise on the drinks.
    setActiveMenuSection(defaultMenuSection(totalMinutes));

    // Restaurant & kitchen closure checks
    if (!isRestaurantOpen(dayOfWeek, totalMinutes)) {
      setIsRestaurantClosed(true);
      setNextOpenInfo(getNextOpenDay(dayOfWeek));
      console.log('Restaurant closed');
    } else if (!isKitchenOpen(dayOfWeek, totalMinutes)) {
      setIsKitchenClosed(true);
      const closeTime = getKitchenCloseTime(dayOfWeek, totalMinutes);
      setKitchenCloseTime(closeTime || 'fermée');
      console.log(`Kitchen closed (closeTime: ${closeTime})`);
    }
  }, [menuReady]);


  // Load saved wallet credentials on mount
  useEffect(() => {
    // One-time, idempotent purge of legacy forbidden keys (master password / posting
    // key) from returning customers' browsers — SPOKE-KEY-SECURITY.md §4 step 3.
    purgeForbidden();
    // Kick off the at-rest-key unlock (decrypt active+memo into memory, migrating
    // any legacy plaintext) so the sync getters are ready by interaction time —
    // SPOKE-KEY-SECURITY.md §9. Fire-and-forget; getAccountName() is plaintext and
    // doesn't depend on it.
    void ensureReady();

    const savedCredentials = loadWalletBlob();
    if (savedCredentials) {
      setWalletCredentials(savedCredentials);
      console.log('Loaded wallet credentials:', savedCredentials.username);
    } else {
      // Detect Safari/iOS and show wallet notification proactively
      // BUT only if no account exists in localStorage
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const hasAccount = !!getAccountName();

      if ((isSafari || isIOS) && !hasAccount) {
        console.log('Safari/iOS detected (no account) - showing wallet notification proactively');
        setShowWalletNotification(true);
        setIsSafariBanner(true);
      } else if (hasAccount) {
        console.log('Safari/iOS detected but account exists - skipping banner');
      }
    }
  }, []);


  // Don't show wallet notification on page load anymore
  // It will only show when an order fails due to missing protocol handler

  // Carousel rotation effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % carouselImages.length);
    }, 8000); // Rotate every 8 seconds

    return () => clearInterval(interval);
  }, [carouselImages.length]);

  // Effect to calculate dynamic heights for fixed elements
  useEffect(() => {
    const calculateHeights = () => {
      setTimeout(() => {
        if (cart.length > 0 && cartRef.current) {
          setCartHeight(cartRef.current.offsetHeight);
        } else {
          setCartHeight(0); // Cart is empty, reset height to 0
        }
        if (menuSelectorRef.current) {
          setMenuSelectorHeight(menuSelectorRef.current.offsetHeight);
        }
        if (welcomeCarouselRef.current) {
          setWelcomeCarouselHeight(welcomeCarouselRef.current.offsetHeight);
        }
      }, 0);
    };

    calculateHeights(); // Calculate on mount

    window.addEventListener('resize', calculateHeights);

    const cartObserver = new MutationObserver((mutationsList) => {
        for(const mutation of mutationsList) {
            if (mutation.type === 'childList' || (mutation.type === 'attributes' && mutation.attributeName === 'style')) {
                calculateHeights();
                break;
            }
        }
    });

    if (cartRef.current) {
      cartObserver.observe(cartRef.current, { childList: true, attributes: true, subtree: false });
    }

    return () => {
      window.removeEventListener('resize', calculateHeights);
      if (cartRef.current) {
        cartObserver.disconnect();
      }
    };
  }, [cart.length, cart]);

  // Auto-scroll cart to bottom when items are added and show gradient indicator when scrollable
  useEffect(() => {
    if (cartItemsListRef.current && cart.length > 0) {
      const cartItemsList = cartItemsListRef.current;

      // Smooth scroll to bottom to show newly added item
      cartItemsList.scrollTo({
        top: cartItemsList.scrollHeight,
        behavior: 'smooth'
      });

      // Check if content is scrollable and toggle gradient indicator
      const checkScrollable = () => {
        if (cartItemsList.scrollHeight > cartItemsList.clientHeight) {
          // Content is scrollable, show gradient indicator
          cartItemsList.style.setProperty('--show-gradient', '1');
        } else {
          // Content fits without scrolling, hide gradient
          cartItemsList.style.setProperty('--show-gradient', '0');
        }
      };

      // Check immediately and after a short delay (for animations)
      checkScrollable();
      setTimeout(checkScrollable, 300);
    }
  }, [cart.length]);

  // Memoized callbacks
  const handleSizeChange = useCallback((drinkId: string, size: string) => {
    setSelectedSizes(prev => ({ ...prev, [drinkId]: size }));
  }, []);

  const handleCuissonChange = useCallback((dishId: string, cuisson: string) => {
    setSelectedCuisson(prev => ({ ...prev, [dishId]: cuisson }));
  }, []);

  const handleIngredientChange = useCallback((drinkId: string, ingredient: string) => {
    setSelectedIngredients(prev => ({ ...prev, [drinkId]: ingredient }));
  }, []);

  // Updated handleAddItem to correctly process options passed from MenuItem
  const handleAddItem = useCallback((item: FormattedDish | FormattedDrink, options?: { [key: string]: string }) => {
    // Kitchen closed + no delayed timing: store pending dish and auto-open delayed ordering panel
    if (isKitchenClosed && table && item.type === 'dish' && !delayedTiming) {
      pendingDishRef.current = { item, options };
      setShowDelayedPanel(true);
      return;
    }

    let cartItemId = item.id;
    let cartItemName = item.name;
    let cartItemPrice: string = '0.00';
    let cartItemDiscount: number = 1.0; // Default: no discount

    const itemOptions = options || {}; // Use the options passed from MenuItem

    if (item.type === 'dish') {
      const dishItem = item as FormattedDish;
      cartItemPrice = dishItem.price; // Use the base price for dishes
      cartItemDiscount = dishItem.discount; // Get discount from dish
      console.log('[MENU] Adding dish to cart:', { id: item.id, name: item.name, price: cartItemPrice, discount: cartItemDiscount });
      // If it's a dish and has a selected cuisson, append it to ID and name
      if (itemOptions.cuisson) {
        cartItemId = `${item.id}-${itemOptions.cuisson.toLowerCase().replace(/\s/g, '-')}`;
        cartItemName = item.name;
      }
    } else { // It's a drink
      const drinkItem = item as FormattedDrink;

      // Build cart item ID from base ID, ingredient (if any), and size (if any)
      const idParts = [item.id];
      if (itemOptions.ingredient) {
        idParts.push(itemOptions.ingredient.toLowerCase().replace(/\s/g, '-'));
      }
      if (itemOptions.size) {
        idParts.push(itemOptions.size.toLowerCase().replace(/\s/g, '-'));
      }
      cartItemId = idParts.join('-');

      // Update price and discount based on selected size
      if (itemOptions.size) {
        const selectedSizeOption = drinkItem.availableSizes.find(s => s.size === itemOptions.size);
        if (selectedSizeOption) {
          cartItemPrice = selectedSizeOption.price;
          cartItemDiscount = selectedSizeOption.discount; // Get discount from size
        }
      } else {
        const firstSize = drinkItem.availableSizes[0];
        cartItemPrice = firstSize?.price || '0.00';
        cartItemDiscount = firstSize?.discount ?? 1.0;
      }
      console.log('[MENU] Adding drink to cart:', { id: item.id, name: item.name, price: cartItemPrice, discount: cartItemDiscount, size: itemOptions.size });
    }

    console.log('[MENU] Final cart item being added:', { id: cartItemId, name: cartItemName, price: cartItemPrice, discount: cartItemDiscount });

    addItem({
      id: cartItemId,
      name: cartItemName,
      price: cartItemPrice,
      quantity: 1,
      options: itemOptions,
      conversion_rate: menu?.conversion_rate,
      discount: cartItemDiscount, // Pass discount to cart
    });
  }, [addItem, menu, isKitchenClosed, table, delayedTiming]);

  const handleCallWaiter = useCallback(async (reason?: string) => {
    console.log('[CALL WAITER] Initiating call waiter flow');

    // Restaurant closed — can't call waiter
    if (isRestaurantClosed) {
      setShowClosedPopup(true);
      setShowWaiterModal(false);
      return;
    }

    // An account on this phone pays the 0.02 €: Flow 6, or Flow 7 when the balance is short
    // (lib/innopay/payment-actions.ts). Without a local active key the hub signs with innopay's
    // authority ("mixed" posture).
    const paidFromAccount = await paymentFlow.payFromAccount(purchaseOf(true, reason));
    if (!paidFromAccount) {
      // No credentials - show wallet notification (create_account_and_pay flow)
      console.log('[CALL WAITER] No credentials, showing wallet notification');

      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isSafari || isIOS) {
        // Safari/iOS: Skip protocol handler, show wallet notification immediately
        console.log('[CALL WAITER] Safari/iOS detected - showing wallet notification');
        setIsCallWaiterFlow(true);
        setShowWalletNotification(true);
        setIsSafariBanner(false);
      } else {
        // Try protocol handler first for non-Safari browsers
        try {
          const hiveUrl = callWaiter();
          window.location.href = hiveUrl;

          // Check if protocol handler worked
          setTimeout(() => {
            const protocolHandlerWorked = document.hidden;

            if (!protocolHandlerWorked && !walletCredentials) {
              console.log('[CALL WAITER] Protocol handler did not work - showing wallet notification');
              setIsCallWaiterFlow(true);
              setShowWalletNotification(true);
              setIsSafariBanner(false);
            }
          }, 3000);
        } catch (error) {
          console.error('[CALL WAITER] Error with protocol handler:', error);
          setIsCallWaiterFlow(true);
          setShowWalletNotification(true);
          setIsSafariBanner(false);
        }
      }
    }
  }, [isRestaurantClosed, paymentFlow, purchaseOf, callWaiter, walletCredentials]);

  const handleOrder = useCallback(async () => {
    if (cart.length === 0) {
      // No items in cart, show alert
      alert('Rien a commander !');
      return;
    }

    // Restaurant closed: dishes → auto-delayed, drinks-only → closed popup
    if (isRestaurantClosed && !delayedTiming) {
      const hasDishes = cart.some(item => item.id.startsWith('dish-'));
      if (hasDishes) {
        setShowDelayedPanel(true);
        return;
      }
      // Drinks-only cart while restaurant is closed
      setShowClosedPopup(true);
      return;
    }

    // An account on this phone: Flow 6, or Flow 7 when the balance is short
    // (lib/innopay/payment-actions.ts). Without a local active key the hub signs with innopay's
    // authority ("mixed" posture).
    if (getAccountName()) {
      // Not during the Flow 6 cooldown: the chain has not shown the last payment yet.
      if (flow6Cooldown > 0) return;
      await paymentFlow.payFromAccount(purchaseOf(false));
      return;
    }

    // If we reach here, no credentials found
    console.log('[WALLET PAYMENT] No credentials found, using hive://sign/ flow');

    // Detect Safari to avoid "cannot open the page" error
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isSafari || isIOS) {
      // Safari/iOS: Skip protocol handler, show wallet notification immediately
      console.log('[WALLET PAYMENT] Safari/iOS detected - skipping protocol handler, showing wallet notification');
      setShowWalletNotification(true);
      setIsSafariBanner(false);
      return;
    }

    // EXISTING FLOW: Non-Safari browsers - use hive://sign/ protocol handler
    const { url: hiveOpUrl, memo: fullMemo } = orderNow();

    // Set a flag to detect if the page loses focus (app opened).
    // Note: the cart is NOT cleared from this heuristic anymore — that's the
    // pulse watcher's job (clears on first transfer detection in DB, which is
    // the authoritative "order landed" signal).
    let protocolHandlerWorked = false;
    let blurTime = 0;

    const blurHandler = () => {
      blurTime = Date.now();
      console.log('Page lost focus - protocol handler might have worked');
    };

    const focusHandler = () => {
      if (blurTime > 0) {
        const blurDuration = Date.now() - blurTime;
        console.log(`Page regained focus after ${blurDuration}ms`);
        if (blurDuration > 2000) {
          protocolHandlerWorked = true;
        }
      }
    };

    window.addEventListener('blur', blurHandler);
    window.addEventListener('focus', focusHandler);

    // Commitment point: persist memo + kick pulse, then redirect.
    try {
      storeMemoBeforeOrder(fullMemo);
      startOrderPulsing(getMemoFixedPart(fullMemo));
    } catch (err) {
      console.warn('[EXTERNAL WALLET] Pre-redirect hooks threw:', err);
    }

    // Try to open the hive:// URL
    try {
      window.location.href = hiveOpUrl;
    } catch (error) {
      console.log('Failed to open hive:// URL:', error);
      // Safari might throw error - treat as protocol handler not working
      protocolHandlerWorked = false;
    }

    // After 3 seconds, check if the protocol handler worked
    setTimeout(() => {
      window.removeEventListener('blur', blurHandler);
      window.removeEventListener('focus', focusHandler);

      // Show banner if protocol handler didn't work AND user doesn't have wallet credentials
      if (!protocolHandlerWorked && !walletCredentials) {
        console.log('Protocol handler did not work - showing wallet notification');
        // The external-wallet attempt did NOT place an order (no handler / desktop),
        // so undo the optimistic memo commit + pulse it made at the commitment point
        // above. Otherwise picking Flow 3/5/8 from the banner trips the duplicate-order
        // guard (checkDuplicateMemo sees this just-stored memo within 15 min) and the
        // pulse falsely shows an in-flight order. (We only reach here when the handler
        // didn't fire, so a real external-wallet order the user left for is untouched.)
        localStorage.removeItem('innopay_latestMemoContent');
        localStorage.removeItem('innopay_latestMemoDateTime');
        setShowWalletNotification(true);
        setIsSafariBanner(false); // This is a protocol handler failure, not Safari detection
      }
    }, 3000);
  }, [cart, orderNow, walletCredentials, isRestaurantClosed, delayedTiming, startOrderPulsing, flow6Cooldown, paymentFlow, purchaseOf]);

  const handleGuestCheckout = useCallback(() => {
    if (cart.length === 0) {
      alert('Rien a commander !');
      return;
    }
    // Show warning modal first
    setShowGuestWarningModal(true);
  }, [cart.length]);

  // Step 1: Show warning modal instead of immediately opening hive:// URL
  const handleExternalWallet = useCallback(() => {
    // For call waiter flow, always allow (no cart check)
    if (!isCallWaiterFlow && cart.length === 0) {
      alert('Rien a commander !');
      return;
    }

    console.log('[EXTERNAL WALLET] User requested external wallet - showing warning modal');

    if (isCallWaiterFlow) {
      // Call-waiter has no distriate → no transfer tracking, no cart to clear.
      setPendingHiveUrl(callWaiter());
      pendingMemoRef.current = '';
    } else {
      const { url, memo } = orderNow();
      setPendingHiveUrl(url);
      pendingMemoRef.current = memo;
    }
    setFreeNowOpened(false);
    setShowExternalWalletWarning(true);
  }, [cart.length, orderNow, isCallWaiterFlow, callWaiter, isRestaurantClosed]);

  // Step 2: Actually open the hive:// URL after user confirms
  const proceedWithExternalWallet = useCallback(() => {
    if (!pendingHiveUrl) return;

    console.log('[EXTERNAL WALLET] User confirmed - opening hive:// URL');

    // Cart-clear is handled by the pulse watcher (fires on first transfer
    // detection in the spoke DB). Blur/focus is only used here to decide
    // whether to close the warning modal / show FreeNow recovery.
    let protocolHandlerWorked = false;
    let blurTime = 0;

    const blurHandler = () => {
      blurTime = Date.now();
      console.log('[EXTERNAL WALLET] Page lost focus - protocol handler might have worked');
    };

    const focusHandler = () => {
      if (blurTime > 0) {
        const blurDuration = Date.now() - blurTime;
        console.log(`[EXTERNAL WALLET] Page regained focus after ${blurDuration}ms`);
        if (blurDuration > 2000) {
          protocolHandlerWorked = true;
          setShowExternalWalletWarning(false);
        } else {
          // Short blur likely means Safari error OR FreeNow opened
          setFreeNowOpened(true);
        }
      }
    };

    window.addEventListener('blur', blurHandler);
    window.addEventListener('focus', focusHandler);

    // Commitment point: persist memo + kick pulse (skip for call-waiter — no
    // distriate to track), then redirect.
    if (!isCallWaiterFlow && pendingMemoRef.current) {
      try {
        storeMemoBeforeOrder(pendingMemoRef.current);
        startOrderPulsing(getMemoFixedPart(pendingMemoRef.current));
      } catch (err) {
        console.warn('[EXTERNAL WALLET] Pre-redirect hooks threw:', err);
      }
    }

    // Try to open the hive:// URL
    try {
      window.location.href = pendingHiveUrl;
    } catch (error) {
      console.log('[EXTERNAL WALLET] Failed to open hive:// URL:', error);
      setFreeNowOpened(true);
    }

    // After 3 seconds, check if the protocol handler worked
    setTimeout(() => {
      window.removeEventListener('blur', blurHandler);
      window.removeEventListener('focus', focusHandler);

      if (!protocolHandlerWorked) {
        console.log('[EXTERNAL WALLET] Protocol handler did not work - showing recovery options');
        setFreeNowOpened(true);
      }
    }, 3000);
  }, [pendingHiveUrl, isCallWaiterFlow, startOrderPulsing]);

  // Copy hive:// URL to clipboard for manual paste into Hive Keychain
  const copyHiveUrlToClipboard = useCallback(async () => {
    if (!pendingHiveUrl) return;
    try {
      await navigator.clipboard.writeText(pendingHiveUrl);
      alert('Lien copié! Ouvrez Hive Keychain et collez le lien.');
    } catch (error) {
      console.error('[EXTERNAL WALLET] Failed to copy to clipboard:', error);
      // Fallback: show the URL in a prompt
      prompt('Copiez ce lien et collez-le dans Hive Keychain:', pendingHiveUrl);
    }
  }, [pendingHiveUrl]);

  // "Créer un compte" in the wallet notification banner: Flow 5 (account + the cart or the waiter
  // call), or Flow 4 with an empty cart. Returns whether it left for the hub (false: duplicate
  // modal), so the banner button springs back.
  const handleCreateAccount = useCallback(
    (): Promise<boolean> => paymentFlow.createAccount(purchaseOf(isCallWaiterFlow, waiterReason)),
    [paymentFlow, purchaseOf, isCallWaiterFlow, waiterReason],
  );

  // Handle dismissing wallet notification banner
  const handleDismissBanner = useCallback(() => {
    setShowWalletNotification(false);
    setIsCallWaiterFlow(false);
    console.log('Notification dismissed temporarily - will show again on next order attempt');
  }, []);

  // Handle guest checkout from wallet notification banner
  const handleBannerGuestCheckout = useCallback(() => {
    if (isCallWaiterFlow) {
      // Waiter flow: skip cart check, show warning modal directly
      setShowGuestWarningModal(true);
    } else {
      // Only opens the 5% warning modal: the customer may still go back and choose an
      // account. The guest key sinks in proceedWithGuestCheckout, when the order really leaves.
      handleGuestCheckout();
    }
  }, [handleGuestCheckout, isCallWaiterFlow]);

  // Flow 3, from the guest modal's "pay" button (lib/innopay/payment-actions.ts).
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


  const toggleCategory = useCallback((categoryId: number) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  const totalFixedHeaderHeight = cartHeight + menuSelectorHeight;

  // Loading Skeleton Component (shown while menu data is fetching)
  const MenuSkeleton = () => (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Fixed Menu Selector Skeleton */}
      <div
        className="fixed-menu-selector bg-gray-300 animate-pulse"
        style={{ top: '0px' }}
      >
        <div className="h-12 bg-gray-400 rounded mx-2"></div>
      </div>

      {/* Main Content Skeleton */}
      <div className="main-content-area" style={{ paddingTop: '80px' }}>
        {/* Welcome Section Skeleton */}
        <section className="relative h-64 flex items-center justify-center overflow-hidden bg-gray-300 animate-pulse">
          <div className="relative z-10 text-center text-gray-500 px-4">
            <div className="h-12 w-64 bg-gray-400 rounded mx-auto mb-4"></div>
            <div className="h-6 w-48 bg-gray-400 rounded mx-auto"></div>
          </div>
        </section>

        {/* Category Skeletons */}
        <div className="menu-section">
          {[1, 2, 3].map((i) => (
            <div key={i} className="category-folder-container">
              <div className="category-folder-header bg-gray-300 animate-pulse">
                <div className="h-6 w-32 bg-gray-400 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <MenuSkeleton />;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Wallet Notification Banner — memoized component for fast re-display */}
      {/* !accountName: the banner offers import / create / guest, which only makes sense without
          an account. Its flag can be set on mount before a hub return has saved the new keys. */}
      {showWalletNotification && !walletCredentials && !accountName && !hubReturnShowing && (
        <WalletNotificationBanner
          topOffset={cart.length === 0 && welcomeCarouselHeight > 0
            ? `${totalFixedHeaderHeight + welcomeCarouselHeight}px`
            : `${totalFixedHeaderHeight}px`}
          isSafariBanner={isSafariBanner}
          cartEmpty={cart.length === 0}
          isCallWaiterFlow={isCallWaiterFlow}
          importDisabled={importDisabled}
          guestCheckoutStarted={guestCheckoutStarted}
          table={table}
          recipient={recipient}
          onImportAccount={handleImportAccount}
          onCreateAccount={handleCreateAccount}
          onExternalWallet={handleExternalWallet}
          onGuestCheckout={handleBannerGuestCheckout}
          onDismiss={handleDismissBanner}
        />
      )}

      {/* Payment progress / transmission error / account-created processing (yellow, grey) */}
      <PaymentProgressBanners
        progress={paymentProgress}
        onShowOrder={() => setShowCartComposition(true)}
        onClearOrder={() => {
          clearCart();
          dispatchPayment({ type: 'DISMISS_BANNER' });
        }}
      />

      {/* Payment failed (e.g. the wallet could not be loaded after a return) */}
      <PaymentErrorBanner
        message={paymentState.status === 'error' && paymentState.reason === 'failed' ? paymentState.error : null}
        onDismiss={() => dispatchPayment({ type: 'DISMISS_BANNER' })}
      />

      {/* UNIFIED Success Banner - Flow 4 (wallet ready) / Flows 3, 5, 6, 7 (order sent) */}
      <FlowSuccessBanner
        kind={paymentState.status === 'success' ? paymentState.banner : null}
        onDismiss={() => dispatchPayment({ type: 'DISMISS_BANNER' })}
      />
      <WaiterCalledBanner show={paymentState.status === 'waiter_called'} onDismiss={() => dispatchPayment({ type: 'DISMISS_BANNER' })} />

      {/* Restaurant Closed Popup — shown when trying to order drinks outside opening hours */}
      {showClosedPopup && <RestaurantClosedPopup info={nextOpenInfo} onClose={() => setShowClosedPopup(false)} />}

      {/* Kitchen Closed Banner — dine-in customers after hours */}
      {isKitchenClosed && table && (
        <KitchenClosedBanner
          closeTime={kitchenCloseTime}
          minimized={kitchenClosedBannerMinimized}
          onMinimizedChange={setKitchenClosedBannerMinimized}
        />
      )}

      {/* DEV ONLY: Clear localStorage button */}
      {isDevHost && (
        <div className="fixed top-2 right-2 z-[10001]">
          <button
            onClick={() => {
              if (confirm('Clear all localStorage and sessionStorage (dev only)? Table number will be preserved.')) {
                // Preserve table number
                const currentTable = new URLSearchParams(window.location.search).get('table');

                // Clear all innopay-related items from localStorage
                clearCredentials(); // account name, active, memo, blob + any forbidden leftovers
                localStorage.removeItem('innopay_import_attempts');
                localStorage.removeItem('innopay_accounts');
                localStorage.removeItem('innopay_lastBalance');
                localStorage.removeItem('innopay_pending_order');
                localStorage.removeItem('innopay_flow_pending'); // Flow marker (Flow 5, 7, etc.)
                localStorage.removeItem('innopay_flow5_pending'); // Legacy marker (cleanup)
                localStorage.removeItem('cart');

                // Clear all sessionStorage
                sessionStorage.clear();

                console.log('[DEV] localStorage and sessionStorage cleared, preserving table:', currentTable);
                alert('Storage cleared! Reloading...');

                // Reload with table parameter if it exists
                if (currentTable) {
                  window.location.href = `${window.location.pathname}?table=${currentTable}`;
                } else {
                  window.location.reload();
                }
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded shadow-lg font-mono"
            title="Development only: Clear localStorage and sessionStorage"
          >
            🧹 Clear LS
          </button>
        </div>
      )}

      {/* Account Creation Success - Blue Banner (credentials sent by email, Q-R4-1) */}
      <AccountCreatedBanner
        account={paymentState.status === 'account_created'
          ? { accountName: paymentState.accountName, euroBalance: paymentState.euroBalance }
          : null}
        onDismiss={() => {
          dispatchPayment({ type: 'DISMISS_BANNER' });
        }}
      />

      {/* Guest RUBIS teaser, just above the 30 px BottomBanner. */}
      <RubisTeaser show={guestTeaser} onEnd={handleTeaserEnd} language={language} bottom={44} />

      {/* Wallet Balance Reopen Button */}
      <WalletReopenButton
        language={language}
        visible={!showWalletBalance && !!walletBalance}
        onClick={() => setShowWalletBalance(true)}
      />

      {/* Persistent Wallet Balance Indicator */}
      {walletBalance && (
        <MiniWallet
          language={language}
          balance={walletBalance}
          visible={showWalletBalance}
          onClose={() => {
            if (walletPulseState !== 'none') hidePulse();
            setShowWalletBalance(false);
          }}
          balanceSource={balanceSource || undefined}
          pulseState={walletPulseState}
          rubisBalance={rubis}
          rubisEarnable={RUBIS_EARNABLE}
          rubisTeaser={holderTeaser}
          onRubisTeaserEnd={handleTeaserEnd}
          spendRubisFirst={spendRubisFirst}
          onSpendRubisFirstChange={handleSpendRubisFirstChange}
          onPulseReset={resetPulse}
        />
      )}

      {/* Duplicate Order Prevention Modal */}
      <DuplicateOrderModal
        open={showDuplicateModal}
        onOrderAnyway={() => {
          setShowDuplicateModal(false);
          setShowGuestWarningModal(false);
          skipDuplicateCheckRef.current = true;
          // Mixed posture: an account is sufficient — a missing local active key
          // is handled by the innopay-authority fallback inside handleOrder().
          const hasCredentials = !!getAccountName();
          if (hasCredentials) {
            handleOrder();
          } else {
            setShowWalletNotification(true);
          }
        }}
        onCancel={() => {
          setShowDuplicateModal(false);
          setShowGuestWarningModal(false);
          setGuestCheckoutStarted(false);
        }}
      />

      {/* External Wallet Warning Modal - FreeNow collision workaround */}
      <ExternalWalletModal
        open={showExternalWalletWarning}
        freeNowOpened={freeNowOpened}
        onProceed={proceedWithExternalWallet}
        onCopyLink={copyHiveUrlToClipboard}
        onClose={() => {
          setShowExternalWalletWarning(false);
          setPendingHiveUrl('');
          setFreeNowOpened(false);
        }}
        onCancel={() => {
          setShowExternalWalletWarning(false);
          setPendingHiveUrl('');
        }}
      />

      {/* Import Account Modal */}
      <ImportAccountModal {...importModalProps} />

      {/* Guest Checkout Warning Modal — adapts for waiter flow vs normal order */}
      <GuestCheckoutModal
        open={showGuestWarningModal}
        waiterFlow={isCallWaiterFlow}
        processing={guestCheckoutProcessing}
        seconds={busySeconds}
        guestTotal={(parseFloat(getTotalEurPriceNoDiscount()) * 1.05).toFixed(2)}
        discountLost={getDiscountAmount()}
        onProceed={() => proceedWithGuestCheckout()}
        onBack={() => { setShowGuestWarningModal(false); setGuestCheckoutStarted(false); }}
      />

      {/* Wallet Status Display - Shows when credentials are loaded */}
      <WalletStatusBar
        username={walletCredentials?.username ?? null}
        onDisconnect={() => {
          clearCredentials(); // remove all key material, not just the display blob
          setWalletCredentials(null);
        }}
      />

      {/* Fixed Cart Section */}
      {cart.length > 0 && (
        <div ref={cartRef} className="fixed-cart-container">
          <div className="cart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}>
            <div>
              <span>Votre Ordre ({getTotalItems()} items)</span>
              <br/><span className="text-sm">Les prix affichés incluent le discount</span>
            </div>
            <button
              onClick={() => setShowDelayedPanel(!showDelayedPanel)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: delayedTiming ? (delayedTiming.type === 'pickup' ? '#6b7c3f' : '#6b3fa0') : 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.4)', borderRadius: 8,
                padding: '4px 10px', color: 'white', fontSize: '0.8rem',
                cursor: 'pointer', fontWeight: 600, transition: 'background 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              &#128340;{' '}
              {delayedTiming
                ? `${delayedTiming.hour.toString().padStart(2, '0')}h${delayedTiming.minute.toString().padStart(2, '0')}`
                : 'Différée'}
            </button>
          </div>
          <div ref={cartItemsListRef} className="cart-items-list">
            {cart.map(item => (
              // Use the memoized CartItemDisplay component
              <CartItemDisplay
                key={item.id}
                item={item}
                tableParam={table}
                updateQuantity={updateQuantity}
                removeItem={removeItem}
                updateComment={updateComment}
              />
            ))}
          </div>
          <div className="cart-summary-row">
            <span className="cart-total-text">Total: {getTotalEurPrice()}&nbsp;€</span>
            <button onClick={() => { setWaiterReason(''); setWaiterConfirmed(false); setShowWaiterModal(true); }} className="call-waiter-button">
              Serveur&nbsp;!
            </button>
            <button onClick={handleOrder} className="order-now-button" disabled={paymentBusy || flow6Cooldown > 0}>
              {paymentState.status === 'redirecting'
                ? t('order.redirecting', { seconds: busySeconds })
                : flow6Cooldown > 0
                  ? t('order.balanceCooldown', { seconds: flow6Cooldown })
                  : paymentBusy ? `${busySeconds}s` : t('order.button')}
            </button>
          </div>
        </div>
      )}

      {/* Delayed Order Panel */}
      <DelayedOrderPanel
        isOpen={showDelayedPanel}
        onClose={() => setShowDelayedPanel(false)}
        onConfirm={(timing) => {
          setDelayedTiming(timing);
          setShowDelayedPanel(false);
          // If a dish was pending (user tapped dish during closed hours), add it now
          if (pendingDishRef.current) {
            const { item, options: pendingOptions } = pendingDishRef.current;
            pendingDishRef.current = null;
            const dishItem = item as any;
            let cartItemId = dishItem.id;
            const cartItemName = dishItem.name;
            const cartItemPrice = dishItem.price || '0.00';
            const cartItemDiscount = dishItem.discount ?? 1.0;
            const itemOptions = pendingOptions || {};
            if (itemOptions.cuisson) {
              cartItemId = `${dishItem.id}-${itemOptions.cuisson.toLowerCase().replace(/\s/g, '-')}`;
            }
            addItem({
              id: cartItemId,
              name: cartItemName,
              price: cartItemPrice,
              quantity: 1,
              options: itemOptions,
              conversion_rate: menu?.conversion_rate,
              discount: cartItemDiscount,
            });
          }
        }}
        cartHasDishes={isKitchenClosed || cart.some(item => item.id.startsWith('dish-'))}
        currentDay={luxembourgMinutes(new Date()).dayOfWeek /* same answer on the UTC server and the phone */}
        hasTable={!!table}
      />

      {/* Call Waiter Modal — two modes: input (centered modal) and confirmed (top strip) */}
      <CallWaiterModal
        open={showWaiterModal && !waiterConfirmed}
        reason={waiterReason}
        onReasonChange={setWaiterReason}
        onCancel={() => setShowWaiterModal(false)}
        onConfirm={() => {
          // Check if user has an account — if yes, direct payment (a missing local
          // active key is handled by the innopay-authority fallback); if no, show strip + banner
          const accountName = getAccountName();

          if (accountName) {
            // Has credentials — direct payment flow
            setShowWaiterModal(false);
            handleCallWaiter(waiterReason);
          } else {
            // No credentials — transform to strip + show wallet banner
            setWaiterConfirmed(true);
            setIsCallWaiterFlow(true);
            setShowWalletNotification(true);
            setIsSafariBanner(false);
          }
        }}
      />

      {/* Call Waiter — confirmed strip (non-blocking, stays at top) */}
      <WaiterRequestedStrip
        show={showWaiterModal && waiterConfirmed}
        reason={waiterReason ?? ''}
        top={totalFixedHeaderHeight + 8}
        onCancel={() => {
          setShowWaiterModal(false);
          setWaiterConfirmed(false);
          setIsCallWaiterFlow(false);
          setShowWalletNotification(false);
        }}
      />

      {/* Fixed Menu Selector (Dishes/Drinks) - Positioned dynamically */}
      <div
        ref={menuSelectorRef}
        className="fixed-menu-selector"
        style={{ top: `${cartHeight}px` }}
      >
        <button
          onClick={() => setActiveMenuSection('dishes')}
          className={`menu-section-button ${activeMenuSection === 'dishes' ? 'active' : ''}`}
        >
          <span className="flex items-center justify-center gap-x-2">
            <img src='/images/burger-32x28.jpg' alt='burger' className="w-8 h-7 object-contain"/>Les plats
          </span>
        </button>
        <button
          onClick={() => setActiveMenuSection('drinks')}
          className={`menu-section-button ${activeMenuSection === 'drinks' ? 'active' : ''}`}
        >
          <span className="flex items-center justify-center gap-x-2">
            Les boissons<img src='/images/biere-32x30.jpg' alt='biere' className="w-8 h-7 object-contain"/>
          </span>
        </button>
      </div>

      {/* Main Scrollable Content Area */}
      <div className="main-content-area" style={{ paddingTop: `${totalFixedHeaderHeight}px` }}>

        {/* New Welcome Section - Appears only when cart is empty */}
        {cart.length === 0 && (
          <section ref={welcomeCarouselRef} className="relative h-64 flex items-center justify-center overflow-hidden bg-gray-200">
            {/* Carousel Images */}
            {carouselImages.map((image, index) => (
              <Image
                key={image}
                src={image}
                alt="Indies Cafe"
                fill
                sizes="100vw"
                // Only the first slide is visible on load (and is the page's LCP); preloading
                // the hidden second slide made it compete for bandwidth with the first.
                priority={index === 0}
                className="object-cover transition-opacity duration-1000"
                style={{
                  opacity: currentImageIndex === index ? 1 : 0,
                  zIndex: currentImageIndex === index ? 11 : 10
                }}
              />
            ))}
            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-black bg-opacity-40 z-[5]" />
            {/* Content */}
            <div className="relative z-[13] text-center text-white px-4">
              <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg">Bienvenue à Indie's Cafe</h1>
              <p className="mt-2 text-lg md:text-xl drop-shadow-md">
                Table{' '}
                <span
                  className="underline decoration-dotted cursor-pointer"
                  onClick={() => {
                    const newTable = prompt('Numéro de table:', table);
                    if (newTable && newTable.trim() && newTable.trim() !== table) {
                      setTable(newTable.trim());
                      window.history.replaceState({}, '', `${window.location.pathname}?table=${newTable.trim()}`);
                    }
                  }}
                >{table}</span>
                {' '}- Explorez notre menu
              </p>
            </div>
            {/* Carousel Indicators */}
            <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
              {carouselImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentImageIndex === index
                      ? 'bg-white w-8'
                      : 'bg-white bg-opacity-50'
                  }`}
                  aria-label={`Image ${index + 1}`}
                />
              ))}
            </div>
          </section>
        )}

        {activeMenuSection === 'dishes' && (
          <div className="menu-section">
            {groupedDishes.map((category) => (
              <div key={category.id} className="category-folder-container">
                <h3 onClick={() => toggleCategory(category.id)} className="category-folder-header">
                  {category.name}
                  <span className="toggle-icon">
                    {openCategories.has(category.id) ? '▲' : '▼'}
                  </span>
                </h3>
                {openCategories.has(category.id) && (
                  <div className="category-items-grid">
                    {category.items.map((item: FormattedDish) => (
                      <div key={item.id}>
                        <MenuItem
                          item={item}
                          selectedCuisson={selectedCuisson}
                          handleCuissonChange={handleCuissonChange}
                          handleAddItem={handleAddItem}
                          selectedSizes={{}} // Not used for dishes currently
                          handleSizeChange={() => {}} // Not used for dishes currently
                          selectedIngredients={selectedIngredients}
                          handleIngredientChange={handleIngredientChange}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeMenuSection === 'drinks' && (
          <div className="menu-section">
            {groupedDrinks.map((category) => (
              <div key={category.id} className="category-folder-container">
                <h3 onClick={() => toggleCategory(category.id)} className="category-folder-header">
                  {category.name}
                  <span className="toggle-icon">
                    {openCategories.has(category.id) ? '▲' : '▼'}
                  </span>
                </h3>
                {openCategories.has(category.id) && (
                  <div className="category-items-grid">
                    {category.items.map((item: FormattedDrink) => (
                      <MenuItem
                        key={item.id}
                        item={item}
                        selectedSizes={selectedSizes}
                        handleSizeChange={handleSizeChange}
                        handleAddItem={handleAddItem}
                        selectedCuisson={{}} // Not used for drinks currently
                        handleCuissonChange={() => {}} // Not used for drinks currently
                        selectedIngredients={selectedIngredients}
                        handleIngredientChange={handleIngredientChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Composition Modal */}
      <CartCompositionModal
        open={showCartComposition}
        cart={cart}
        total={getTotalEurPrice()}
        onClose={() => setShowCartComposition(false)}
      />

      {/* Bottom Contact/Legal Banner */}
      <BottomBanner language={language} />
    </div>
  );
}