// indiesmenu-front/app/menu/page.tsx
'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '@/app/context/CartContext';
import { useBalance, useInvalidateBalance } from '@/hooks/useBalance';
import MenuItem from '@/components/menu/MenuItem';
import CartItemDisplay from '@/components/menu/CartItemDisplay';
import MiniWallet, { WalletReopenButton } from '@/components/ui/MiniWallet';
import Draggable from '@/components/ui/Draggable';
import BottomBanner from '@/components/ui/BottomBanner';
import { getLatestEurUsdRate, getInnopayUrl, createEuroTransferOperation, signAndBroadcastOperation } from '@/lib/utils'; // Import currency rate and innopay URL utilities
// import { Prisma} from '@prisma/client';
import '@/app/globals.css'; // Import global styles

// Import the enriched types directly from your menu data file
import { MenuData, FormattedDish, FormattedDrink, FormattedCuisson, FormattedIngredient } from '@/lib/data/menu';

// New Interface for Grouped Items (more flexible)
interface GroupedCategory<T> {
  id: number;
  name: string;
  items: T[];
}

export default function MenuPage() {
  const { cart, table, addItem, removeItem, updateQuantity, clearCart, orderNow, callWaiter, getTotalItems, getTotalPrice, getTotalEurPrice, getTotalEurPriceNoDiscount, getDiscountAmount, getMemo, getMemoWithDistriate, setTable } = useCart();
  // Use the imported MenuData type for the menu state
  const [menu, setMenu] = useState<MenuData>({ categories: [], dishes: [], drinks: [], cuissons: [], ingredients: [], conversion_rate: 1.0000 }); // Initialize with empty data
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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
  const [activeMenuSection, setActiveMenuSection] = useState<'dishes' | 'drinks' | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());

  // Grouped menu data for easier rendering - ensure types are correct
  const [groupedDishes, setGroupedDishes] = useState<GroupedCategory<FormattedDish>[]>([]);
  const [groupedDrinks, setGroupedDrinks] = useState<GroupedCategory<FormattedDrink>[]>([]);

  // Refs for dynamic height calculation
  const cartRef = useRef<HTMLDivElement>(null);
  const cartItemsListRef = useRef<HTMLDivElement>(null); // Ref for scrollable cart items list
  const menuSelectorRef = useRef<HTMLDivElement>(null);
  const welcomeCarouselRef = useRef<HTMLDivElement>(null);
  const [cartHeight, setCartHeight] = useState(0);
  const [menuSelectorHeight, setMenuSelectorHeight] = useState(0);
  const [welcomeCarouselHeight, setWelcomeCarouselHeight] = useState(0);

  // State for wallet notification
  const [showWalletNotification, setShowWalletNotification] = useState(false);
  const [isSafariBanner, setIsSafariBanner] = useState(false); // Track if banner is shown for Safari
  const [isCallWaiterFlow, setIsCallWaiterFlow] = useState(false); // Track if banner is for call waiter
  const [walletCredentials, setWalletCredentials] = useState<{username: string, activeKey: string} | null>(null);

  // State for payment success notification
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [blockchainComplete, setBlockchainComplete] = useState(false);
  const [transmissionError, setTransmissionError] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showCartComposition, setShowCartComposition] = useState(false);

  // State for guest checkout warning modal
  const [showGuestWarningModal, setShowGuestWarningModal] = useState(false);
  const [guestCheckoutStarted, setGuestCheckoutStarted] = useState(false);

  // State for account creation success notification
  const [showAccountCreated, setShowAccountCreated] = useState(false);
  const [accountCreationComplete, setAccountCreationComplete] = useState(false);
  const [newAccountCredentials, setNewAccountCredentials] = useState<{
    accountName: string;
    masterPassword: string;
    euroBalance: number;
  } | null>(null);

  // State for persistent wallet balance indicator
  const [showWalletBalance, setShowWalletBalance] = useState(false);
  const [walletBalance, setWalletBalance] = useState<{
    accountName: string;
    euroBalance: number;
  } | null>(null);

  // Get account name for React Query balance fetching
  const accountName = typeof window !== 'undefined'
    ? localStorage.getItem('innopay_accountName')
    : null;

  // Fetch balance using React Query (replaces manual useEffect at line 602-705)
  const { balance, isLoading: balanceLoading, refetch: refetchBalance, source: balanceSource } = useBalance(accountName, {
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

  // State for topup success notification
  const [showTopupSuccess, setShowTopupSuccess] = useState(false);

  // Flow-specific success states (explicitly named for code readability)
  const [flow4Success, setFlow4Success] = useState(false); // create_account_only
  const [flow5Success, setFlow5Success] = useState(false); // create_account_and_pay
  const [flow6Success, setFlow6Success] = useState(false); // pay_with_account
  const [flow7Success, setFlow7Success] = useState(false); // pay_with_topup
  const [waiterCalledSuccess, setWaiterCalledSuccess] = useState(false); // call_waiter

  // State for import account modal (email verification system)
  const [showImportModal, setShowImportModal] = useState(false);
  const [importEmail, setImportEmail] = useState('');
  const [importError, setImportError] = useState('');
  const [importAttempts, setImportAttempts] = useState(5);
  const [importDisabled, setImportDisabled] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importStep, setImportStep] = useState<'email' | 'code' | 'select'>('email');
  const [verificationCode, setVerificationCode] = useState('');
  const [multipleAccounts, setMultipleAccounts] = useState<Array<{
    accountName: string;
    creationDate: string;
    euroBalance: number;
  }>>([]);

  // State for order processing timer
  const [orderProcessing, setOrderProcessing] = useState(false);
  const [orderElapsedSeconds, setOrderElapsedSeconds] = useState(0);
  const orderTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State for header carousel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselImages = [
    '/images/indiesInt1600x878.jpg',
    '/images/indiesExt1600x878.jpg'
  ];

  // Flow-specific success handlers - defined early to avoid hoisting issues
  const handleFlow5Success = useCallback(() => {
    console.log('[FLOW 5] create_account_and_pay success');
    setFlow5Success(true);
  }, []);

  const handleFlow6Success = useCallback(() => {
    console.log('[FLOW 6] pay_with_account success');
    setFlow6Success(true);
  }, []);

  const handleFlow7Success = useCallback(() => {
    console.log('[FLOW 7] pay_with_topup success');
    setFlow7Success(true);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (orderTimerRef.current) {
        clearInterval(orderTimerRef.current);
      }
    };
  }, []);

  // Check for payment success on mount
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const sessionId = searchParams.get('session_id');
    console.log('[PAYMENT SUCCESS CHECK] paymentStatus:', paymentStatus, 'sessionId:', sessionId);
    console.log('[PAYMENT SUCCESS CHECK] Full URL:', window.location.href);

    if (paymentStatus === 'success' && sessionId) {
      console.log('[PAYMENT SUCCESS] Setting showPaymentSuccess to true (Stripe confirmed)');
      setShowPaymentSuccess(true);
      setBlockchainComplete(false); // Start in "processing" state
      setTransmissionError(false); // Reset error state
      setCurrentSessionId(sessionId);
      // DON'T clear cart yet - wait for blockchain confirmation
      // Remove query params from URL while preserving table
      cleanUrlPreservingTable('PAYMENT SUCCESS CHECK');
    } else {
      console.log('[PAYMENT SUCCESS CHECK] No success payment detected');
    }
  }, [searchParams, clearCart, table]);

  // Check for account creation success OR existing account (Flow 5) OR order success (Flow 7) on mount
  useEffect(() => {
    const accountCreated = searchParams.get('account_created');
    const existingAccount = searchParams.get('existing_account');
    const orderSuccess = searchParams.get('order_success');
    const credentialToken = searchParams.get('credential_token');
    const sessionId = searchParams.get('session_id'); // Flow 7 uses Stripe session_id
    const balance = searchParams.get('balance');
    const flowParam = searchParams.get('flow'); // Explicit flow from innopay (6 or 7)

    // 🔧 DEBUG: Log URL params to localStorage to persist across page reload
    const flowMarker = localStorage.getItem('innopay_flow_pending');
    const debugLog = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      accountCreated,
      existingAccount,
      orderSuccess,
      credentialToken,
      sessionId,
      flowMarker,
      flowParam
    };
    localStorage.setItem('innopay_debug_last_params', JSON.stringify(debugLog));
    console.log('[CREDENTIAL CHECK] 🔧 DEBUG LOG:', debugLog);
    console.log('[CREDENTIAL CHECK] accountCreated:', accountCreated, 'existingAccount:', existingAccount, 'orderSuccess:', orderSuccess, 'credentialToken:', credentialToken, 'sessionId:', sessionId, 'flowMarker:', flowMarker, 'flowParam:', flowParam);

    // For Flow 7, we get order_success=true and session_id from Stripe redirect
    // For Flow 5, we get credential_token from webhook
    const hasCredentials = credentialToken || sessionId;

    if ((accountCreated === 'true' || existingAccount === 'true' || orderSuccess === 'true') && hasCredentials) {
      // Retrieve credentials from innopay API using the token
      const fetchCredentials = async () => {
        try {
          const innopayUrl = getInnopayUrl();

          console.log('[ACCOUNT CREATED] Fetching credentials from innopay');
          console.log('[ACCOUNT CREATED] Using:', credentialToken ? `credentialToken: ${credentialToken}` : `sessionId: ${sessionId}`);

          const response = await fetch(`${innopayUrl}/api/account/credentials`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...(credentialToken && { credentialToken }),
              ...(sessionId && { sessionId })
            })
          });

          if (!response.ok) {
            console.error('[ACCOUNT CREATED] Failed to fetch credentials:', response.status);
            return;
          }

          const credentials = await response.json();
          console.log('[ACCOUNT CREATED] Retrieved credentials for:', credentials.accountName);

          // Store credentials in indiesmenu's localStorage
          localStorage.setItem('innopay_accountName', credentials.accountName);
          localStorage.setItem('innopay_masterPassword', credentials.masterPassword);
          localStorage.setItem('innopay_activePrivate', credentials.keys.active.privateKey);
          localStorage.setItem('innopay_postingPrivate', credentials.keys.posting.privateKey);
          localStorage.setItem('innopay_memoPrivate', credentials.keys.memo.privateKey);

          // Determine flow from URL param (source of truth from innopay) or fallback to marker
          // flowParam: '6' = Flow 6 (pay with existing account), '7' = Flow 7 (topup + pay)
          let currentFlow = flowMarker; // Start with marker

          // Override with explicit flow parameter from innopay (more reliable)
          if (flowParam === '6') {
            currentFlow = 'flow6_pay_with_account';
            console.log('[FLOW DETECTION] Explicit flow=6 detected - Flow 6 (pay with existing account)');
          } else if (flowParam === '7') {
            currentFlow = 'flow7_topup_and_pay';
            console.log('[FLOW DETECTION] Explicit flow=7 detected - Flow 7 (topup + pay)');
          }

          console.log('[FLOW DETECTION] Final flow:', currentFlow, '(marker:', flowMarker, ', param:', flowParam, ')');

          // Store balance to localStorage ONLY if NOT Flow 7 (Flow 7 will fetch real balance)
          if (currentFlow !== 'flow7_topup_and_pay') {
            localStorage.setItem('innopay_lastBalance', (credentials.euroBalance || 0).toString());
            console.log('[ACCOUNT CREATED] Stored balance to localStorage:', credentials.euroBalance);
          } else {
            console.log('[FLOW 7] Skipping balance storage - will fetch real balance from blockchain');
          }

          // Handle differently based on flow
          if (existingAccount === 'true') {
            // FLOW 5 EXISTING ACCOUNT: Check balance and trigger payment
            console.log('[EXISTING ACCOUNT] Retrieved credentials for existing account:', credentials.accountName);
            console.log('[EXISTING ACCOUNT] Balance:', credentials.euroBalance);

            // Update wallet balance state
            setWalletBalance({
              accountName: credentials.accountName,
              euroBalance: credentials.euroBalance
            });

            // Remove query params from URL while preserving table
            cleanUrlPreservingTable('EXISTING ACCOUNT');

            // Check if Flow 5 marker exists, update to handover
            if (currentFlow === 'flow5_create_and_pay') {
              localStorage.setItem('innopay_flow_pending', 'flow5_existing_account_handover');
              console.log('[FLOW 5] Marker updated: flow5_create_and_pay -> flow5_existing_account_handover');
            }

            // Check if payment was already made in innopay (order_success=true)
            if (orderSuccess === 'true') {
              console.log('[EXISTING ACCOUNT] Payment already completed in innopay - showing success and clearing cart');

              // Clear cart - order has been paid
              clearCart();

              // Clear flow marker
              localStorage.removeItem('innopay_flow_pending');

              // Show MiniWallet with updated balance
              setShowWalletBalance(true);

              // Show success message
              setShowPaymentSuccess(true);
              setTimeout(() => setShowPaymentSuccess(false), 5000);

            } else {
              // Payment not yet made - auto-trigger payment check after a brief delay
              setTimeout(() => {
                const cartTotal = parseFloat(getTotalEurPrice());
                console.log('[EXISTING ACCOUNT] Cart total:', cartTotal);

                if (credentials.euroBalance >= cartTotal) {
                  // Sufficient balance - trigger Flow 6 (pay_with_account)
                  console.log('[EXISTING ACCOUNT] Sufficient balance - triggering Flow 6 payment');
                  handleOrder();
                } else {
                  // Insufficient balance - trigger Flow 7 (pay_with_topup)
                  console.log('[EXISTING ACCOUNT] Insufficient balance - triggering Flow 7');
                  // Flow 7 will be triggered by the normal checkout button logic
                  // which detects insufficient balance
                  alert('Balance insuffisant. Redirection vers le rechargement...');
                  // The user will need to click Commander again, which will trigger Flow 7
                }
              }, 500);
            }
          } else {
            // Use explicit flow marker for reliable flow detection
            if (currentFlow === 'flow7_topup_and_pay') {
              // FLOW 7: Topup with order payment (unified webhook)
              console.log('[FLOW 7 SUCCESS] Order completed via unified webhook approach');
              console.log('[FLOW 7 SUCCESS] Account:', credentials.accountName, 'Balance:', credentials.euroBalance);

              // Update wallet balance state with optimistic balance from webhook
              setWalletBalance({
                accountName: credentials.accountName,
                euroBalance: credentials.euroBalance // Will be replaced by real balance from API
              });

              // Store balance with timestamp to prevent stale cache overwrites
              localStorage.setItem('innopay_lastBalance', credentials.euroBalance.toString());
              localStorage.setItem('innopay_lastBalance_timestamp', Date.now().toString());

              // Clear cart - order has been paid
              clearCart();

              // Clear flow marker - flow is complete
              localStorage.removeItem('innopay_flow_pending');
              console.log('[FLOW 7 SUCCESS] Cleared flow marker');

              // Remove query params from URL while preserving table
              cleanUrlPreservingTable('FLOW 7 COMPLETION');

              // Show success banner
              handleFlow7Success();
              console.log('[FLOW 7 SUCCESS] Order paid successfully - cart cleared, balance updated, banner shown');

              // Trigger balance refresh AFTER all state updates and localStorage writes complete
              // Increased from 3 to 5 seconds to allow Hive-Engine cache to update
              setTimeout(() => {
                console.log('[FLOW 7] Fetching fresh balance from localStorage');
                const accountName = localStorage.getItem('innopay_accountName');
                const lastBalance = localStorage.getItem('innopay_lastBalance');
                if (accountName && lastBalance) {
                  setWalletBalance({
                    accountName,
                    euroBalance: parseFloat(lastBalance)
                  });
                  console.log('[FLOW 7] Balance updated:', lastBalance);
                }
              }, 5000); // 5 seconds to allow Hive-Engine cache to update

            } else if (currentFlow === 'flow5_create_and_pay') {
              // FLOW 5: Create new account with order payment
              console.log('[FLOW 5 NEW ACCOUNT] Account created - webhook already paid restaurant');

              // Update wallet balance state
              setWalletBalance({
                accountName: credentials.accountName,
                euroBalance: credentials.euroBalance
              });

              // Clear cart - order was already paid by webhook
              clearCart();

              // Clear flow marker - flow is complete
              localStorage.removeItem('innopay_flow_pending');
              console.log('[FLOW 5 NEW ACCOUNT] Cart cleared, flow marker removed - order complete');

              // Remove query params from URL while preserving table
              cleanUrlPreservingTable('FLOW 5 NEW ACCOUNT');

              // Show success banner for Flow 5 (create_account_and_pay)
              setNewAccountCredentials({
                accountName: credentials.accountName,
                masterPassword: credentials.masterPassword,
                euroBalance: credentials.euroBalance,
              });
              handleFlow5Success();

            } else {
              // Normal account creation without order (no Flow 5 marker)
              console.log('[ACCOUNT CREATED] ⚠️ Entered ELSE branch - currentFlow:', currentFlow);                                      
              console.log('[ACCOUNT CREATED] This will cause page reload in 3 seconds!');     
              setNewAccountCredentials({
                accountName: credentials.accountName,
                masterPassword: credentials.masterPassword,
                euroBalance: credentials.euroBalance,
              });
              setShowAccountCreated(true);
              setAccountCreationComplete(true); // Mark as complete immediately (blockchain already done)

              // Clear cart since account was created with payment
              clearCart();

              console.log('[ACCOUNT CREATED] Success banner shown for account:', credentials.accountName);

              // Remove query params from URL while preserving table
              cleanUrlPreservingTable('ACCOUNT CREATED');

              // Refresh page after 3 seconds to load mini wallet with stored credentials
              setTimeout(() => {
                console.log('[ACCOUNT CREATED] Refreshing page to display mini wallet');
                window.location.reload();
              }, 3000);
            }
          }
        } catch (error) {
          console.error('[ACCOUNT CREATED] Error fetching credentials:', error);
        }
      };

      fetchCredentials();
    }
  }, [searchParams, clearCart, table, handleFlow5Success, handleFlow7Success]);

  // 🔧 DEBUG: Display last URL params from localStorage (persists across page reload)
  useEffect(() => {
    const debugLog = localStorage.getItem('innopay_debug_last_params');
    if (debugLog) {
      try {
        const parsed = JSON.parse(debugLog);
        console.log('🔧 [DEBUG RESTORE] Last URL params before any reload:', parsed);
      } catch (e) {
        console.error('🔧 [DEBUG RESTORE] Failed to parse debug log:', e);
      }
    }
  }, []);

  // 🔧 DEBUG: Load Eruda for mobile debugging (COMMENTED OUT FOR PRODUCTION)
  // Uncomment for mobile debugging only
  // useEffect(() => {
  //   const script = document.createElement('script');
  //   script.src = 'https://cdn.jsdelivr.net/npm/eruda';
  //   script.onload = () => {
  //     if ((window as any).eruda) {
  //       (window as any).eruda.init();
  //       console.log('🔧 Eruda mobile debugger loaded - tap floating button to open console');
  //     }
  //   };
  //   document.body.appendChild(script);

  //   return () => {
  //     // Cleanup on unmount
  //     if (script.parentNode) {
  //       script.parentNode.removeChild(script);
  //     }
  //   };
  // }, []);

  // Load import attempts counter from localStorage
  useEffect(() => {
    const storedAttempts = localStorage.getItem('innopay_import_attempts');
    if (storedAttempts) {
      const attempts = parseInt(storedAttempts, 10);
      setImportAttempts(attempts);
      if (attempts <= 0) {
        setImportDisabled(true);
      }
    }
  }, []);

  // Check for topup success return from innopay (Flow 2 - pure topup without order)
  useEffect(() => {
    const topupSuccess = searchParams.get('topup_success');
    const sessionId = searchParams.get('session_id');
    const amountParam = searchParams.get('amount');

    console.log('[TOPUP RETURN] Check:', {
      topupSuccess,
      sessionId,
      amountParam,
      cartLength: cart.length
    });

    if (topupSuccess === 'true') {
      console.log('[TOPUP RETURN] User returned from successful topup', {
        hasSessionId: !!sessionId,
        hasAmount: !!amountParam
      });

      // If session_id is present, this is create_account_and_pay flow
      // Fetch credentials and set optimistic balance
      if (sessionId) {
        console.log('[TOPUP RETURN] create_account_and_pay flow detected, fetching credentials');

        const fetchCredentialsAndClearCart = async () => {
          try {
            const innopayUrl = getInnopayUrl();

            console.log('[TOPUP RETURN] Fetching credentials with session_id:', sessionId);
            const response = await fetch(`${innopayUrl}/api/account/credentials`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId })
            });

            if (!response.ok) {
              console.error('[TOPUP RETURN] Failed to fetch credentials:', response.status);
              return;
            }

            const credentials = await response.json();
            console.log('[TOPUP RETURN] Credentials fetched:', credentials.accountName);

            // Store credentials in localStorage
            localStorage.setItem('innopay_accountName', credentials.accountName);
            if (credentials.masterPassword) {
              localStorage.setItem('innopay_masterPassword', credentials.masterPassword);
            }
            if (credentials.keys?.active?.privateKey) {
              localStorage.setItem('innopay_activePrivate', credentials.keys.active.privateKey);
            }
            if (credentials.keys?.posting?.privateKey) {
              localStorage.setItem('innopay_postingPrivate', credentials.keys.posting.privateKey);
            }
            if (credentials.keys?.memo?.privateKey) {
              localStorage.setItem('innopay_memoPrivate', credentials.keys.memo.privateKey);
            }

            // Set optimistic balance if amount provided
            if (amountParam) {
              const optimisticBalance = parseFloat(amountParam);
              console.log('[TOPUP RETURN] Setting optimistic balance:', optimisticBalance);
              // Save to localStorage for persistence
              localStorage.setItem('innopay_lastBalance', optimisticBalance.toString());
              setWalletBalance({
                accountName: credentials.accountName,
                euroBalance: optimisticBalance
              });
            } else {
              // FLOW 4: create_account_only - fetch actual balance from API
              console.log('[FLOW 4] create_account_only flow - setting balance from credentials');
              // Save credentials balance to localStorage
              localStorage.setItem('innopay_lastBalance', (credentials.euroBalance || 0).toString());
              setWalletBalance({
                accountName: credentials.accountName,
                euroBalance: credentials.euroBalance || 0
              });
              // Show MiniWallet for new users (Bug fix #3)
              setShowWalletBalance(true);
            }

            // Clear cart only if this was create_account_and_pay (has amount param)
            if (amountParam) {
              console.log('[TOPUP RETURN] Clearing cart after successful create_account_and_pay');
              clearCart();
            } else {
              console.log('[FLOW 4] create_account_only - keeping cart intact');
            }

            // Show success banner (Flow 4 vs others)
            if (amountParam) {
              setShowTopupSuccess(true);
            } else {
              // FLOW 4: Create account only (no order)
              setFlow4Success(true);
              console.log('[FLOW 4] Account created successfully, showing Flow 4 success banner');
            }

            // Clear params from URL while preserving table
            cleanUrlPreservingTable('TOPUP RETURN');

            // Fetch fresh balance after topup, then show unified success banner
            setTimeout(() => {
              console.log('[TOPUP RETURN] Fetching fresh balance');
              refetchBalance();
              setShowTopupSuccess(false);
              // Show unified success banner after topup banner disappears
              if (amountParam) {
                console.log('[FLOW 5] Showing unified success banner after topup');
                setFlow5Success(true);
              }
            }, 3000);

          } catch (error) {
            console.error('[TOPUP RETURN] Error fetching credentials:', error);
          }
        };

        fetchCredentialsAndClearCart();

      } else {
        // ───────────────────────────────────────────────────────────────────────────────
        // FLOW 7 RETURN: Topup successful, reload to trigger Flow 6 payment
        // Reference: FLOWS.md lines 197-244 - Step B Auto-pay
        // Flow 7 marker is already set in sessionStorage before redirect
        // After reload, the Flow 7 completion useEffect will check conditions and trigger Flow 6
        // ───────────────────────────────────────────────────────────────────────────────
        console.log('[TOPUP RETURN] Topup successful - updating balance and reloading');

        // Update optimistic balance from topup
        if (amountParam) {
          const topupAmount = parseFloat(amountParam);
          const currentBalance = parseFloat(localStorage.getItem('innopay_lastBalance') || '0');
          const newBalance = currentBalance + topupAmount;
          console.log('[TOPUP RETURN] Updated balance:', {
            before: currentBalance,
            topupAmount,
            after: newBalance
          });
          localStorage.setItem('innopay_lastBalance', newBalance.toFixed(2));
        }

        // Standard topup without pending order (cart will be checked after reload)
        console.log('[TOPUP RETURN] Reloading page - Flow 7 completion check will run on mount');

        // Show success banner
        setShowTopupSuccess(true);

        // Clear params from URL while preserving table
        cleanUrlPreservingTable('TOPUP SUCCESS');

        // Reload page after 2 seconds to refresh wallet balance
        setTimeout(() => {
          console.log('[TOPUP RETURN] Reloading page to refresh wallet balance');
          window.location.reload();
        }, 2000);
      }
    }
  }, [searchParams, table, clearCart]);

  // ✅ Balance fetching now handled by React Query useBalance hook above (lines 109-122)
  // Replaced 98 lines of manual fetch logic with automatic caching and smart refetching

  // ═══════════════════════════════════════════════════════════════════════════════
  // FLOW 7: REMOVED - Now using unified webhook approach
  // Old flow: topup → return → trigger Flow 6 (ping-pong)
  // New flow: topup → webhook does everything → return with order_success=true
  // ═══════════════════════════════════════════════════════════════════════════════

  // Poll for blockchain transaction completion
  useEffect(() => {
    if (!showPaymentSuccess || !currentSessionId || blockchainComplete) {
      return; // Don't poll if banner isn't showing or blockchain is already complete
    }

    let pollCount = 0;
    const maxPolls = 60; // Poll for up to 60 seconds (60 polls × 1 second)

    const pollInterval = setInterval(async () => {
      pollCount++;
      console.warn(`[BLOCKCHAIN POLL] Attempt ${pollCount}/${maxPolls} for session ${currentSessionId}`);

      try {
        const innopayUrl = getInnopayUrl();

        const response = await fetch(`${innopayUrl}/api/checkout/status?session_id=${currentSessionId}`);

        if (!response.ok) {
          console.error('[BLOCKCHAIN POLL] API error:', response.status);
          return;
        }

        const data = await response.json();
        console.warn('[BLOCKCHAIN POLL] Status:', data);

        if (data.isComplete) {
          console.warn('[BLOCKCHAIN POLL] ✓ Blockchain transactions complete - Flow 6 success!');
          handleFlow6Success(); // Flow 6: pay_with_account
          clearCart(); // Clear cart only on successful blockchain completion
          clearInterval(pollInterval);

          // Auto-hide banner after 10 seconds once blockchain is complete
          setTimeout(() => {
            console.warn('[PAYMENT SUCCESS] Auto-hiding banner after blockchain completion');
            setShowPaymentSuccess(false);
          }, 10000);
        }

      } catch (error) {
        console.error('[BLOCKCHAIN POLL] Error:', error);
      }

      // Stop polling after max attempts
      if (pollCount >= maxPolls) {
        console.warn('[BLOCKCHAIN POLL] Timeout - stopped polling after 60 attempts');
        clearInterval(pollInterval);
        // Set transmission error flag
        setTransmissionError(true);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [showPaymentSuccess, currentSessionId, blockchainComplete, handleFlow6Success]);

  useEffect(() => {
    // Set the table number in the cart context
    setTable(table);

    const fetchMenu = async () => {
      try {
        setLoading(true);
        setError(null); // Reset error state before fetching
        const response = await fetch('/api/menu'); // Fetch from your Next.js API route
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        // Cast data to the imported MenuData type
        const data: MenuData = await response.json();
        setMenu(data);
        setLoading(false);

        // Determine default menu section based on Luxembourg time
        const luxTime = new Date().toLocaleString('en-US', {
          timeZone: 'Europe/Luxembourg',
          hour12: false
        });
        const luxDate = new Date(luxTime);
        const hours = luxDate.getHours();
        const minutes = luxDate.getMinutes();
        const totalMinutes = hours * 60 + minutes;

        // Lunch: 11:45 - 14:15 (705 - 855 minutes)
        // Dinner: 18:30 - 21:59 (1110 - 1319 minutes)
        const isLunchTime = totalMinutes >= 705 && totalMinutes <= 855;
        const isDinnerTime = totalMinutes >= 1110 && totalMinutes <= 1319;

        if (isLunchTime || isDinnerTime) {
          setActiveMenuSection('dishes');
          console.log('Meal service time - defaulting to dishes');
        } else {
          setActiveMenuSection('drinks');
          console.log('Outside meal service - defaulting to drinks');
        }

        console.log("Fetched conversion rate:", data.conversion_rate);
      } catch (e: any) {
        setError(e.message);
        setLoading(false);
        console.error("Failed to fetch menu:", e);
      }
    };

    fetchMenu();
  }, [setTable, table]);

  // Process menu data into grouped categories once fetched
  useEffect(() => {
    if (menu) {
      // Filter out Sauces category (26) and maintain category order from API
      const filteredCategories = menu.categories.filter(cat => cat.category_id !== 26);

      // Build dishes by category
      const dishesArray: GroupedCategory<FormattedDish>[] = filteredCategories.map(cat => ({
        id: cat.category_id,
        name: cat.name,
        items: menu.dishes
          .filter(dish => dish.categoryIds.includes(cat.category_id))
          .sort((a, b) => {
            // Items with images first
            if (a.image && !b.image) return -1;
            if (!a.image && b.image) return 1;
            return 0; // Maintain original order for items with same image status
          })
      }));

      // Build drinks by category
      const drinksArray: GroupedCategory<FormattedDrink>[] = filteredCategories.map(cat => ({
        id: cat.category_id,
        name: cat.name,
        items: menu.drinks
          .filter(drink => drink.categoryIds.includes(cat.category_id))
          .sort((a, b) => {
            // Items with images first
            if (a.image && !b.image) return -1;
            if (!a.image && b.image) return 1;
            return 0; // Maintain original order for items with same image status
          })
      }));

      // Filter out empty categories
      const nonEmptyDishes = dishesArray.filter(cat => cat.items.length > 0);
      const nonEmptyDrinks = drinksArray.filter(cat => cat.items.length > 0);

      setGroupedDishes(nonEmptyDishes);
      setGroupedDrinks(nonEmptyDrinks);
    }
  }, [menu]);

  // Load saved wallet credentials on mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem('innopay_wallet_credentials');
    if (savedCredentials) {
      try {
        const credentials = JSON.parse(savedCredentials);
        setWalletCredentials(credentials);
        console.log('Loaded wallet credentials:', credentials.username);
      } catch (e) {
        console.error('Failed to parse saved credentials:', e);
      }
    } else {
      // Detect Safari/iOS and show wallet notification proactively
      // BUT only if no account exists in localStorage
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const hasAccount = !!localStorage.getItem('innopay_accountName');

      if ((isSafari || isIOS) && !hasAccount) {
        console.log('Safari/iOS detected (no account) - showing wallet notification proactively');
        setShowWalletNotification(true);
        setIsSafariBanner(true);
      } else if (hasAccount) {
        console.log('Safari/iOS detected but account exists - skipping banner');
      }
    }
  }, []);

  // Drag handlers for wallet banner
  // Listen for wallet credentials from wallet.innopay.lu
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Received postMessage from:', event.origin, 'data:', event.data);

      // Verify origin for security (allow localhost and local network for testing)
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const allowedOrigins = [
        'https://wallet.innopay.lu',
        'http://localhost:3000',
        `http://${currentHost}:3000`, // Dynamic local network support
      ];

      if (!allowedOrigins.includes(event.origin)) {
        console.log('Rejected message from unauthorized origin:', event.origin);
        console.log('Allowed origins:', allowedOrigins);
        return;
      }

      // Handle both old and new account creation message types
      if (event.data.type === 'INNOPAY_WALLET_CREATED' || event.data.type === 'INNOPAY_ACCOUNT_CREATED') {
        const { username, accountName, activeKey, masterPassword, postingKey, euroBalance } = event.data;
        const finalUsername = accountName || username; // Support both old and new field names
        console.log(`[${new Date().toISOString()}] [INDIESMENU] Processing ${event.data.type} message for:`, finalUsername);

        // Store credentials (store all available keys for future use)
        const credentials = {
          username: finalUsername,
          activeKey,
          ...(masterPassword && { masterPassword }), // Include master password if available
          ...(postingKey && { postingKey }), // Include posting key if available
        };
        setWalletCredentials({ username: finalUsername, activeKey });
        localStorage.setItem('innopay_wallet_credentials', JSON.stringify(credentials));

        // Hide wallet notification
        setShowWalletNotification(false);

        // Show account creation success banners
        setShowAccountCreated(true);
        setAccountCreationComplete(false); // Start with yellow banner

        // Store account credentials for display
        setNewAccountCredentials({
          accountName: finalUsername,
          masterPassword: masterPassword || '(stored securely)',
          euroBalance: euroBalance || 0
        });

        console.log(`[${new Date().toISOString()}] [INDIESMENU] Wallet credentials stored for ${finalUsername}`);

        // Simulate order transmission completion after 2 seconds (yellow → green transition)
        setTimeout(() => {
          setAccountCreationComplete(true);
        }, 2000);
      }
    };

    window.addEventListener('message', handleMessage);
    console.log('postMessage listener registered');
    return () => window.removeEventListener('message', handleMessage);
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
  }, [addItem, menu]);

  const handleCallWaiter = useCallback(async () => {
    console.log('[CALL WAITER] Initiating call waiter flow');

    // Check if user has wallet credentials in localStorage
    const accountName = localStorage.getItem('innopay_accountName');
    const activeKey = localStorage.getItem('innopay_activePrivate');
    const masterPassword = localStorage.getItem('innopay_masterPassword');

    // Call waiter parameters (0.02 EURO tokens, special memo)
    const callWaiterAmount = 0.02;
    const callWaiterMemo = 'Un serveur est appelé ' + (table ? `TABLE ${table}` : '');

    console.log('[CALL WAITER] Order details:', {
      hasAccount: !!accountName,
      hasActiveKey: !!activeKey,
      hasMasterPassword: !!masterPassword,
      amount: callWaiterAmount,
      memo: callWaiterMemo
    });

    if (accountName && (activeKey || masterPassword)) {
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
            console.log('[CALL WAITER] Sending active key (with fallback to innopay authority)');
          } else if (masterPassword) {
            signPayload.masterPassword = masterPassword;
            signPayload.accountName = accountName;
            console.log('[CALL WAITER] Sending master password (with fallback to innopay authority)');
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
            distriateSuffix: '-'  // Minimal suffix (API requires truthy value)
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

    // Check if user has wallet credentials in localStorage
    const accountName = localStorage.getItem('innopay_accountName');
    const activeKey = localStorage.getItem('innopay_activePrivate');
    const masterPassword = localStorage.getItem('innopay_masterPassword');

    console.log('[WALLET PAYMENT] Checking credentials:', {
      hasAccount: !!accountName,
      hasActiveKey: !!activeKey,
      hasMasterPassword: !!masterPassword
    });

    if (accountName && (activeKey || masterPassword)) {
      // ═════════════════════════════════════════════════════════════════════════
      // FLOW 6 & 7 ENTRY POINT - EXISTING ACCOUNT PAYMENT (Nov 2025)
      // ═════════════════════════════════════════════════════════════════════════
      // User has credentials → Check balance → Route to Flow 6 or Flow 7
      // Flow 6 (sufficient balance): Direct payment with dual-currency system
      // Flow 7 (insufficient balance): Redirect to innopay for topup
      // Reference: lib/flows.ts, FLOWS.md lines 148-244
      // ═════════════════════════════════════════════════════════════════════════
      console.log('[WALLET PAYMENT] Customer has credentials, initiating EURO token payment');

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

        // alert(`Étape 6: Création opération EURO (${amountEuro}€)...`);
        // 6. Create EURO transfer operation (customer → innopay)
        const euroOp = createEuroTransferOperation(
          accountName,
          'innopay',
          amountEuro,
          suffix  // Only suffix, not full order memo
        );

        // alert('Étape 7: Signature et diffusion (serveur)...');
        console.log('[WALLET PAYMENT] Sending operation to server for signing...');

        // 5. Sign and broadcast EURO transfer SERVER-SIDE with cascade fallback
        const innopaySignUrl = getInnopayUrl();

        // Send either activeKey or masterPassword to server for signing
        // Server will try user's key first, fallback to innopay authority if needed
        const signPayload: any = {
          operation: euroOp,
        };

        if (activeKey) {
          signPayload.activePrivateKey = activeKey;
          console.log('[WALLET PAYMENT] Sending active key (with fallback to innopay authority)');
        } else if (masterPassword) {
          signPayload.masterPassword = masterPassword;
          signPayload.accountName = accountName;
          console.log('[WALLET PAYMENT] Sending master password (with fallback to innopay authority)');
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

        // Force immediate fresh balance fetch from blockchain
        console.log('[WALLET PAYMENT] Triggering fresh balance fetch from blockchain...');
        refetchBalance();

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

        // Show unified order success banner (replaced alert for consistency with other flows)
        setFlow6Success(true);
        // alert('Commande envoyée avec succès!'); // OLD: Replaced with unified banner

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
    const hiveOpUrl = orderNow();

    // Set a flag to detect if the page loses focus (app opened)
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

        // Only consider it successful if blur lasted more than 2 seconds (real app switch)
        // Safari error alert causes brief blur (<500ms)
        if (blurDuration > 2000) {
          protocolHandlerWorked = true;
          console.log('Blur duration suggests successful app switch - clearing cart');
          clearCart();
        }
      }
    };

    window.addEventListener('blur', blurHandler);
    window.addEventListener('focus', focusHandler);

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
        setShowWalletNotification(true);
        setIsSafariBanner(false); // This is a protocol handler failure, not Safari detection
      }
    }, 3000);
  }, [cart.length, orderNow, clearCart, walletCredentials]);

  const handleGuestCheckout = useCallback(() => {
    if (cart.length === 0) {
      alert('Rien a commander !');
      return;
    }
    // Show warning modal first
    setShowGuestWarningModal(true);
  }, [cart.length]);

  const handleExternalWallet = useCallback(() => {
    // For call waiter flow, always allow (no cart check)
    if (!isCallWaiterFlow && cart.length === 0) {
      alert('Rien a commander !');
      return;
    }

    console.log('[EXTERNAL WALLET] User requested external wallet on Safari/iOS');

    // Generate the hive://sign/ URL
    const hiveOpUrl = isCallWaiterFlow ? callWaiter() : orderNow();

    // Set a flag to detect if the page loses focus (app opened)
    let protocolHandlerWorked = false;
    let blurTime = 0;
    let errorOccurred = false;

    const blurHandler = () => {
      blurTime = Date.now();
      console.log('[EXTERNAL WALLET] Page lost focus - protocol handler might have worked');
    };

    const focusHandler = () => {
      if (blurTime > 0) {
        const blurDuration = Date.now() - blurTime;
        console.log(`[EXTERNAL WALLET] Page regained focus after ${blurDuration}ms`);

        // Only consider it successful if blur lasted more than 2 seconds (real app switch)
        // Safari error dialog causes brief blur (<500ms)
        if (blurDuration > 2000) {
          protocolHandlerWorked = true;
          console.log('[EXTERNAL WALLET] Blur duration suggests successful app switch - clearing cart');
          // Only clear cart for normal orders, not for call waiter
          if (!isCallWaiterFlow) {
            clearCart();
          }
        } else {
          // Short blur likely means Safari error was shown and dismissed
          console.log('[EXTERNAL WALLET] Short blur - likely Safari error, NOT clearing cart');
          errorOccurred = true;
        }
      }
    };

    window.addEventListener('blur', blurHandler);
    window.addEventListener('focus', focusHandler);

    // Try to open the hive:// URL
    try {
      window.location.href = hiveOpUrl;
    } catch (error) {
      console.log('[EXTERNAL WALLET] Failed to open hive:// URL:', error);
      errorOccurred = true;
    }

    // After 3 seconds, check if the protocol handler worked
    setTimeout(() => {
      window.removeEventListener('blur', blurHandler);
      window.removeEventListener('focus', focusHandler);

      if (!protocolHandlerWorked) {
        console.log('[EXTERNAL WALLET] Protocol handler did not work - cart preserved');
      }
    }, 3000);
  }, [cart.length, orderNow, clearCart, isCallWaiterFlow, callWaiter]);

  // Handle import account button click
  const handleImportAccount = useCallback(() => {
    if (importDisabled) return;
    setShowImportModal(true);
    setImportEmail('');
    setImportError('');
    setImportStep('email');
    setVerificationCode('');
    setMultipleAccounts([]);
  }, [importDisabled]);

  // Handle email submission (request verification code)
  const handleRequestCode = useCallback(async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitizedEmail = importEmail.trim().toLowerCase();

    if (!emailRegex.test(sanitizedEmail)) {
      setImportError('Format d\'email invalide');
      setTimeout(() => setImportError(''), 3000);
      return;
    }

    setImportLoading(true);
    setImportError('');

    try {
      const innopayUrl = getInnopayUrl();
      console.log('[VERIFY] Requesting code for:', sanitizedEmail);

      const response = await fetch(`${innopayUrl}/api/verify/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sanitizedEmail, language: 'fr' })
      });

      const data = await response.json();
      console.log('[VERIFY] Request response:', data);

      if (data.found === true) {
        // Code sent! Move to code entry step
        setImportStep('code');
        setImportLoading(false);
      } else if (data.found === false) {
        // Email not found - decrement attempts
        const newAttempts = importAttempts - 1;
        setImportAttempts(newAttempts);
        localStorage.setItem('innopay_import_attempts', newAttempts.toString());

        if (newAttempts <= 0) {
          setImportError('Rien dans la base de données, désolé!');
          setImportDisabled(true);

          setTimeout(() => {
            setImportError('');
            setImportLoading(false);
            setShowImportModal(false);
          }, 3000);
        } else {
          setImportError(`Vous avez peut-être utilisé une adresse mail différente (${newAttempts} tentatives restantes)`);

          setTimeout(() => {
            setImportError('');
            setImportLoading(false);
          }, 3000);
        }
      } else if (data.error) {
        setImportError(data.error);
        setTimeout(() => {
          setImportError('');
          setImportLoading(false);
        }, 3000);
      }
    } catch (error) {
      console.error('[VERIFY] Network error:', error);
      setImportError('Erreur de connexion au serveur');
      setTimeout(() => {
        setImportError('');
        setImportLoading(false);
      }, 3000);
    }
  }, [importEmail, importAttempts]);

  // Handle verification code submission
  const handleVerifyCode = useCallback(async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setImportError('Entrez un code à 6 chiffres');
      setTimeout(() => setImportError(''), 3000);
      return;
    }

    setImportLoading(true);
    setImportError('');

    try {
      const innopayUrl = getInnopayUrl();
      console.log('[VERIFY] Checking code:', verificationCode);

      const response = await fetch(`${innopayUrl}/api/verify/check-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: importEmail.trim().toLowerCase(),
          code: verificationCode
        })
      });

      const data = await response.json();
      console.log('[VERIFY] Check response:', data);

      if (data.success === true) {
        if (data.single === true) {
          // Single account - auto-import
          console.log('[VERIFY] Single account found:', data.accountName);

          localStorage.setItem('innopay_accountName', data.accountName);
          localStorage.setItem('innopay_masterPassword', data.masterPassword || '');

          if (data.keys) {
            localStorage.setItem('innopay_activePrivate', data.keys.active);
            localStorage.setItem('innopay_postingPrivate', data.keys.posting);
            localStorage.setItem('innopay_memoPrivate', data.keys.memo);
          }

          // Refresh page to activate account
          window.location.reload();

        } else {
          // Multiple accounts - show selection
          console.log('[VERIFY] Multiple accounts found:', data.accounts);
          setMultipleAccounts(data.accounts);
          setImportStep('select');
          setImportLoading(false);
        }
      } else if (data.error) {
        setImportError(data.error);
        setTimeout(() => {
          setImportError('');
          setImportLoading(false);
        }, 3000);
      }
    } catch (error) {
      console.error('[VERIFY] Network error:', error);
      setImportError('Erreur de connexion au serveur');
      setTimeout(() => {
        setImportError('');
        setImportLoading(false);
      }, 3000);
    }
  }, [verificationCode, importEmail]);

  // Handle account selection (when multiple accounts found)
  const handleSelectAccount = useCallback(async (accountName: string) => {
    setImportLoading(true);
    setImportError('');

    try {
      const innopayUrl = getInnopayUrl();
      console.log('[VERIFY] Selecting account:', accountName);

      const response = await fetch(`${innopayUrl}/api/verify/get-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName,
          email: importEmail.trim().toLowerCase()
        })
      });

      const data = await response.json();
      console.log('[VERIFY] Credentials response:', data);

      if (data.accountName) {
        localStorage.setItem('innopay_accountName', data.accountName);
        localStorage.setItem('innopay_masterPassword', data.masterPassword || '');

        if (data.keys) {
          localStorage.setItem('innopay_activePrivate', data.keys.active);
          localStorage.setItem('innopay_postingPrivate', data.keys.posting);
          localStorage.setItem('innopay_memoPrivate', data.keys.memo);
        }

        // Refresh page to activate account
        window.location.reload();
      } else if (data.error) {
        setImportError(data.error);
        setTimeout(() => {
          setImportError('');
          setImportLoading(false);
        }, 3000);
      }
    } catch (error) {
      console.error('[VERIFY] Network error:', error);
      setImportError('Erreur de connexion au serveur');
      setTimeout(() => {
        setImportError('');
        setImportLoading(false);
      }, 3000);
    }
  }, [importEmail]);

  const proceedWithGuestCheckout = useCallback(async () => {
    try {
      // Hide wallet notification banner when guest checkout starts
      setGuestCheckoutStarted(true);

      // Use no-discount price + 5% processing fee
      const amountEuroNoDiscount = parseFloat(getTotalEurPriceNoDiscount());
      const amountEuroWithFee = amountEuroNoDiscount * 1.05;

      // Generate distriate suffix for guest checkout tracking
      const { distriate } = await import('@/lib/utils');
      const distriateSuffix = distriate('gst'); // 'gst' tag for guest checkout
      const baseMemo = getMemo();
      const customMemo = `${baseMemo} ${distriateSuffix}`;

      console.log('Guest checkout:', { amountEuroWithFee, memo: customMemo, distriateSuffix });

      const innopayUrl = getInnopayUrl();

      console.log('[DEBUG] Current hostname:', window.location.hostname);
      console.log('[DEBUG] Determined innopayUrl:', innopayUrl);

      // Build return URL for success redirect (always back to current origin)
      const returnUrl = `${window.location.origin}/menu?table=${table}`;

      console.log('Fetching from:', `${innopayUrl}/api/checkout/guest`);
      console.log('Request body:', { amountEuro: amountEuroWithFee, recipient: 'indies.cafe', memo: customMemo, returnUrl });

      const response = await fetch(`${innopayUrl}/api/checkout/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountEuro: amountEuroWithFee,
          recipient: 'indies.cafe',
          memo: customMemo,
          returnUrl
        })
      });

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

      // Show detailed error in alert for debugging in production
      const errorDetails = error.message || 'Unknown error';
      alert(`Erreur lors de la création de la session de paiement.\n\nDétails: ${errorDetails}\n\nVeuillez réessayer ou contacter le support.`);
    }
  }, [getTotalEurPriceNoDiscount, getMemo, clearCart, table]);


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
      {/* Wallet Notification Banner */}
      {showWalletNotification && !walletCredentials && !guestCheckoutStarted && !showPaymentSuccess && !flow4Success && (
        <Draggable
          className="z-[8990] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 shadow-lg rounded-lg"
          style={{
            top: cart.length === 0 && welcomeCarouselHeight > 0
              ? `${totalFixedHeaderHeight + welcomeCarouselHeight}px`
              : `${totalFixedHeaderHeight}px`,
            width: '100%',
            maxWidth: '896px', // max-w-4xl = 56rem = 896px
          }}
          initialPosition={{ x: 0, y: 0 }}
        >
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            {/* Drag handle indicator */}
            <div className="text-white opacity-50 text-xs flex-shrink-0">
              ⋮⋮
            </div>

            {/* Left zone: Text - takes most space */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm md:text-base">
                {isSafariBanner && cart.length === 0
                  ? "💳 Si vous n'avez pas de portefeuille compatible Innopay, nous conseillons de créer un compte avant de commander!"
                  : "💳 Pour commander, créez votre portefeuille Innopay"
                }
              </p>
              {(!isSafariBanner || cart.length > 0) && (
                <p className="text-xs md:text-sm opacity-90 mt-1">
                  Gratuit et instantané - Pas besoin d'installer d'application
                </p>
              )}
            </div>

            {/* Center zone: Buttons stacked */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              {/* Import Account Button */}
              <button
                onClick={handleImportAccount}
                disabled={importDisabled}
                className={`px-3 py-1.5 rounded-lg font-normal text-xs transition-colors w-[120px] text-center ${
                  importDisabled
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-sky-200 text-gray-800 hover:bg-sky-300'
                }`}
                style={{ whiteSpace: 'normal', lineHeight: '1.3' }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                Importer un compte
              </button>

              <button
                onClick={() => {
                  // Build base URL based on environment
                  const baseUrl = typeof window !== 'undefined'
                    ? `${getInnopayUrl()}/user`
                    : 'https://wallet.innopay.lu/user';

                  // Get parameters based on flow type
                  let orderAmount, discount, customMemo;

                  if (isCallWaiterFlow) {
                    // Call waiter flow - fixed parameters
                    orderAmount = '0.02';
                    discount = '0';
                    customMemo = 'Un serveur est appelé ' + (table ? `TABLE ${table}` : '');
                    console.log(`[${new Date().toISOString()}] [CALL WAITER] Opening account creation for call waiter`);
                  } else {
                    // Normal order flow
                    orderAmount = getTotalEurPrice();
                    discount = getDiscountAmount();
                    customMemo = getMemo();
                    console.log(`[${new Date().toISOString()}] [INDIESMENU] Opening account creation with params:`, {
                      orderAmount,
                      discount,
                      memoLength: customMemo.length,
                      memo: customMemo.substring(0, 100) + (customMemo.length > 100 ? '...' : '')
                    });
                  }

                  // Build URL with parameters
                  const params = new URLSearchParams();
                  params.set('restaurant', 'indies'); // Restaurant identifier for innopay hub
                  params.set('restaurant_account', recipient); // Hive account for payment destination
                  params.set('table', table); // Add table parameter for restaurant context
                  params.set('order_amount', orderAmount);
                  if (parseFloat(discount) > 0) {
                    params.set('discount', discount);
                  }
                  params.set('memo', customMemo);

                  // Add return_url to preserve environment (dev/prod) for redirect back
                  const returnUrl = `${window.location.origin}/menu`;
                  params.set('return_url', returnUrl);
                  console.log('[FLOW 5] Return URL set:', returnUrl);

                  // Set Flow 5 marker for account creation with order
                  localStorage.setItem('innopay_flow_pending', 'flow5_create_and_pay');
                  console.log('[FLOW 5] Set flow marker: flow5_create_and_pay');

                  // Navigate in same window (like guest checkout)
                  window.location.href = `${baseUrl}?${params.toString()}`;
                }}
                className="bg-white text-blue-600 px-4 py-3 rounded-lg font-bold text-base hover:bg-blue-50 transition-colors w-[180px] text-center flex items-center justify-center gap-2"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <span>Créer un compte</span>
                <img src="/images/favicon-32x32.png" alt="innopay" className="w-10 h-10" />
              </button>

              {/* External Wallet Button - Show when cart has items OR when triggered by order button (not just Safari detection) */}
              {(!isSafariBanner || cart.length > 0) && (
                <button
                  onClick={handleExternalWallet}
                  className="bg-black text-red-500 px-4 py-3 rounded-lg font-semibold text-sm hover:bg-gray-900 transition-colors w-[180px] text-center"
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  title="Use external wallet app like Hive Keychain or Ecency / Utiliser une app portefeuille externe comme Hive Keychain ou Ecency"
                >
                  Portefeuille externe
                </button>
              )}

              <button
                onClick={handleGuestCheckout}
                className="bg-gray-600 bg-opacity-60 text-gray-300 px-3 py-1.5 rounded-lg font-normal text-xs hover:bg-opacity-70 transition-colors w-[120px] text-center"
                style={{ whiteSpace: 'normal', lineHeight: '1.3' }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                Commandez sans compte
              </button>
            </div>

            {/* Right zone: Close button - minimal width */}
            <div className="flex-shrink-0 w-2">
              <button
                onClick={() => {
                  setShowWalletNotification(false);
                  setIsCallWaiterFlow(false); // Reset call waiter flow flag
                  console.log('Notification dismissed temporarily - will show again on next order attempt');
                }}
                className="text-white hover:text-blue-200 transition-colors p-1"
                aria-label="Fermer"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                ✕
              </button>
            </div>
          </div>
        </Draggable>
      )}

      {/* Payment Success Banner - Two States */}
      {showPaymentSuccess && !blockchainComplete && !transmissionError && (
        <div className="fixed top-0 left-0 right-0 z-[9000] bg-gradient-to-r from-yellow-500 to-yellow-600 text-blue-700 px-4 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
              <div>
                <p className="font-semibold text-base md:text-lg">
                  Paiement réussi!
                </p>
                <p className="text-sm opacity-90">
                  Commande en cours de transmission...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transmission Error Banner - Shows below yellow payment success */}
      {showPaymentSuccess && transmissionError && (
        <>
          {/* Yellow payment success banner (stays visible) */}
          <div className="fixed top-0 left-0 right-0 z-[9000] bg-gradient-to-r from-yellow-500 to-yellow-600 text-blue-700 px-4 py-3 shadow-lg">
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✓</span>
                <p className="font-semibold text-base md:text-lg">
                  Paiement réussi!
                </p>
              </div>
            </div>
          </div>

          {/* Grey error banner below */}
          <div className="fixed left-0 right-0 z-[8990] bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-4 shadow-lg" style={{ top: '60px' }}>
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col items-center gap-3">
                <div className="text-center">
                  <p className="font-semibold text-base md:text-lg">
                    Une erreur de transmission s'est produite
                  </p>
                  <p className="text-sm opacity-90">
                    Veuillez appeler un serveur et nous en excuser
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCartComposition(true)}
                    className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-md opacity-80 hover:opacity-100"
                  >
                    Commande
                  </button>
                  <button
                    onClick={() => {
                      clearCart();
                      setShowPaymentSuccess(false);
                      setTransmissionError(false);
                    }}
                    className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors shadow-md opacity-80 hover:opacity-100"
                  >
                    Effacer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* REMOVED: Duplicate success banner - now unified below with Flow 5 and Flow 7 */}

      {/* Account Creation Success - Yellow Banner (Processing) */}
      {showAccountCreated && !accountCreationComplete && (
        <div className="fixed top-0 left-0 right-0 z-[9000] bg-gradient-to-r from-yellow-500 to-yellow-600 text-blue-700 px-4 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-700"></div>
              <div>
                <p className="font-semibold text-base md:text-lg">
                  Compte créé! Paiement réussi!
                </p>
                <p className="text-sm opacity-90">
                  Commande en cours de transmission...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flow 4 Success Banner - create_account_only (no order) */}
      {flow4Success && (
        <div className="fixed top-0 left-0 right-0 z-[9000] bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✓</span>
              <div>
                <p className="font-semibold text-base md:text-lg">
                  Votre portefeuille Innopay est prêt, vous pouvez déjà commander
                </p>
              </div>
            </div>
            <button
              onClick={() => setFlow4Success(false)}
              className="bg-white text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors ml-4"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* UNIFIED Order Success Banner - Flow 5 (create_account_and_pay), Flow 6 (pay_with_account), Flow 7 (pay_with_topup) */}
      {(flow5Success || flow6Success || flow7Success) && (
        <div className="fixed top-0 left-0 right-0 z-[9020] bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✓</span>
              <div>
                <p className="font-semibold text-base md:text-lg">
                  Votre commande a été transmise et est en cours de préparation
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setFlow5Success(false);
                setFlow6Success(false);
                setFlow7Success(false);
              }}
              className="bg-white text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors ml-4"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Waiter Called Success Banner */}
      {waiterCalledSuccess && (
        <div className="fixed top-0 left-0 right-0 z-[9020] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔔</span>
              <div>
                <p className="font-semibold text-base md:text-lg">
                  Un serveur arrive à votre table!
                </p>
                <p className="text-sm opacity-90">
                  Waiter notified - someone will be with you shortly
                </p>
              </div>
            </div>
            <button
              onClick={() => setWaiterCalledSuccess(false)}
              className="bg-white text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors ml-4"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* DEV ONLY: Clear localStorage button */}
      {(window.location.hostname === 'localhost' ||
        window.location.hostname.includes('127.0.0.1') ||
        window.location.hostname.startsWith('192.168.')) && (
        <div className="fixed top-2 right-2 z-[10001]">
          <button
            onClick={() => {
              if (confirm('Clear all localStorage and sessionStorage (dev only)? Table number will be preserved.')) {
                // Preserve table number
                const currentTable = new URLSearchParams(window.location.search).get('table');

                // Clear all innopay-related items from localStorage
                localStorage.removeItem('innopay_accountName');
                localStorage.removeItem('innopay_masterPassword');
                localStorage.removeItem('innopay_activePrivate');
                localStorage.removeItem('innopay_postingPrivate');
                localStorage.removeItem('innopay_memoPrivate');
                localStorage.removeItem('innopay_import_attempts');
                localStorage.removeItem('innopay_accounts');
                localStorage.removeItem('innopay_wallet_credentials');
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

      {/* Topup Success Banner */}
      {showTopupSuccess && (
        <div className="fixed top-0 left-0 right-0 z-[9010] bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✓</span>
              <div>
                <p className="font-semibold text-base md:text-lg">
                  Rechargement réussi!
                </p>
                <p className="text-sm opacity-90">
                  Mise à jour du solde en cours...
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowTopupSuccess(false);
                setFlow5Success(true);
                console.log('[TOPUP BANNER] Dismissed manually, showing unified success banner');
              }}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Account Creation Success - Blue Banner (Account Credentials) */}
      {showAccountCreated && accountCreationComplete && newAccountCredentials && (
        <div className="fixed top-0 left-0 right-0 z-[9000] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4 shadow-lg">
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎉</span>
                <div>
                  <p className="font-semibold text-base md:text-lg">
                    Compte créé avec succès!
                  </p>
                  <p className="text-sm opacity-90">
                    Votre commande est en cours de préparation
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAccountCreated(false);
                  setNewAccountCredentials(null);
                }}
                className="bg-white text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                OK
              </button>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <span className="opacity-75">Compte:</span>
                  <span className="ml-2 font-mono font-bold">{newAccountCredentials.accountName}</span>
                </div>
                <div>
                  <span className="opacity-75">Solde:</span>
                  <span className="ml-2 font-bold">{newAccountCredentials.euroBalance.toFixed(2)} EURO</span>
                </div>
              </div>
              <div className="mt-2">
                <span className="opacity-75">Mot de passe:</span>
                <span className="ml-2 font-mono text-xs break-all">{newAccountCredentials.masterPassword}</span>
              </div>
              <p className="mt-2 text-xs opacity-75">
                💡 Vos identifiants sont sauvegardés. Vous pouvez commander directement la prochaine fois!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Balance Reopen Button */}
      <WalletReopenButton
        visible={!showWalletBalance && !!walletBalance}
        onClick={() => setShowWalletBalance(true)}
      />

      {/* Persistent Wallet Balance Indicator */}
      {walletBalance && (
        <MiniWallet
          balance={walletBalance}
          visible={showWalletBalance}
          onClose={() => setShowWalletBalance(false)}
          balanceSource={balanceSource || undefined}
        />
      )}

      {/* Import Account Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl relative">
            {/* Close button */}
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>

            <h3 className="text-xl font-bold mb-4 text-gray-800 text-center">Importer un compte</h3>

            {/* Show appropriate content based on step and error state */}
            {importError && importStep === 'email' ? (
              <div className="text-center py-8">
                <p className="text-red-600 font-semibold text-lg">{importError}</p>
              </div>
            ) : (
              <>
                {/* Step 1: Email input (original design) */}
                {importStep === 'email' && (
                  <>
                    <p className="text-sm text-gray-600 mb-4 text-center">
                      Entrez l'adresse email que vous avez utilisé pour créer le compte
                    </p>

                    <input
                      type="email"
                      value={importEmail}
                      onChange={(e) => setImportEmail(e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-blue-500 text-gray-800"
                      disabled={importLoading}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !importLoading) {
                          handleRequestCode();
                        }
                      }}
                    />

                    <p className="text-xs text-gray-500 mb-4 text-center">
                      {importAttempts} tentative{importAttempts > 1 ? 's' : ''} restante{importAttempts > 1 ? 's' : ''}
                    </p>

                    <button
                      onClick={handleRequestCode}
                      disabled={importLoading || !importEmail}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {importLoading ? 'Recherche...' : 'Récupérer'}
                    </button>
                  </>
                )}

                {/* Step 2: Code verification (replaces the old immediate import) */}
                {importStep === 'code' && (
                  <>
                    <p className="text-sm text-gray-600 mb-4 text-center">
                      Un code de vérification a été envoyé à <strong>{importEmail}</strong>
                    </p>

                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Code à 6 chiffres"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg mb-4 focus:outline-none focus:border-blue-500 text-gray-800 text-center text-2xl font-mono tracking-widest"
                      disabled={importLoading}
                      maxLength={6}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !importLoading && verificationCode.length === 6) {
                          handleVerifyCode();
                        }
                      }}
                    />

                    {importError && (
                      <p className="text-xs text-red-600 mb-4 text-center">{importError}</p>
                    )}

                    <button
                      onClick={handleVerifyCode}
                      disabled={importLoading || verificationCode.length !== 6}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mb-2"
                    >
                      {importLoading ? 'Vérification...' : 'Vérifier'}
                    </button>

                    <button
                      onClick={() => {
                        setImportStep('email');
                        setVerificationCode('');
                        setImportError('');
                      }}
                      className="w-full text-blue-600 hover:text-blue-800 text-sm"
                    >
                      ← Retour
                    </button>
                  </>
                )}

                {/* Step 3: Multiple accounts selection (if needed) */}
                {importStep === 'select' && (
                  <>
                    <p className="text-sm text-gray-600 mb-4 text-center">
                      Plusieurs comptes trouvés. Sélectionnez celui à importer:
                    </p>

                    <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                      {multipleAccounts.map((account) => (
                        <button
                          key={account.accountName}
                          onClick={() => handleSelectAccount(account.accountName)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                        >
                          <div className="font-semibold text-gray-800">{account.accountName}</div>
                          <div className="text-sm text-gray-600">
                            Solde: {account.euroBalance.toFixed(2)} € •
                            Créé: {new Date(account.creationDate).toLocaleDateString('fr-FR')}
                          </div>
                        </button>
                      ))}
                    </div>

                    {importError && (
                      <p className="text-xs text-red-600 mb-4 text-center">{importError}</p>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Guest Checkout Warning Modal */}
      {showGuestWarningModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-700 text-gray-300 rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-center">Commander sans compte</h3>

            <p className="text-sm mb-3">
              Commander sans compte implique une <span className="text-red-600 font-semibold">charge supplémentaire de <span className="text-red-500 font-bold">5%</span></span> liée aux commissions de carte bancaire.
            </p>

            {parseFloat(getDiscountAmount()) > 0 && (
              <p className="text-sm mb-4">
                En commandant sans créer un compte vous <span className="text-red-600 font-semibold">renoncez à un discount de: <span className="text-red-500 font-bold">{getDiscountAmount()} €</span></span>
              </p>
            )}

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => {
                  setShowGuestWarningModal(false);
                  proceedWithGuestCheckout();
                }}
                className="bg-black text-gray-300 px-4 py-3 rounded-lg font-semibold hover:bg-gray-900 transition-colors"
              >
                Continuer et payer <span className="text-red-500">{(parseFloat(getTotalEurPriceNoDiscount()) * 1.05).toFixed(2)} €</span>
              </button>

              <button
                onClick={() => setShowGuestWarningModal(false)}
                className="bg-white text-blue-600 px-4 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                Revenir pour bénéficier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Status Display - Shows when credentials are loaded */}
      {walletCredentials && (
        <div className="fixed top-[80px] left-0 right-0 z-[8990] bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">✓</span>
              <div>
                <p className="font-semibold text-sm md:text-base">
                  Connecté: @{walletCredentials.username}
                </p>
                <p className="text-xs opacity-90">
                  Portefeuille Innopay actif
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('Déconnecter votre portefeuille?')) {
                  localStorage.removeItem('innopay_wallet_credentials');
                  setWalletCredentials(null);
                }
              }}
              className="text-white hover:text-green-200 transition-colors px-3 py-1 text-sm border border-white rounded"
            >
              Déconnecter
            </button>
          </div>
        </div>
      )}

      {/* Fixed Cart Section */}
      {cart.length > 0 && (
        <div ref={cartRef} className="fixed-cart-container">
          <div className="cart-header">Votre Ordre ({getTotalItems()} items) <br/><span className="text-sm">Les prix affichés incluent le discount</span></div>
          <div ref={cartItemsListRef} className="cart-items-list">
            {cart.map(item => (
              // Use the memoized CartItemDisplay component
              <CartItemDisplay
                key={item.id} // Ensure key is unique based on ID + options
                item={item}
                tableParam={table}
                updateQuantity={updateQuantity}
                removeItem={removeItem}
              />
            ))}
          </div>
          <div className="cart-summary-row">
            <span className="cart-total-text">Total: {getTotalEurPrice()}&nbsp;€</span>
            <button onClick={handleCallWaiter} className="call-waiter-button">
              Serveur&nbsp;!
            </button>
            <button onClick={handleOrder} className="order-now-button" disabled={orderProcessing}>
              {orderProcessing ? `${orderElapsedSeconds}s` : 'Commandez'}
            </button>
          </div>
        </div>
      )}

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
                priority
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
              <p className="mt-2 text-lg md:text-xl drop-shadow-md">Table {table} - Explorez notre menu</p>
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
                      <MenuItem
                        key={item.id}
                        item={item}
                        selectedCuisson={selectedCuisson}
                        handleCuissonChange={handleCuissonChange}
                        handleAddItem={handleAddItem}
                        selectedSizes={{}} // Not used for dishes currently
                        handleSizeChange={() => {}} // Not used for dishes currently
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
      {showCartComposition && (
        <div
          className="fixed inset-0 z-[10000] bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={() => setShowCartComposition(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h2 className="text-xl font-bold">Composition de la commande</h2>
              <button
                onClick={() => setShowCartComposition(false)}
                className="text-2xl hover:text-gray-200 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Panier vide</p>
              ) : (
                <>
                  <div className="space-y-4">
                    {cart.map((item, index) => (
                      <div key={index} className="border-b border-gray-200 pb-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">{item.name}</h3>
                            {item.options?.size && (
                              <p className="text-sm text-gray-600">Taille: {item.options.size}</p>
                            )}
                            {item.options?.cuisson && (
                              <p className="text-sm text-gray-600">Cuisson: {item.options.cuisson}</p>
                            )}
                            {item.options?.selectedIngredients && item.options.selectedIngredients.length > 0 && (
                              <p className="text-sm text-gray-600">
                                Ingrédients: {item.options.selectedIngredients}
                              </p>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                              Quantité: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold text-gray-800">
                              {(parseFloat(item.price) * item.quantity).toFixed(2)} €
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t-2 border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-800">Total:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {getTotalEurPrice()} €
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Contact/Legal Banner */}
      <BottomBanner language="fr" />
    </div>
  );
}