// indiesmenu-front/app/menu/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';

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

export default function MenuPage() {
  const { cart, addItem, removeItem, updateQuantity, clearCart, orderNow, getTotalItems, getTotalPrice, setTable } = useCart();
  const [menu, setMenu] = useState<MenuData>({ categories: [], dishes: [], drinks: [] });
  const [groupedDishes, setGroupedDishes] = useState<GroupedDishes>({});
  const [groupedDrinks, setGroupedDrinks] = useState<GroupedDrinks>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSizes, setSelectedSizes] = useState<{ [key: string]: string }>({}); // Track selected drink sizes
  const searchParams = useSearchParams();
  const table = searchParams.get('table') || 'Unknown';
  const recipient = process.env.HIVE_ACCOUNT || 'indies.cafe';

  useEffect(() => {

    // Set the table number in the cart context
    setTable(table);
    console.log('Table in cart set to: ', table);

    async function fetchMenu() {
      try {
        setLoading(true);
        const response = await fetch('http://192.168.178.55:3000/api/menu', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('API Response:', data);

        const grouped: GroupedDishes = {};
        data.dishes.forEach((dish: Dish) => {
          const dishCategories: string[] = data.categories
            .filter((c: Category) => c.type === 'dish' && dish.categoryIds.includes(c.category_id))
            .map((c: Category) => c.name);
          if (dishCategories.length === 0) {
            grouped['Uncategorized'] = grouped['Uncategorized'] || [];
            grouped['Uncategorized'].push(dish);
          } else {
            dishCategories.forEach((category) => {
              grouped[category] = grouped[category] || [];
              grouped[category].push(dish);
            });
          }
        });

        const groupedDrinks: GroupedDrinks = {};
        data.drinks.forEach((drink: Drink) => { 
          const drinkCategories: string[] = data.categories
            .filter((c: Category) => c.type === 'drink' && drink.categoryIds.includes(c.category_id))
            .map((c: Category) => c.name.toUpperCase());
          if (drinkCategories.length === 0) {
            groupedDrinks['Uncategorized'] = groupedDrinks['Uncategorized'] || [];
            groupedDrinks['Uncategorized'].push(drink);
          } else {
            drinkCategories.forEach((category) => {
              groupedDrinks[category] = groupedDrinks[category] || [];
              groupedDrinks[category].push(drink);
            });
          }
        });
        console.log('Grouped Dishes:', grouped);
        console.log('Grouped Drinks:', groupedDrinks);

        setMenu(data);
        setGroupedDishes(grouped);
        setGroupedDrinks(groupedDrinks);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch menu');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMenu();
  }, []);

  if (loading) return <div className="p-4 text-center text-xl">Loading...</div>;
  if (error) return <div className="p-4 text-center text-red-500 text-xl">Error: {error}</div>;

  const handleCallWaiter = () => {
    try {
      const hiveUrl = orderNow(); // Pass table explicitly or rely on cart.table
      const fallbackUrl = 'https://play.google.com/store/apps/details?id=com.hivekeychain'; // Android
      const iosFallbackUrl = 'https://apps.apple.com/us/app/hive-keychain/id1550923076'; // iOS

      // Attempt to open Hive Keychain
      window.location.href = hiveUrl;

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
    } catch (error) {
      console.error('Error in handleCallWaiter:', error);
      alert('Failed to process the request. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <section className="bg-cover bg-center h-64 flex items-center justify-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1414235077428-338989a2e8c0)' }}>
        <div className="text-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold">Welcome to Indies Cafe</h1>
          <p className="mt-2 text-lg">Table {table} - Explore Our Delicious Menu</p>
        </div>
      </section>
    <section className="max-w-6xl mx-auto p-6">
        <h2 className="text-3xl font-semibold text-center mb-8">Our Menu</h2>
        <div className="text-center mb-4">
          <p>Cart Items: {getTotalItems()}</p>
          <p>Total Price: €{getTotalPrice()}</p>
          <button
              onClick={handleCallWaiter}
              className="mt-2 bg-green-600 text-white px-4 py-2 rounded"
            >
              Call a Waiter
          </button>
          <ul>
            {cart.map((item) => (
              <li key={item.id}>
                {item.name} - {item.quantity} x €{item.price}
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="ml-2 bg-green-500 text-white px-2 py-1 rounded"
                >
                  +
                </button>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="ml-2 bg-red-500 text-white px-2 py-1 rounded"
                >
                  -
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="ml-2 bg-gray-500 text-white px-2 py-1 rounded"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {cart.length > 0 && (
            <button
              onClick={() => clearCart()}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded"
            >
              Clear Cart
            </button>
          )}
          {cart.length > 0 && (
             <button
              onClick={() => orderNow()}
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded"
            >
              Order Now
            </button> 
          )}
        </div>

        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Dishes</h3>
          {Object.keys(groupedDishes).length === 0 ? (
            <p className="text-center text-gray-600">No dishes available.</p>
          ) : (
            Object.entries(groupedDishes).map(([category, dishes]) => (
              <div key={category} className="mb-8">
                <h4 className="text-xl font-semibold text-gray-700 mb-4">{category}</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dishes.map((dish) => (
                    <div
                      key={dish.id}
                      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition"
                    >
                      {dish.image && (
                        <img
                          src={`http://localhost:3000${dish.image}`}
                          alt={dish.name}
                          className="w-full h-40 object-cover rounded-t-lg"
                        />
                      )}
                      <h5 className="text-lg font-semibold text-gray-800">{dish.name}</h5>
                      <p className="text-lg font-bold text-gray-900 mt-2">€{dish.price}</p>
                      <button
                        onClick={() => {
                          console.log('Adding dish:', dish);
                          addItem({
                            id: dish.id,
                            name: dish.name,
                            price: dish.price,
                            quantity: 1,
                            options: {},
                          });
                        }}
                        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Drinks</h3>
          {Object.keys(groupedDrinks).length === 0 ? (
            <p className="text-center text-gray-600">No drinks available.</p>
          ) : (
            Object.entries(groupedDrinks).map(([category, drinks]) => (
              <div key={category} className="mb-8">
                <h4 className="text-xl font-semibold text-gray-700 mb-4">{category}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {drinks.map((drink) => (
                    <div
                      key={drink.id}
                      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition"
                    >
                      {drink.image && (
                        <img
                          src={`http://localhost:3000${drink.image}`}
                          alt={drink.name}
                          className="w-full h-40 object-cover rounded-t-lg"
                        />
                      )}
                      <h5 className="text-lg font-semibold text-gray-800">{drink.name}</h5>
                      <div className="mt-2">
                        <select
                          value={selectedSizes[drink.id] || drink.availableSizes[0]?.size || 'Default'}
                          onChange={(e) => setSelectedSizes({ ...selectedSizes, [drink.id]: e.target.value })}
                          className="w-full p-2 border rounded"
                        >
                          {drink.availableSizes.map((size) => (
                            <option key={size.size} value={size.size}>
                              {size.size}: €{size.price}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          const selectedSize = selectedSizes[drink.id] || drink.availableSizes[0]?.size || 'Default';
                          const selectedPrice = drink.availableSizes.find((s) => s.size === selectedSize)?.price || '0.00';
                          console.log('Adding drink:', drink, selectedSize);
                          addItem({
                            id: `${drink.id}-${selectedSize}`,
                            name: `${drink.name} (${selectedSize})`,
                            price: selectedPrice,
                            quantity: 1,
                            options: { size: selectedSize },
                          });
                        }}
                        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
                      >
                        Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
            </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}