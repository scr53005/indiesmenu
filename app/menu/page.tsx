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
import { initialPaymentState, paymentReducer } from '@/lib/innopay/paymentStateMachine';
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
import { createAccountCarriesOrder } from '@/lib/innopay/payment-requests';
import { getLatestEurUsdRate, getInnopayUrl, createEuroTransferOperation, signAndBroadcastOperation, encodeComment, checkDuplicateMemo, storeMemoBeforeOrder, getMemoFixedPart, distriate } from '@/lib/utils';
import { isKitchenOpen, getKitchenCloseTime, isRestaurantOpen, getNextOpenDay } from '@/lib/config/kitchen-hours';
import {
  getAccountName,
  getActiveKey,
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
  const { cart, table, addItem, removeItem, updateQuantity, clearCart, orderNow, callWaiter, getTotalItems, getTotalPrice, getTotalEurPrice, getTotalEurPriceNoDiscount, getDiscountAmount, getMemo, getMemoWithDistriate, setTable, updateComment, delayedTiming, setDelayedTiming } = useCart();
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
  // Prevents double-click on the guest checkout confirm button (duplicate Stripe sessions)
  const [guestCheckoutProcessing, setGuestCheckoutProcessing] = useState(false);
  const [guestCheckoutSeconds, setGuestCheckoutSeconds] = useState(0);
  const guestCheckoutTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Flow 6 and waiter successes stay flags until R4c moves those buttons onto the machine.
  const [flow6Success, setFlow6Success] = useState(false); // pay_with_account
  const [waiterCalledSuccess, setWaiterCalledSuccess] = useState(false); // call_waiter

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

  // State for order processing timer
  const [orderProcessing, setOrderProcessing] = useState(false);
  // Leaving for the hub/Stripe (Flow 7): the order button says "Veuillez patienter…".
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => {
    // Back button from the hub: Safari/Chrome restore this page from memory (bfcache) with its
    // state frozen, so un-freeze the button or it would stay on "Veuillez patienter…".
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) setRedirecting(false); };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);
  const [orderElapsedSeconds, setOrderElapsedSeconds] = useState(0);
  const orderTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State for header carousel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselImages = [
    '/images/indiesInt1600x878.jpg',
    '/images/indiesExt1600x878.jpg'
  ];

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (orderTimerRef.current) {
        clearInterval(orderTimerRef.current);
      }
      if (guestCheckoutTimerRef.current) {
        clearInterval(guestCheckoutTimerRef.current);
      }
    };
  }, []);

  // Returns from the hub / Stripe and the popup hand-off (hooks/usePaymentReturn.ts; what each
  // return does is in lib/innopay/apply-return.ts).
  usePaymentReturn({
    state: paymentState,
    dispatch: dispatchPayment,
    clearCart,
    startOrderPulsing,
    showWallet: (wallet) => { setWalletBalance(wallet); setShowWalletBalance(true); },
    refetchBalance,
    cleanUrl: () => cleanUrlPreservingTable('PAYMENT RETURN'),
    onWalletConnected: (username) => {
      setWalletCredentials({ username });
      setShowWalletNotification(false);
    },
  });
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

    // Check if user has a wallet (SPOKE-KEY-SECURITY.md): only active + memo are stored.
    const accountName = getAccountName();
    const activeKey = getActiveKey();

    // Call waiter parameters (0.02 EURO tokens, special memo)
    const callWaiterAmount = 0.02;
    const reasonEncoded = reason?.trim() ? ` n:${encodeComment(reason.trim())}` : '';
    // A fresh `-inno-` reference, like every order: merchant-hub only forwards memos containing
    // `-inno-`, and the hub's /api/wallet-payment (security fix 2026-11-02) pays the restaurant
    // only if the customer's transfer memo contains the `distriateSuffix` it is given. With the
    // bare literal '-inno-' as suffix and no reference in the memo, every wallet waiter call was
    // refused ("transfer memo does not reference this order"), found 2026-11-05.
    const { distriate } = await import('@/lib/utils');
    const waiterSuffix = distriate();
    const callWaiterMemo = `Un serveur est appelé${reasonEncoded} ${table ? `TABLE ${table} ` : ''}${waiterSuffix}`;

    console.log('[CALL WAITER] Order details:', {
      hasAccount: !!accountName,
      hasActiveKey: !!activeKey,
      amount: callWaiterAmount,
      memo: callWaiterMemo
    });

    // "Mixed" posture: an account is enough — if the local active key is absent
    // (e.g. evicted store) we sign via the seamless innopay-authority fallback below.
    if (accountName) {
      // User has credentials - pay with EURO tokens (pay_with_account or pay_with_topup flow)
      console.log('[CALL WAITER] Customer has credentials, initiating EURO token payment');

      // Start timer
      setOrderProcessing(true);
      setOrderElapsedSeconds(0);
      orderTimerRef.current = setInterval(() => {
        setOrderElapsedSeconds(prev => prev + 1);
      }, 1000);

      try {
        // Get balance from React Query cache (already fetched by useBalance hook)
        console.log('[CALL WAITER] Getting EURO balance for:', accountName);

        // Use cached balance from useBalance hook, fallback to localStorage
        let euroBalance = balance ?? 0;
        if (euroBalance === 0) {
          const optimisticBalanceStr = localStorage.getItem('innopay_lastBalance');
          if (optimisticBalanceStr) {
            euroBalance = parseFloat(optimisticBalanceStr);
            console.log('[CALL WAITER] Using fallback localStorage balance:', euroBalance);
          }
        } else {
          console.log('[CALL WAITER] Using cached balance from React Query:', euroBalance);
        }

        console.log('[CALL WAITER] Customer EURO balance:', euroBalance);

        if (euroBalance >= callWaiterAmount) {
          // CALL WAITER: Typical FLOW 6 architecture (0.02€ with special memo to restaurant)
          // This IS a complete payment flow - restaurant must receive the transfer to trigger waiter
          console.log('[CALL WAITER] Sufficient balance, using FLOW 6 architecture');

          // 1. Get EUR/USD rate
          const today = new Date();
          const rateData = await getLatestEurUsdRate(today);
          const eurUsdRate = rateData.conversion_rate;
          console.log('[CALL WAITER] EUR/USD rate:', eurUsdRate, 'isFresh:', rateData.isFresh);

          // 2. Import necessary functions
          const { createEuroTransferOperation } = await import('@/lib/utils');

          // 3. Create EURO transfer operation (customer → innopay)
          // No distriate suffix needed for call waiter - use memo directly
          const euroOp = createEuroTransferOperation(
            accountName,
            'innopay',
            callWaiterAmount.toFixed(2),  // Convert to string
            callWaiterMemo  // Full memo, not a suffix
          );

          console.log('[CALL WAITER] Payment details:', {
            amount: callWaiterAmount,
            memo: callWaiterMemo,
            eurUsdRate
          });

          // 4. Sign and broadcast EURO transfer via innopay API
          const innopaySignUrl = getInnopayUrl();

          const signPayload: any = {
            operation: euroOp,
          };

          if (activeKey) {
            signPayload.activePrivateKey = activeKey;
            console.log('[CALL WAITER] Sending active key (hub falls back to innopay authority on authority error)');
          } else {
            // No local active key → seamless innopay-authority fallback (mixed posture).
            signPayload.useInnopayAuthority = true;
            signPayload.accountName = accountName;
            console.log('[CALL WAITER] No local active key — requesting innopay-authority signing');
          }

          const signResponse = await fetch(`${innopaySignUrl}/api/sign-and-broadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signPayload)
          });

          if (!signResponse.ok) {
            const errorData = await signResponse.json();
            throw new Error(errorData.message || 'Signing failed');
          }

          const signResult = await signResponse.json();
          const customerTxId = signResult.txId;
          const usedFallback = signResult.usedFallback;

          if (usedFallback) {
            console.log('[CALL WAITER] EURO transfer successful using innopay authority (fallback)! TX:', customerTxId);
          } else {
            console.log('[CALL WAITER] EURO transfer successful with user key! TX:', customerTxId);
          }

          // 5. Update mini-wallet balance after successful EURO transfer
          const newBalance = euroBalance - callWaiterAmount;
          console.log('[CALL WAITER] Updating wallet balance from', euroBalance, 'to', newBalance);
          setWalletBalance({
            accountName,
            euroBalance: parseFloat(newBalance.toFixed(2))
          });

          // Update localStorage optimistically (instant UI update)
          localStorage.setItem('innopay_lastBalance', newBalance.toFixed(2));
          localStorage.setItem('innopay_lastBalance_timestamp', Date.now().toString());

          // Force immediate fresh balance fetch from blockchain
          console.log('[CALL WAITER] Triggering fresh balance fetch from blockchain...');
          refetchBalance();

          // 6. Call innopay API to execute transfer to restaurant (innopay → restaurant)
          // This is CRITICAL - restaurant must receive the transfer with memo to trigger waiter
          const innopayUrl = getInnopayUrl();
          console.log('[CALL WAITER] Calling wallet-payment API to forward to restaurant...');

          const paymentPayload = {
            customerAccount: accountName,
            customerTxId: customerTxId,
            recipient: process.env.NEXT_PUBLIC_HIVE_ACCOUNT || 'indies.cafe',
            amountEuro: callWaiterAmount,
            eurUsdRate: eurUsdRate,
            orderMemo: callWaiterMemo,
            distriateSuffix: waiterSuffix  // the reference inside callWaiterMemo (hub checks it)
          };

          console.log('[CALL WAITER] Payment payload:', paymentPayload);

          const response = await fetch(`${innopayUrl}/api/wallet-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentPayload)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[CALL WAITER] wallet-payment API error:', response.status, errorText);

            // Stop timer on API error
            if (orderTimerRef.current) {
              clearInterval(orderTimerRef.current);
            }
            setOrderProcessing(false);
            throw new Error('Failed to forward payment to restaurant');
          }

          const result = await response.json();
          console.log('[CALL WAITER] Payment forwarded to restaurant!', result);

          // Stop timer and show waiter called success (NO cart clearing for call waiter)
          if (orderTimerRef.current) {
            clearInterval(orderTimerRef.current);
          }
          setOrderProcessing(false);
          setWaiterCalledSuccess(true);

          // Hide after 15 seconds
          setTimeout(() => {
            setWaiterCalledSuccess(false);
          }, 15000);

        } else {
          // ───────────────────────────────────────────────────────────────────────────────
          // CALL WAITER: Insufficient balance → redirect to topup (TO BE REFACTORED LATER)
          // Note: This is NOT the main pay_with_topup flow (that's at line 1121)
          // TODO: Refactor to use consistent API approach like main checkout flow
          // ───────────────────────────────────────────────────────────────────────────────
          console.log('[CALL WAITER] Insufficient balance, redirecting to top-up');

          // Stop timer
          if (orderTimerRef.current) {
            clearInterval(orderTimerRef.current);
          }
          setOrderProcessing(false);

          // Calculate top-up amount needed
          const topupNeeded = callWaiterAmount - euroBalance;
          console.log('[CALL WAITER] Top-up needed:', topupNeeded);

          // Redirect to Innopay for top-up with order details
          const innopayUrl = getInnopayUrl();
          const params = new URLSearchParams();
          params.set('table', table);
          params.set('order_amount', callWaiterAmount.toString());
          params.set('memo', callWaiterMemo);

          window.location.href = `${innopayUrl}/?${params.toString()}`;
        }

      } catch (error) {
        console.error('[CALL WAITER] Error:', error);

        // Stop timer
        if (orderTimerRef.current) {
          clearInterval(orderTimerRef.current);
        }
        setOrderProcessing(false);

        alert('Erreur lors du paiement. Veuillez réessayer.');
      }

    } else {
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
  }, [table, callWaiter, walletCredentials, getInnopayUrl]);

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

    // Check if user has a wallet (SPOKE-KEY-SECURITY.md): only active + memo are stored.
    const accountName = getAccountName();
    const activeKey = getActiveKey();

    console.log('[WALLET PAYMENT] Checking credentials:', {
      hasAccount: !!accountName,
      hasActiveKey: !!activeKey
    });

    // "Mixed" posture: an account is enough — a missing local active key is signed
    // via the seamless innopay-authority fallback below.
    if (accountName) {
      // ═════════════════════════════════════════════════════════════════════════
      // FLOW 6 & 7 ENTRY POINT - EXISTING ACCOUNT PAYMENT (Nov 2025)
      // ═════════════════════════════════════════════════════════════════════════
      // User has credentials → Check balance → Route to Flow 6 or Flow 7
      // Flow 6 (sufficient balance): Direct payment with dual-currency system
      // Flow 7 (insufficient balance): Redirect to innopay for topup
      // Reference: lib/flows.ts, FLOWS.md lines 148-244
      // ═════════════════════════════════════════════════════════════════════════
      console.log('[WALLET PAYMENT] Customer has credentials, initiating EURO token payment');

      // Block during Flow 6 cooldown (blockchain hasn't finalized yet)
      if (flow6Cooldown > 0) {
        console.log('[WALLET PAYMENT] Blocked — Flow 6 cooldown active:', flow6Cooldown, 's remaining');
        return;
      }

      // Start timer
      setOrderProcessing(true);
      setOrderElapsedSeconds(0);
      orderTimerRef.current = setInterval(() => {
        setOrderElapsedSeconds(prev => prev + 1);
      }, 1000);

      try {
        // 1. Get cart total first
        const amountEuro = getTotalEurPrice();
        const amountEuroNum = parseFloat(amountEuro);

        // alert('Étape 1: Vérification du solde EURO...');
        // 2. Check customer's EURO token balance using robust API strategy
        console.log('[WALLET PAYMENT] Checking EURO balance for:', accountName);

        // Get optimistic balance from localStorage
        let currentEuroBalance = 0;
        const optimisticBalanceStr = localStorage.getItem('innopay_lastBalance');
        if (optimisticBalanceStr) {
          currentEuroBalance = parseFloat(optimisticBalanceStr);
          console.log('[WALLET PAYMENT] Optimistic balance:', currentEuroBalance);
        }

        // Try to get real balance from API
        try {
          const response = await fetch(`/api/balance/euro?account=${encodeURIComponent(accountName)}`);
          if (response.ok) {
            const data = await response.json();
            const apiBalance = data.balance;

            // Validate against optimistic balance (±1 EUR tolerance)
            if (optimisticBalanceStr) {
              const roundedApi = Math.round(apiBalance);
              const roundedOptimistic = Math.round(currentEuroBalance);
              if (Math.abs(roundedApi - roundedOptimistic) <= 1) {
                console.log('[WALLET PAYMENT] API balance validates optimistic balance');
              } else {
                currentEuroBalance = apiBalance;
                console.log('[WALLET PAYMENT] Updated to API balance:', currentEuroBalance);
              }
            } else {
              currentEuroBalance = apiBalance;
              console.log('[WALLET PAYMENT] Using API balance:', currentEuroBalance);
            }

            // Update localStorage
            localStorage.setItem('innopay_lastBalance', currentEuroBalance.toFixed(2));
          }
        } catch (apiError) {
          console.warn('[WALLET PAYMENT] API fetch failed, using optimistic balance:', apiError);
          // Continue with optimistic balance if we have one
          if (!optimisticBalanceStr) {
            // Stop timer
            if (orderTimerRef.current) {
              clearInterval(orderTimerRef.current);
              orderTimerRef.current = null;
            }
            setOrderProcessing(false);

            alert('Nous rencontrons actuellement des problèmes techniques, veuillez nous en excuser');
            return;
          }
        }

        console.log('[WALLET PAYMENT] Final EURO balance:', currentEuroBalance, 'Required:', amountEuroNum);

        // ─────────────────────────────────────────────────────────────────────────
        // FLOW 6 vs FLOW 7 DECISION POINT (Dec 2025)
        // ─────────────────────────────────────────────────────────────────────────
        // Decision: Sufficient balance → FLOW 6 (pay_with_account)
        //           Insufficient balance → FLOW 7 (pay_with_topup)
        // Reference: lib/flows.ts detectFlow(), FLOWS.md lines 197-244
        // ─────────────────────────────────────────────────────────────────────────
        // Check if sufficient balance for Flow 6
        if (currentEuroBalance < amountEuroNum) {
          // Round UP deficit to nearest cent to avoid rounding errors
          const deficitRaw = amountEuroNum - currentEuroBalance;
          const deficit = (Math.ceil(deficitRaw * 100) / 100).toFixed(2);
          // alert(`Solde insuffisant! Vous avez ${currentEuroBalance.toFixed(2)} EURO mais il faut ${amountEuroNum.toFixed(2)} EURO. Redirection vers la page de rechargement...`);

          // Redirect to innopay top-up page
          const innopayUrl = getInnopayUrl();

          // Stop timer before redirect
          if (orderTimerRef.current) {
            clearInterval(orderTimerRef.current);
            orderTimerRef.current = null;
          }
          setOrderProcessing(false);

          // ─────────────────────────────────────────────────────────────────────────
          // FLOW 7: pay_with_topup - UNIFIED WEBHOOK ARCHITECTURE (Dec 2025)
          // ─────────────────────────────────────────────────────────────────────────
          // Architecture: Redirect to innopay with order context → User tops up via Stripe
          //               → Webhook handles ALL transfers (topup + order payment + change)
          //               → Stripe redirects back to indiesmenu with order_success=true
          // Reference: FLOWS.md lines 197-244
          // NOTE: Cart persists in localStorage automatically - no need to store separately!
          // ─────────────────────────────────────────────────────────────────────────

          // Generate order memo with distriate suffix (added Dec 18, 2025)
          const orderMemo = getMemoWithDistriate();

          // Duplicate order check (Level 2 guardrail)
          if (!skipDuplicateCheckRef.current && checkDuplicateMemo(orderMemo)) {
            console.log('[FLOW 7] Duplicate memo detected, showing warning modal');
            if (orderTimerRef.current) { clearInterval(orderTimerRef.current); orderTimerRef.current = null; }
            setOrderProcessing(false);
            setShowDuplicateModal(true);
            return;
          }
          skipDuplicateCheckRef.current = false;
          storeMemoBeforeOrder(orderMemo);

          // Build return URL for Stripe redirect after topup completion
          const returnUrl = `${window.location.origin}/menu?table=${table}`;

          // Prepare context parameters for innopay
          const params = new URLSearchParams({
            topup_for: 'order',                              // Flag: topup for restaurant order
            source: 'indiesmenu',                            // Source application
            table: table,                                     // Table number
            order_amount: amountEuroNum.toFixed(2),          // Order total
            order_memo: encodeURIComponent(orderMemo),       // Order details with distriate suffix
            deficit: deficit,                                 // Amount needed
            account: accountName,                             // Account name (for MiniWallet display)
            balance: currentEuroBalance.toFixed(2),          // Current balance
            return_url: encodeURIComponent(returnUrl)        // Return URL after Stripe payment
          });

          // Set Flow 7 marker for success detection on return
          localStorage.setItem('innopay_flow_pending', 'flow7_topup_and_pay');
          console.log('[FLOW 7] Set flow marker: flow7_topup_and_pay');

          // Clear stale balance - will be refreshed from webhook data on return
          localStorage.removeItem('innopay_lastBalance');
          console.log('[FLOW 7] Cleared old balance - will fetch fresh after topup');

          console.log('[FLOW 7] Redirecting to innopay with unified webhook approach');
          console.log('[FLOW 7] Context params:', Object.fromEntries(params));

          // Redirect to innopay landing page with order context
          // Webhook will execute all transfers and Stripe will redirect back with session_id
          // Freeze the button until the browser has left: loading the hub takes a few seconds
          // on a phone, and a button back on "Commandez" looked like the click had failed.
          setRedirecting(true);
          window.location.href = `${innopayUrl}?${params.toString()}`;
          return;
        }

        // ─────────────────────────────────────────────────────────────────────────
        // FLOW 6: pay_with_account - TWO-LEG DUAL-CURRENCY ARCHITECTURE (Nov 2025)
        // ─────────────────────────────────────────────────────────────────────────
        // Architecture: Customer → innopay (HBD attempt + EURO collateral)
        //               → innopay API executes restaurant transfer (HBD priority, EURO fallback)
        //               → Records outstanding debt if HBD insufficient
        // Reference: lib/flows.ts detectFlow(), FLOWS.md lines 148-196
        // Status: ✅ STABLE - DO NOT BREAK
        // ─────────────────────────────────────────────────────────────────────────

        // alert('Étape 2: Récupération du taux EUR/USD...');
        // 3. Fetch EUR/USD rate using the same approach as kitchen backend
        const today = new Date();
        const rateData = await getLatestEurUsdRate(today);
        const eurUsdRate = rateData.conversion_rate;

        console.log('[WALLET PAYMENT] EUR/USD rate data:', rateData);
        console.log('[WALLET PAYMENT] EUR/USD rate:', eurUsdRate, 'isFresh:', rateData.isFresh);
        // alert(`DEBUG: Taux EUR/USD récupéré = ${eurUsdRate} (type: ${typeof eurUsdRate}, isFresh: ${rateData.isFresh})`);

        // alert('Étape 3: Import des fonctions...');
        // Import necessary functions (signAndBroadcast is now done server-side)
        const { distriate, createEuroTransferOperation } = await import('@/lib/utils');

        // alert('Étape 4: Génération du suffix...');
        // 4. Generate distriateSuffix ONCE (used for both transfers)
        const suffix = distriate();
        console.log('[WALLET PAYMENT] Generated suffix:', suffix);

        // alert('Étape 5: Récupération des détails...');
        // 5. Get payment details
        const orderMemo = getMemo();

        console.log('[WALLET PAYMENT] Payment details:', { amountEuro, orderMemo, suffix, eurUsdRate });

        // Duplicate order check (Level 2 guardrail)
        const fullMemo = `${orderMemo} ${suffix}`;
        if (!skipDuplicateCheckRef.current && checkDuplicateMemo(fullMemo)) {
          console.log('[FLOW 6] Duplicate memo detected, showing warning modal');
          if (orderTimerRef.current) { clearInterval(orderTimerRef.current); orderTimerRef.current = null; }
          setOrderProcessing(false);
          setShowDuplicateModal(true);
          return;
        }
        skipDuplicateCheckRef.current = false;
        storeMemoBeforeOrder(fullMemo);

        // alert(`Étape 6: Création opération EURO (${amountEuro}€)...`);
        // 6. Create EURO transfer operation (customer → innopay)
        // Include the full order memo alongside the distriate suffix so the
        // on-chain customer-leg transfer reflects what was ordered (not just
        // an opaque tag). Matches the memo format used elsewhere.
        const euroOp = createEuroTransferOperation(
          accountName,
          'innopay',
          amountEuro,
          fullMemo  // orderMemo + distriate suffix
        );

        // alert('Étape 7: Signature et diffusion (serveur)...');
        console.log('[WALLET PAYMENT] Sending operation to server for signing...');

        // 5. Sign and broadcast EURO transfer SERVER-SIDE with cascade fallback
        const innopaySignUrl = getInnopayUrl();

        // Send the active key if we have one; the hub tries it first and falls back to
        // innopay authority on an authority error. If we have no local active key,
        // request innopay-authority signing explicitly (mixed posture).
        const signPayload: any = {
          operation: euroOp,
        };

        if (activeKey) {
          signPayload.activePrivateKey = activeKey;
          console.log('[WALLET PAYMENT] Sending active key (hub falls back to innopay authority on authority error)');
        } else {
          signPayload.useInnopayAuthority = true;
          signPayload.accountName = accountName;
          console.log('[WALLET PAYMENT] No local active key — requesting innopay-authority signing');
        }

        const signResponse = await fetch(`${innopaySignUrl}/api/sign-and-broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signPayload)
        });

        if (!signResponse.ok) {
          const errorData = await signResponse.json();
          throw new Error(errorData.message || 'Signing failed');
        }

        const signResult = await signResponse.json();
        const txId = signResult.txId;
        const usedFallback = signResult.usedFallback;

        if (usedFallback) {
          console.log('[WALLET PAYMENT] EURO transfer successful using innopay authority (fallback)! TX:', txId);
        } else {
          console.log('[WALLET PAYMENT] EURO transfer successful with user key! TX:', txId);
        }
        // alert(`Étape 8: Transaction réussie! TX: ${txId.substring(0, 8)}...`);

        // Update mini-wallet balance after successful EURO transfer
        const newBalance = currentEuroBalance - amountEuroNum;
        console.log('[WALLET PAYMENT] Updating wallet balance from', currentEuroBalance, 'to', newBalance);
        setWalletBalance({
          accountName,
          euroBalance: parseFloat(newBalance.toFixed(2))
        });

        // Update localStorage optimistically (instant UI update)
        localStorage.setItem('innopay_lastBalance', newBalance.toFixed(2));
        localStorage.setItem('innopay_lastBalance_timestamp', Date.now().toString());
        console.log('[WALLET PAYMENT] Updated localStorage balance optimistically:', newBalance.toFixed(2));

        // Balance will be refreshed from blockchain after the 12s cooldown expires
        // (the trust window prevents premature fetches that would return stale data)
        console.log('[WALLET PAYMENT] Balance refresh deferred — trust window active for 12s');

        // 7. Call innopay API to execute HBD/EURO transfer to restaurant
        const innopayUrl = getInnopayUrl();

        console.log('[WALLET PAYMENT] Calling innopay API...');

        const paymentPayload = {
          customerAccount: accountName,
          customerTxId: txId,
          recipient: process.env.NEXT_PUBLIC_HIVE_ACCOUNT || 'indies.cafe',
          amountEuro: amountEuro,
          eurUsdRate: eurUsdRate,
          orderMemo: orderMemo,
          distriateSuffix: suffix
        };

        console.log('[WALLET PAYMENT] Payment payload:', paymentPayload);
        // alert(`DEBUG: Envoi à wallet-payment - eurUsdRate = ${eurUsdRate}, amountEuro = ${amountEuro}`);

        const response = await fetch(`${innopayUrl}/api/wallet-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentPayload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          // alert(`ERREUR API wallet-payment: Status ${response.status} - ${errorText}`);
          console.error('[WALLET PAYMENT] API error:', response.status, errorText);

          // Stop timer on API error
          if (orderTimerRef.current) {
            clearInterval(orderTimerRef.current);
            orderTimerRef.current = null;
          }
          setOrderProcessing(false);
          return;
        }

        const result = await response.json();
        console.log('[WALLET PAYMENT] Payment complete!', result);
        // alert(`SUCCESS: Paiement traité! Type: ${result.transferType || 'unknown'}`);

        // Stop timer
        if (orderTimerRef.current) {
          clearInterval(orderTimerRef.current);
          orderTimerRef.current = null;
        }
        setOrderProcessing(false);

        // 7. Clear cart and show success
        clearCart();

        // Clear Flow 5 handover marker if this was part of Flow 5
        const flowState = localStorage.getItem('innopay_flow_pending');
        if (flowState === 'flow5_existing_account_handover') {
          console.log('[FLOW 5] Flow 6 payment successful - clearing flow marker');
          localStorage.removeItem('innopay_flow_pending');
        }

        // Set Flow 6 cooldown: prevent next Flow 6 for 12 seconds
        // Hive block time 3s + Hive-Engine indexing 3-10s = balance not queryable yet
        const FLOW6_COOLDOWN_MS = 12000;
        const cooldownUntil = Date.now() + FLOW6_COOLDOWN_MS;
        localStorage.setItem('innopay_balance_trustUntil', cooldownUntil.toString());
        localStorage.setItem('innopay_flow6_cooldown_until', cooldownUntil.toString());
        console.log('[FLOW 6] Cooldown set for 12s — blockchain needs time to finalize');

        // Show unified order success banner (replaced alert for consistency with other flows)
        setFlow6Success(true);

        // Start post-order pulsing (Level 3 guardrail)
        startOrderPulsing(getMemoFixedPart(fullMemo));

      } catch (error: any) {
        console.error('[WALLET PAYMENT] Error:', error);
        // alert(`Erreur: ${error.message || 'Erreur inconnue'}. Vérifiez la console pour plus de détails.`);

        // Stop timer on error
        if (orderTimerRef.current) {
          clearInterval(orderTimerRef.current);
          orderTimerRef.current = null;
        }
        setOrderProcessing(false);
      }

      return; // Exit early - don't run the hive://sign/ flow
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
  }, [cart, cart.length, orderNow, walletCredentials, isRestaurantClosed, delayedTiming, startOrderPulsing]);

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

  // Handle "Créer un compte" button in wallet notification banner
  // Returns whether it left for the hub (false: duplicate modal), so the banner button un-sinks.
  const handleCreateAccount = useCallback((): boolean => {
    const baseUrl = typeof window !== 'undefined'
      ? `${getInnopayUrl()}/user`
      : 'https://wallet.innopay.lu/user';

    let orderAmount, discount, customMemo;

    if (isCallWaiterFlow) {
      orderAmount = '0.02';
      discount = '0';
      const reasonEncoded = waiterReason?.trim() ? ` n:${encodeComment(waiterReason.trim())}` : '';
      // `-inno-` reference required: merchant-hub drops memos without it, so this waiter call
      // never reached the CO page (found 2026-11-06; same rule as the wallet waiter call).
      customMemo = `Un serveur est appelé${reasonEncoded} ${table ? `TABLE ${table} ` : ''}${distriate()}`;
      console.log(`[${new Date().toISOString()}] [CALL WAITER] Opening account creation for call waiter`);
    } else {
      orderAmount = getTotalEurPrice();
      discount = getDiscountAmount();
      customMemo = getMemoWithDistriate();
      console.log(`[${new Date().toISOString()}] [INDIESMENU] Opening account creation with params:`, {
        orderAmount,
        discount,
        memoLength: customMemo.length,
        memo: customMemo.substring(0, 100) + (customMemo.length > 100 ? '...' : '')
      });
    }

    const params = new URLSearchParams();
    params.set('restaurant', 'indies');
    params.set('restaurant_account', recipient);
    params.set('table', table);
    params.set('order_amount', orderAmount);
    if (parseFloat(discount) > 0) {
      params.set('discount', discount);
    }
    params.set('memo', customMemo);

    const returnUrl = `${window.location.origin}/menu`;
    params.set('return_url', returnUrl);
    console.log('[FLOW 5] Return URL set:', returnUrl);

    // Flow 4 (empty cart, no waiter call) creates the account only: no order, so no duplicate
    // check and no stored memo (a stored memo makes the MiniWallet pulse for a phantom order).
    if (createAccountCarriesOrder(isCallWaiterFlow, orderAmount)) {
      // Duplicate order check (Level 2 guardrail)
      if (!skipDuplicateCheckRef.current && checkDuplicateMemo(customMemo)) {
        console.log('[FLOW 5] Duplicate memo detected, showing warning modal');
        setShowDuplicateModal(true);
        return false;
      }
      skipDuplicateCheckRef.current = false;
      storeMemoBeforeOrder(customMemo);
    }

    localStorage.setItem('innopay_flow_pending', 'flow5_create_and_pay');
    console.log('[FLOW 5] Set flow marker: flow5_create_and_pay');

    window.location.href = `${baseUrl}?${params.toString()}`;
    return true;
  }, [isCallWaiterFlow, waiterReason, table, recipient, getTotalEurPrice, getDiscountAmount, getMemoWithDistriate]);

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

  const proceedWithGuestCheckout = useCallback(async () => {
    if (guestCheckoutProcessing) return; // Prevent duplicate Stripe sessions
    setGuestCheckoutProcessing(true);
    setGuestCheckoutSeconds(0);
    guestCheckoutTimerRef.current = setInterval(() => {
      setGuestCheckoutSeconds(s => s + 1);
    }, 1000);
    try {
      // Hide wallet notification banner when guest checkout starts
      setGuestCheckoutStarted(true);

      let amountEuroWithFee: number;
      let customMemo: string;

      if (isCallWaiterFlow) {
        // Waiter service: flat 1€ fee (includes CC commission)
        amountEuroWithFee = 1.00;
        const { distriate } = await import('@/lib/utils');
        const distriateSuffix = distriate('gst');
        const reasonEncoded = waiterReason?.trim() ? ` n:${encodeComment(waiterReason.trim())}` : '';
        customMemo = `Un serveur est appelé${reasonEncoded} ${table ? `TABLE ${table}` : ''} ${distriateSuffix}`.replace(/\s+/g, ' ').trim();
        console.log('Guest checkout (waiter):', { amountEuroWithFee, memo: customMemo });
      } else {
        // Normal order: no-discount price + 5% processing fee
        const amountEuroNoDiscount = parseFloat(getTotalEurPriceNoDiscount());
        amountEuroWithFee = amountEuroNoDiscount * 1.05;
        const { distriate } = await import('@/lib/utils');
        const distriateSuffix = distriate('gst');
        const baseMemo = getMemo();
        customMemo = `${baseMemo} ${distriateSuffix}`;
        console.log('Guest checkout:', { amountEuroWithFee, memo: customMemo, distriateSuffix });
      }

      // Duplicate order check (Level 2 guardrail)
      if (!skipDuplicateCheckRef.current && checkDuplicateMemo(customMemo)) {
        console.log('[FLOW 3] Duplicate memo detected, showing warning modal');
        setShowDuplicateModal(true);
        return;
      }
      skipDuplicateCheckRef.current = false;
      storeMemoBeforeOrder(customMemo);

      const innopayUrl = getInnopayUrl();

      console.log('[DEBUG] Current hostname:', window.location.hostname);
      console.log('[DEBUG] Determined innopayUrl:', innopayUrl);

      // Build return URL for success redirect (always back to current origin)
      const returnUrl = `${window.location.origin}/menu?table=${table}`;

      console.log('Fetching from:', `${innopayUrl}/api/checkout/guest`);
      console.log('Request body:', { amountEuro: amountEuroWithFee, recipient, memo: customMemo, returnUrl });

      // Timeout after 30 seconds to avoid infinite spinner
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${innopayUrl}/api/checkout/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountEuro: amountEuroWithFee,
          // Never hard-code the account: on dev this must be indies-test (NEXT_PUBLIC_HIVE_ACCOUNT).
          recipient,
          memo: customMemo,
          returnUrl
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Response error data:', errorData);
        throw new Error(`Checkout failed: ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      const { url } = data;
      console.log('Redirecting to Stripe:', url);

      // Redirect to Stripe checkout - DON'T clear cart yet, wait for blockchain confirmation
      window.location.href = url;

    } catch (error: any) {
      console.error('Guest checkout error:', error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      if (guestCheckoutTimerRef.current) { clearInterval(guestCheckoutTimerRef.current); guestCheckoutTimerRef.current = null; }
      setGuestCheckoutProcessing(false); // Re-enable button on error
      setGuestCheckoutStarted(false);
      setShowGuestWarningModal(false); // Close modal so user can retry
      const isTimeout = error instanceof DOMException && error.name === 'AbortError';
      const errorDetails = isTimeout
        ? 'Le processeur de paiements ne répond pas.'
        : (error.message || 'Erreur inconnue');
      alert(`${errorDetails}\n\nVeuillez réessayer ou contacter contact@innopay.lu`);
    }
  }, [getTotalEurPriceNoDiscount, getMemo, clearCart, table, guestCheckoutProcessing, isCallWaiterFlow, waiterReason, recipient]);


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
        kind={paymentState.status === 'success' ? paymentState.banner : flow6Success ? 'orderSent' : null}
        onDismiss={() => {
          setFlow6Success(false);
          dispatchPayment({ type: 'DISMISS_BANNER' });
        }}
      />

      <WaiterCalledBanner show={waiterCalledSuccess} onDismiss={() => setWaiterCalledSuccess(false)} />

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
          setGuestCheckoutProcessing(false);
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
          setGuestCheckoutProcessing(false);
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
        seconds={guestCheckoutSeconds}
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
            <button onClick={handleOrder} className="order-now-button" disabled={redirecting || orderProcessing || flow6Cooldown > 0}>
              {redirecting
                ? t('order.redirecting')
                : flow6Cooldown > 0
                  ? t('order.balanceCooldown', { seconds: flow6Cooldown })
                  : orderProcessing ? `${orderElapsedSeconds}s` : t('order.button')}
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