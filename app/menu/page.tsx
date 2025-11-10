// indiesmenu-front/app/menu/page.tsx
'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '@/app/context/CartContext';
import MenuItem from '@/components/MenuItem'; // Import the new MenuItem component
import CartItemDisplay from '@/components/CartItemDisplay'; // Import the new CartItemDisplay component
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
  const { cart, addItem, removeItem, updateQuantity, clearCart, orderNow, callWaiter, getTotalItems, getTotalPrice, getTotalEurPrice, getTotalEurPriceNoDiscount, getDiscountAmount, getMemo, setTable } = useCart();
  // Use the imported MenuData type for the menu state
  const [menu, setMenu] = useState<MenuData>({ categories: [], dishes: [], drinks: [], cuissons: [], ingredients: [], conversion_rate: 1.0000 }); // Initialize with empty data
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSizes, setSelectedSizes] = useState<{ [key: string]: string }>({}); // Track selected drink sizes
  const [selectedCuisson, setSelectedCuisson] = useState<{ [key: string]: string }>({}); // Track selected cuisson for dishes
  const [selectedIngredients, setSelectedIngredients] = useState<{ [key: string]: string }>({}); // Track selected ingredients for drinks
  const searchParams = useSearchParams();
  const urlTable = searchParams.get('table') || '218';
  const validatedTable = parseInt(urlTable, 10);
  const table = isNaN(validatedTable) ? '218' : validatedTable.toString(); // Default to '218' if parsing fails
  const recipient = process.env.NEXT_PUBLIC_HIVE_ACCOUNT || 'indies.cafe';

  // State for menu navigation
  const [activeMenuSection, setActiveMenuSection] = useState<'dishes' | 'drinks' | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());

  // Grouped menu data for easier rendering - ensure types are correct
  const [groupedDishes, setGroupedDishes] = useState<GroupedCategory<FormattedDish>[]>([]);
  const [groupedDrinks, setGroupedDrinks] = useState<GroupedCategory<FormattedDrink>[]>([]);

  // Refs for dynamic height calculation
  const cartRef = useRef<HTMLDivElement>(null);
  const menuSelectorRef = useRef<HTMLDivElement>(null);
  const welcomeCarouselRef = useRef<HTMLDivElement>(null);
  const [cartHeight, setCartHeight] = useState(0);
  const [menuSelectorHeight, setMenuSelectorHeight] = useState(0);
  const [welcomeCarouselHeight, setWelcomeCarouselHeight] = useState(0);

  // State for wallet notification
  const [showWalletNotification, setShowWalletNotification] = useState(false);
  const [isSafariBanner, setIsSafariBanner] = useState(false); // Track if banner is shown for Safari
  const [walletCredentials, setWalletCredentials] = useState<{username: string, activeKey: string} | null>(null);
  const [bannerPosition, setBannerPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // State for payment success notification
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [blockchainComplete, setBlockchainComplete] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // State for guest checkout warning modal
  const [showGuestWarningModal, setShowGuestWarningModal] = useState(false);

  // State for header carousel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselImages = [
    '/images/indiesInt1600x878.jpg',
    '/images/indiesExt1600x878.jpg'
  ];

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
      setCurrentSessionId(sessionId);
      clearCart();
      // Remove query params from URL
      const newUrl = `${window.location.pathname}?table=${table}`;
      window.history.replaceState({}, '', newUrl);
    } else {
      console.log('[PAYMENT SUCCESS CHECK] No success payment detected');
    }
  }, [searchParams, clearCart, table]);

  // Poll for blockchain transaction completion
  useEffect(() => {
    if (!showPaymentSuccess || !currentSessionId || blockchainComplete) {
      return; // Don't poll if banner isn't showing or blockchain is already complete
    }

    let pollCount = 0;
    const maxPolls = 60; // Poll for up to 60 seconds (60 polls × 1 second)

    const pollInterval = setInterval(async () => {
      pollCount++;
      console.log(`[BLOCKCHAIN POLL] Attempt ${pollCount}/${maxPolls} for session ${currentSessionId}`);

      try {
        // Determine Innopay URL
        let innopayUrl: string;
        if (window.location.hostname === 'localhost') {
          innopayUrl = 'http://localhost:3000';
        } else if (window.location.hostname === 'indies.innopay.lu' || window.location.hostname.includes('vercel.app')) {
          innopayUrl = 'https://wallet.innopay.lu';
        } else {
          innopayUrl = `http://${window.location.hostname}:3000`;
        }

        const response = await fetch(`${innopayUrl}/api/checkout/status?session_id=${currentSessionId}`);

        if (!response.ok) {
          console.error('[BLOCKCHAIN POLL] API error:', response.status);
          return;
        }

        const data = await response.json();
        console.log('[BLOCKCHAIN POLL] Status:', data);

        if (data.isComplete) {
          console.log('[BLOCKCHAIN POLL] ✓ Blockchain transactions complete!');
          setBlockchainComplete(true);
          clearInterval(pollInterval);

          // Auto-hide banner after 10 seconds once blockchain is complete
          setTimeout(() => {
            console.log('[PAYMENT SUCCESS] Auto-hiding banner after blockchain completion');
            setShowPaymentSuccess(false);
          }, 15000);
        }

      } catch (error) {
        console.error('[BLOCKCHAIN POLL] Error:', error);
      }

      // Stop polling after max attempts
      if (pollCount >= maxPolls) {
        console.warn('[BLOCKCHAIN POLL] Timeout - stopped polling after 60 attempts');
        clearInterval(pollInterval);
        // Still show success, but with warning
        setBlockchainComplete(true); // Show final state even if we timeout
      }
    }, 1500); // Poll every 1.5 second

    return () => clearInterval(pollInterval);
  }, [showPaymentSuccess, currentSessionId, blockchainComplete]);

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

        // Prefetch all menu images for offline caching
        const prefetchImages = () => {
          const imageUrls: string[] = [
            ...data.dishes.map(d => d.image),
            ...data.drinks.map(d => d.image)
          ].filter((url): url is string => url !== null && url !== undefined && url !== '');

          console.log(`Prefetching ${imageUrls.length} menu images for offline access...`);

          imageUrls.forEach((url, index) => {
            const img = new window.Image();
            img.src = url;
            img.onload = () => {
              if (index === imageUrls.length - 1) {
                console.log('✓ All menu images prefetched and cached');
              }
            };
            img.onerror = () => {
              console.warn(`Failed to prefetch image: ${url}`);
            };
          });
        };

        // Start prefetching after a short delay to prioritize initial page load
        setTimeout(prefetchImages, 1000);
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
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isSafari || isIOS) {
        console.log('Safari/iOS detected - showing wallet notification proactively');
        setShowWalletNotification(true);
        setIsSafariBanner(true);
      }
    }
  }, []);

  // Drag handlers for wallet banner
  const handleBannerMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - bannerPosition.x,
      y: e.clientY - bannerPosition.y
    });
  };

  const handleBannerTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragOffset({
      x: touch.clientX - bannerPosition.x,
      y: touch.clientY - bannerPosition.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setBannerPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        const touch = e.touches[0];
        setBannerPosition({
          x: touch.clientX - dragOffset.x,
          y: touch.clientY - dragOffset.y
        });
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragOffset]);

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

      if (event.data.type === 'INNOPAY_WALLET_CREATED') {
        const { username, activeKey } = event.data;
        console.log('Processing INNOPAY_WALLET_CREATED message for:', username);

        // Store credentials
        const credentials = { username, activeKey };
        setWalletCredentials(credentials);
        localStorage.setItem('innopay_wallet_credentials', JSON.stringify(credentials));

        // Hide wallet notification
        setShowWalletNotification(false);

        console.log(`Wallet credentials stored for ${username}`);
        alert(`Portefeuille créé! Bienvenue ${username}. Vous pouvez maintenant commander directement.`);
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

  const fallBackNoKeychain = () => {
    const fallbackUrl = 'https://play.google.com/store/apps/details?id=com.mobilekeychain'; // Android
    const iosFallbackUrl = 'https://apps.apple.com/us/app/hive-keychain/id1550923076'; // iOS
    setTimeout(() => {
      if (document.hasFocus()) {
        if (navigator.userAgent.includes('Android')) {
          window.location.href = fallbackUrl;
        } else if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
          window.location.href = iosFallbackUrl;
        } else {
          alert(navigator.userAgent + ' - Please install the Hive Keychain app / extension to proceed.');
        }
      }
    }, 1000);
  };

  const handleCallWaiter = () => {
    try {
      const hiveUrl = callWaiter();
      fallBackNoKeychain();
      window.location.href = hiveUrl;
    } catch (error) {
      console.error('Error in handleCallWaiter:', error);
      alert('Failed to process the request. Please try again.');
    }
  };

  const handleOrder = useCallback(() => {
    if (cart.length === 0) {
      // No items in cart, show alert
      alert('Rien a commander !');
      return;
    }
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

  const proceedWithGuestCheckout = useCallback(async () => {
    try {
      // Use no-discount price + 5% processing fee
      const amountEuroNoDiscount = parseFloat(getTotalEurPriceNoDiscount());
      const amountEuroWithFee = amountEuroNoDiscount * 1.05;
      const customMemo = getMemo();

      console.log('Guest checkout:', { amountEuroWithFee, memo: customMemo });

      // Determine Innopay URL based on environment
      let innopayUrl: string;
      if (window.location.hostname === 'localhost') {
        innopayUrl = 'http://localhost:3000';
      } else if (window.location.hostname === 'indies.innopay.lu' || window.location.hostname.includes('vercel.app')) {
        innopayUrl = 'https://wallet.innopay.lu';
      } else {
        // Local network (e.g., 192.168.x.x)
        innopayUrl = `http://${window.location.hostname}:3000`;
      }

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

      // Redirect to Stripe checkout
      window.location.href = url;

      clearCart();

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
      {showWalletNotification && !walletCredentials && (
        <div
          className={`fixed z-[9998] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 shadow-lg ${bannerPosition.x !== 0 || bannerPosition.y !== 0 ? 'rounded-lg' : ''}`}
          style={{
            left: bannerPosition.x === 0 ? '0' : `${bannerPosition.x}px`,
            top: bannerPosition.y === 0
              ? (cart.length === 0 && welcomeCarouselHeight > 0
                  ? `${totalFixedHeaderHeight + (welcomeCarouselHeight / 2) - 50}px` // Position at half carousel height (adjusted for banner height)
                  : `${totalFixedHeaderHeight}px`) // Default: below menu selector
              : `${bannerPosition.y}px`,
            right: bannerPosition.x === 0 ? '0' : 'auto',
            cursor: isDragging ? 'grabbing' : 'grab',
            touchAction: 'none',
            userSelect: 'none'
          }}
          onMouseDown={handleBannerMouseDown}
          onTouchStart={handleBannerTouchStart}
        >
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            {/* Drag handle indicator */}
            <div className="text-white opacity-50 text-xs flex-shrink-0">
              ⋮⋮
            </div>

            {/* Left zone: Text - takes most space */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm md:text-base">
                {isSafariBanner
                  ? "💳 Si vous n'avez pas de portefeuille compatible Innopay, nous conseillons de créer un compte avant de commander!"
                  : "💳 Pour commander, créez votre portefeuille Innopay"
                }
              </p>
              {!isSafariBanner && (
                <p className="text-xs md:text-sm opacity-90 mt-1">
                  Gratuit et instantané - Pas besoin d'installer d'application
                </p>
              )}
            </div>

            {/* Center zone: Buttons stacked */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <a
                href={typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== 'indies.innopay.lu'
                  ? `http://${window.location.hostname}:3000/user`
                  : window.location.hostname === 'localhost'
                  ? 'http://localhost:3000/user'
                  : 'https://wallet.innopay.lu/user'}
                target="_blank"
                rel="noopener"
                className="bg-white text-blue-600 px-4 py-3 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors whitespace-nowrap"
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                Créer un compte
              </a>
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
        </div>
      )}

      {/* Payment Success Banner - Two States */}
      {showPaymentSuccess && !blockchainComplete && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-yellow-500 to-yellow-600 text-blue-700 px-4 py-4 shadow-lg">
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

      {showPaymentSuccess && blockchainComplete && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-4 shadow-lg">
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
              onClick={() => setShowPaymentSuccess(false)}
              className="bg-white text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors ml-4"
            >
              OK
            </button>
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
        <div className="fixed top-[80px] left-0 right-0 z-[9998] bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 shadow-lg">
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
          <div className="cart-items-list">
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
            <button onClick={handleOrder} className="order-now-button">
              Commandez
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
    </div>
  );
}