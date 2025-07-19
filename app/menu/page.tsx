// indiesmenu-front/app/menu/page.tsx
'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';
import MenuItem from '@/components/MenuItem'; // Import the new MenuItem component
import CartItemDisplay from '@/components/CartItemDisplay'; // Import the new CartItemDisplay component
// import { Prisma} from '@prisma/client';
import '@/app/globals.css'; // Import global styles

// Import the enriched types directly from your menu data file
import { MenuData, FormattedDish, FormattedDrink, FormattedCuisson, FormattedIngredient } from '@/lib/data/menu';

// New Interface for Grouped Items (more flexible)
interface GroupedCategory<T> {
  name: string;
  items: T[];
}

// Use the imported FormattedDish and FormattedDrink for GroupedMenu
interface GroupedMenu {
  [categoryId: number]: GroupedCategory<FormattedDish | FormattedDrink>;
}

export default function MenuPage() {
  const { cart, addItem, removeItem, updateQuantity, clearCart, orderNow, callWaiter, getTotalItems, getTotalPrice, setTable } = useCart();
  // Use the imported MenuData type for the menu state
  const [menu, setMenu] = useState<MenuData>({ categories: [], dishes: [], drinks: [], cuissons: [], ingredients: [], conversion_rate: 1.0000 }); // Initialize with empty data
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSizes, setSelectedSizes] = useState<{ [key: string]: string }>({}); // Track selected drink sizes
  const [selectedCuisson, setSelectedCuisson] = useState<{ [key: string]: string }>({}); // Track selected cuisson for dishes
  const searchParams = useSearchParams();
  const urlTable = searchParams.get('table') || '218';
  const validatedTable = parseInt(urlTable, 10);
  const table = isNaN(validatedTable) ? '218' : validatedTable.toString(); // Default to '218' if parsing fails
  const recipient = process.env.NEXT_PUBLIC_HIVE_ACCOUNT || 'indies.cafe';

  // State for menu navigation
  const [activeMenuSection, setActiveMenuSection] = useState<'dishes' | 'drinks' | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());

  // Grouped menu data for easier rendering - ensure types are correct
  const [groupedDishes, setGroupedDishes] = useState<GroupedMenu>({});
  const [groupedDrinks, setGroupedDrinks] = useState<GroupedMenu>({});

  // Refs for dynamic height calculation
  const cartRef = useRef<HTMLDivElement>(null);
  const menuSelectorRef = useRef<HTMLDivElement>(null);
  const [cartHeight, setCartHeight] = useState(0);
  const [menuSelectorHeight, setMenuSelectorHeight] = useState(0);

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
        setActiveMenuSection('drinks'); // Default to showing drinks after loading
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
      const dishesByCat: GroupedMenu = {};
      const drinksByCat: GroupedMenu = {};

      menu.categories.forEach(cat => {
        dishesByCat[cat.category_id] = { name: cat.name, items: [] };
        drinksByCat[cat.category_id] = { name: cat.name, items: [] };
      });

      menu.dishes.forEach(dish => {
        dish.categoryIds.forEach(catId => {
          if (dishesByCat[catId]) {
            dishesByCat[catId].items.push(dish); // dish is now FormattedDish
          }
        });
      });

      menu.drinks.forEach(drink => {
        drink.categoryIds.forEach(catId => {
          if (drinksByCat[catId]) {
            drinksByCat[catId].items.push(drink); // drink is now FormattedDrink
          }
        });
      });

      // Filter out empty categories
      for (const id in dishesByCat) {
        if (dishesByCat[id].items.length === 0) {
          delete dishesByCat[id];
        }
      }
      for (const id in drinksByCat) {
        if (drinksByCat[id].items.length === 0) {
          delete drinksByCat[id];
        }
      }

      setGroupedDishes(dishesByCat);
      setGroupedDrinks(drinksByCat);
    }
  }, [menu]);

  // Effect to calculate dynamic heights for fixed elements
  useEffect(() => {
    const calculateHeights = () => {
      setTimeout(() => {
        if (cartRef.current) {
          setCartHeight(cart.length > 0 ? cartRef.current.offsetHeight : 0);
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
      // If it's a drink and has a selected size, append it to ID and name, and update price
      if (itemOptions.size) {
        cartItemId = `${item.id}-${itemOptions.size.toLowerCase().replace(/\s/g, '-')}`;
        // cartItemName = `${item.name} (${itemOptions.size})`;
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
    window.location.href = hiveOpUrl;
  }, [cart.length, orderNow]);

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
              Serveur !
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
          <section className="bg-cover bg-center h-64 flex items-center justify-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1414235077428-338989a2e8c0)' }}>
            <div className="text-center text-white">
              <h1 className="text-4xl md:text-5xl font-bold">Bienvenue a Indie's Cafe</h1>
              <p className="mt-2 text-lg">Table {table} - Explorez notre menu</p>
            </div>
          </section>
        )}

        {activeMenuSection === 'dishes' && (
          <div className="menu-section">
            {Object.entries(groupedDishes).map(([id, category]) => (
              <div key={id} className="category-folder-container">
                <h3 onClick={() => toggleCategory(parseInt(id))} className="category-folder-header">
                  {category.name}
                  <span className="toggle-icon">
                    {openCategories.has(parseInt(id)) ? '▲' : '▼'}
                  </span>
                </h3>
                {openCategories.has(parseInt(id)) && (
                  <div className="category-items-grid">
                    {category.items.map((item: FormattedDish) => ( // Cast to FormattedDish
                      <MenuItem
                        key={item.id}
                        item={item}
                        selectedCuisson={selectedCuisson} // Pass selectedCuisson
                        handleCuissonChange={handleCuissonChange}
                        handleAddItem={handleAddItem}
                        selectedSizes={{}} // Pass empty object as it's not applicable for dishes
                        handleSizeChange={() => {}} // Pass no-op as it's not applicable for dishes
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
            {Object.entries(groupedDrinks).map(([id, category]) => (
              <div key={id} className="category-folder-container">
                <h3 onClick={() => toggleCategory(parseInt(id))} className="category-folder-header">
                  {category.name}
                  <span className="toggle-icon">
                    {openCategories.has(parseInt(id)) ? '▲' : '▼'}
                  </span>
                </h3>
                {openCategories.has(parseInt(id)) && (
                  <div className="category-items-grid">
                    {category.items.map((item: FormattedDrink) => ( // Cast to FormattedDrink
                      <MenuItem
                        key={item.id}
                        item={item}
                        selectedSizes={selectedSizes}
                        handleSizeChange={handleSizeChange}
                        handleAddItem={handleAddItem}
                        selectedCuisson={{}} // Pass empty object as it's not applicable for drinks
                        handleCuissonChange={() => {}} // Pass no-op as it's not applicable for drinks
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