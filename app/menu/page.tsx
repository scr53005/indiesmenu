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
  const { cart, addItem, removeItem, updateQuantity, clearCart, orderNow, callWaiter, getTotalItems, getTotalPrice, setTable } = useCart();
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
  const [cartHeight, setCartHeight] = useState(0);
  const [menuSelectorHeight, setMenuSelectorHeight] = useState(0);

  // State for wallet notification
  const [showWalletNotification, setShowWalletNotification] = useState(false);
  const [walletCredentials, setWalletCredentials] = useState<{username: string, activeKey: string} | null>(null);

  // State for header carousel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const carouselImages = [
    '/images/indiesInt1600x878.jpg',
    '/images/indiesExt1600x878.jpg'
  ];

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
    }
  }, []);

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
    let cartItemPrice: string = '0.00'; // = item.price; // Start with base price for dishes

    const itemOptions = options || {}; // Use the options passed from MenuItem

    if (item.type === 'dish') {
      const dishItem = item as FormattedDish;
      cartItemPrice = dishItem.price; // Use the base price for dishes
      // If it's a dish and has a selected cuisson, append it to ID and name
      if (itemOptions.cuisson) {
        cartItemId = `${item.id}-${itemOptions.cuisson.toLowerCase().replace(/\s/g, '-')}`;
        cartItemName = item.name; // `${item.name} (${itemOptions.cuisson})`;
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

      // Update price based on selected size
      if (itemOptions.size) {
        const selectedSizeOption = drinkItem.availableSizes.find(s => s.size === itemOptions.size);
        if (selectedSizeOption) {
          cartItemPrice = selectedSizeOption.price;
        }
      } else {
        cartItemPrice = drinkItem.availableSizes[0]?.price || '0.00'; // Default to first size price if no size selected
      }
    }

    addItem({
      id: cartItemId,
      name: cartItemName,
      price: cartItemPrice, // Use the potentially updated price for drinks
      quantity: 1,
      options: itemOptions, // Pass the options as received
      conversion_rate: menu?.conversion_rate, // Add conversion_rate from menu
    });
  }, [addItem, menu]); // addItem is from context, selectedSizes and selectedCuisson are no longer direct dependencies here as options are passed

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

    const blurHandler = () => {
      protocolHandlerWorked = true;
      console.log('Page lost focus - protocol handler likely worked');
    };

    window.addEventListener('blur', blurHandler);

    // Try to open the hive:// URL
    try {
      window.location.href = hiveOpUrl;
    } catch (error) {
      console.log('Failed to open hive:// URL:', error);
      // Safari might throw error - treat as protocol handler not working
      protocolHandlerWorked = false;
    }

    // After 1.5 seconds, check if the protocol handler worked
    setTimeout(() => {
      window.removeEventListener('blur', blurHandler);

      // Show banner if protocol handler didn't work AND user doesn't have wallet credentials
      if (!protocolHandlerWorked && !walletCredentials) {
        console.log('Protocol handler did not work - showing wallet notification');
        setShowWalletNotification(true);
      }
    }, 1500);
  }, [cart.length, orderNow, walletCredentials]);

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

  if (loading) {
    return <div className="loading-spinner">Loading menu...</div>;
  }

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  const totalFixedHeaderHeight = cartHeight + menuSelectorHeight;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">

      {/* TEST BANNER - Always visible */}
      {/* TEMPORARILY COMMENTED OUT FOR PRODUCTION TESTING
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="font-semibold text-sm md:text-base">
              TEST BANNER - If you see this, banners work!
            </p>
            <p className="text-xs opacity-90">
              showWalletNotification: {showWalletNotification ? 'TRUE' : 'FALSE'} |
              walletCredentials: {walletCredentials ? 'EXISTS' : 'NULL'} |
              loading: {loading ? 'TRUE' : 'FALSE'}
            </p>
          </div>
          <div className="flex justify-center gap-2 mt-2">
            <button
              onClick={() => {
                localStorage.removeItem('innopay_notification_dismissed');
                localStorage.removeItem('innopay_wallet_credentials');
                setWalletCredentials(null);
                setShowWalletNotification(true);
                console.log('Forced blue banner to show');
              }}
              className="bg-white text-red-600 px-3 py-1 rounded text-xs font-semibold hover:bg-red-50"
            >
              Force Show Blue Banner
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="bg-white text-red-600 px-3 py-1 rounded text-xs font-semibold hover:bg-red-50"
            >
              Clear All & Reload
            </button>
          </div>
        </div>
      </div>
      */}

      {/* Wallet Notification Banner */}
      {showWalletNotification && !walletCredentials && (
        <div className="fixed top-0 left-0 right-0 z-[9998] bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-semibold text-sm md:text-base">
                💳 Pour commander, créez votre portefeuille Innopay
              </p>
              <p className="text-xs md:text-sm opacity-90 mt-1">
                Gratuit et instantané - Pas besoin d'installer d'application
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== 'indies.innopay.lu'
                  ? `http://${window.location.hostname}:3000/user`
                  : window.location.hostname === 'localhost'
                  ? 'http://localhost:3000/user'
                  : 'https://wallet.innopay.lu/user'}
                target="_blank"
                rel="noopener"
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                Créer un compte
              </a>
              <button
                onClick={() => {
                  setShowWalletNotification(false);
                  console.log('Notification dismissed temporarily - will show again on next order attempt');
                }}
                className="text-white hover:text-blue-200 transition-colors p-2"
                aria-label="Fermer"
              >
                ✕
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
          <div className="cart-header">Votre Ordre ({getTotalItems()} items)</div>
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
            <span className="cart-total-text">Total: {getTotalPrice()} HBD</span>
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
          <section className="relative h-64 flex items-center justify-center overflow-hidden bg-gray-200">
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