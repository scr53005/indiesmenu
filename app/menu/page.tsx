// indiesmenu-front/app/menu/page.tsx
'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/app/context/CartContext';

interface Dish {
  id: string;
  name: string;
  type: 'dish';
  price: string;
  categoryIds: number[];
  image?: string;
}

interface Drink {
  id: string;
  name: string;
  type: 'drink';
  availableSizes: { size: string; price: string }[];
  categoryIds: number[];
  image?: string;
}

interface Category {
  category_id: number;
  name: string;
  type?: string;
  categories_dishes: { dishes: { dish_id: number } }[];
  categories_drinks: { drinks: { drink_id: number } }[];
}

interface GroupedDishes {
  [category: string]: Dish[];
}

interface GroupedDrinks {
  [category: string]: Drink[];
}

interface MenuData {
  categories: Category[];
  dishes: Dish[];
  drinks: Drink[];
}

// New Interface for Grouped Items (more flexible)
interface GroupedCategory<T> {
  name: string;
  items: T[];
}

interface GroupedMenu {
  [categoryId: number]: GroupedCategory<Dish | Drink>;
}

export default function MenuPage() {
  const { cart, addItem, removeItem, updateQuantity, clearCart, orderNow, callWaiter, getTotalItems, getTotalPrice, setTable } = useCart();
  const [menu, setMenu] = useState<MenuData>({ categories: [], dishes: [], drinks: [] });
  //const [groupedDishes, setGroupedDishes] = useState<GroupedDishes>({});
  //const [groupedDrinks, setGroupedDrinks] = useState<GroupedDrinks>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSizes, setSelectedSizes] = useState<{ [key: string]: string }>({}); // Track selected drink sizes
  const searchParams = useSearchParams();
  const urlTable = searchParams.get('table') || '218';
  const validatedTable = parseInt(urlTable, 10);
  const table = isNaN(validatedTable) ? '218' : validatedTable.toString(); // Default to '218' if parsing fails
  const recipient = process.env.NEXT_PUBLIC_HIVE_ACCOUNT || 'indies.cafe';

// New state for menu navigation
  const [activeMenuSection, setActiveMenuSection] = useState<'dishes' | 'drinks' | null>(null); // 'dishes', 'drinks', or null (initial)
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set()); // Stores IDs of open categories

  // Grouped menu data for easier rendering
  const [groupedDishes, setGroupedDishes] = useState<GroupedMenu>({});
  const [groupedDrinks, setGroupedDrinks] = useState<GroupedMenu>({});

  // Refs for dynamic height calculation
  const cartRef = useRef<HTMLDivElement>(null);
  const menuSelectorRef = useRef<HTMLDivElement>(null);
  const [cartHeight, setCartHeight] = useState(0); // New state for cart height
  const [menuSelectorHeight, setMenuSelectorHeight] = useState(0); // New state for menu selector height

  useEffect(() => {
    // Set the table number in the cart context
    setTable(table);
    console.log('Table in cart set to: ', table);

    const fetchMenu = async () => {
      try {
        setLoading(true);
        setError(null); // Reset error state before fetching
        console.log('Fetching menu for table:', table);
      } catch (e: any) {
        setError(e.message);  
      }

      try {
        const response = await fetch('/api/menu'); // Fetch from your Next.js API route
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: MenuData = await response.json();
        setMenu(data);
        setLoading(false);
        setActiveMenuSection('dishes'); // Default to showing dishes after loading
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
            dishesByCat[catId].items.push(dish);
          }
        });
      });

      menu.drinks.forEach(drink => {
        drink.categoryIds.forEach(catId => {
          if (drinksByCat[catId]) {
            drinksByCat[catId].items.push(drink);
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

  // Effect to calculate dynamic padding for main content
  useEffect(() => {
    const calculateHeights = () => {
      if (cartRef.current) {
        setCartHeight(cart.length > 0 ? cartRef.current.offsetHeight : 0); // Only set height if cart is visible
      }
      if (menuSelectorRef.current) {
        setMenuSelectorHeight(menuSelectorRef.current.offsetHeight);
      }
    };

    calculateHeights(); // Calculate on mount

    window.addEventListener('resize', calculateHeights);

    // Observe cart content changes to recalculate cart height
    const cartObserver = new MutationObserver(() => setTimeout(calculateHeights, 50));
    if (cartRef.current) {
      cartObserver.observe(cartRef.current, { childList: true, subtree: true, attributes: true });
    }

    return () => {
      window.removeEventListener('resize', calculateHeights);
      if (cartRef.current) { // Disconnect observer only if ref exists
        cartObserver.disconnect();
      }
    };
  }, [cart.length, cart]); // Dependency on cart.length for cart visibility, and cart for content changes

  const handleSizeChange = (drinkId: string, size: string) => {
    setSelectedSizes(prev => ({ ...prev, [drinkId]: size }));
  };

  const handleAddItem = (item: Dish | Drink) => {
    if (item.type === 'dish') {
      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        options: {},
      });
    } else {
      const selectedSize = selectedSizes[item.id] || item.availableSizes[0]?.size || 'Default';
      const selectedPrice = item.availableSizes.find((s) => s.size === selectedSize)?.price || '0.00';
      addItem({
        id: `${item.id}-${selectedSize}`,
        name: `${item.name} (${selectedSize})`,
        price: selectedPrice,
        quantity: 1,
        options: { size: selectedSize },
      });
    }
  };

  const fallBackNoKeychain = () => {
      const fallbackUrl = 'https://play.google.com/store/apps/details?id=com.hivekeychain'; // Android
      const iosFallbackUrl = 'https://apps.apple.com/us/app/hive-keychain/id1550923076'; // iOS
      // Fallback if app is not installed
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
      const hiveUrl = callWaiter(); // Pass table explicitly or rely on cart.table
      fallBackNoKeychain();

      // Attempt to open Hive Keychain
      window.location.href = hiveUrl;
    } catch (error) {
      console.error('Error in handleCallWaiter:', error);
      alert('Failed to process the request. Please try again.');
    }
  };

  const handleOrder = () => {
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    const hiveOpUrl = orderNow();
    fallBackNoKeychain();
    window.location.href = hiveOpUrl;
  };

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

  const renderMenuItem = (item: Dish | Drink) => (
    <div key={item.id} className="menu-item">
      {item.image && (
        <img src={item.image} alt={item.name} className="menu-item-image" />
      )}
      <div className="menu-item-details">
        <h4 className="font-bold text-lg">{item.name}</h4>
        {item.type === 'dish' ? (
          <p>{item.price}€</p>
        ) : (
          <div>
            <select
              value={selectedSizes[item.id] || item.availableSizes[0]?.size || ''}
              onChange={(e) => handleSizeChange(item.id, e.target.value)}
              className="mt-2 p-1 border rounded"
            >
              {item.availableSizes.map((size) => (
                <option key={size.size} value={size.size}>
                  {size.size}: {size.price}€
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <button
        onClick={() => handleAddItem(item)}
        className="add-to-cart-button"
      >
        Ajoutez
      </button>
    </div>
  );

  const totalFixedHeaderHeight = cartHeight + menuSelectorHeight; // Calculate total height for padding

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
    
      {/* Fixed Cart Section */}
      {cart.length > 0 && (
        <div ref={cartRef} className="fixed-cart-container">
          <div className="cart-header">Your Cart ({getTotalItems()} items)</div>
          <div className="cart-items-list">
            {cart.map(item => (
              <div key={item.id} className="cart-item-grid">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-price">€{item.price}</div>
                <div className="cart-item-quantity">{item.quantity}</div>
                <button onClick={() => updateQuantity(item.id, item.quantity - 1) } className="cart-button minus-button">-</button>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1) } className="cart-button plus-button">+</button>
                <button onClick={() => removeItem(item.id)} className="cart-button drop-button">Drop</button>
              </div>
            ))}
          </div>
          <div className="cart-summary-row">
            <span className="cart-total-text">Total: {getTotalPrice()}€</span>
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
        style={{ top: `${cartHeight}px` }} // Dynamic top based on cart height
      >
        <button
          onClick={() => setActiveMenuSection('dishes')}
          className={`menu-section-button ${activeMenuSection === 'dishes' ? 'active' : ''}`}
        >
          Dishes
        </button>
        <button
          onClick={() => setActiveMenuSection('drinks')}
          className={`menu-section-button ${activeMenuSection === 'drinks' ? 'active' : ''}`}
        >
          Drinks
        </button>
      </div>

      {/* Main Scrollable Content Area */}
      <div className="main-content-area" style={{ paddingTop: `${totalFixedHeaderHeight}px` }}>

        {/* New Welcome Section - Appears only when cart is empty */}
        {cart.length === 0 && (
          <section className="bg-cover bg-center h-64 flex items-center justify-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1414235077428-338989a2e8c0)' }}>
            <div className="text-center text-white">
              <h1 className="text-4xl md:text-5xl font-bold">Bienvenue a Indies Cafe</h1>
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
                    {category.items.map((item: Dish) => renderMenuItem(item))}
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
                    {category.items.map((item: Drink) => renderMenuItem(item))}
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