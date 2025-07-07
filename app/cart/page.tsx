// app/cart/page.tsx
'use client';

import { useCart } from '../context/CartContext';
import Link from 'next/link';

export default function CartPage() {
  const { cart, table, removeItem, updateQuantity, clearCart, orderNow, getTotalPrice } = useCart();

  console.log('Cart length:', cart.length); // Debug log to check cart items
  console.log('Table: \'', table, ' \''); // Debug log to check cart items details
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Your Cart is Empty!</h1>
        <p className="text-lg text-gray-600 mb-6">Looks like you haven't added any items yet.</p>
        <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full shadow-lg transition duration-300 ease-in-out">
          Go to Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Your Order in preparation</h1>
        <Link href="/" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out">
          Back to Menu
        </Link>
      </header>

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Display Table Number prominently at the top of the cart */}
        {table && (
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            Order for Table: <span className="text-blue-600">{table}</span>
          </h2>
        )}

        {/* Directly map over cart items, as they all belong to the same table */}
        <div className="mb-8 p-4 border rounded-md bg-gray-50">
          {cart.map((item) => (
            // Use a unique key for each item, combining id and stringified options for uniqueness
            <div key={`${item.id}-${JSON.stringify(item.options)}`} className="flex items-center justify-between border-b last:border-b-0 py-4">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">{item.name}</h2>
                {Object.keys(item.options).length > 0 && (
                  <p className="text-gray-500 text-sm">
                    Options: {Object.entries(item.options).map(([key, value]) => `${key}: ${value}`).join(', ')}
                  </p>
                )}
                <p className="text-gray-600 text-sm">${parseFloat(item.price).toFixed(2)} each</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1, item.options)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded-full"
                >
                  -
                </button>
                <span className="text-lg font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1, item.options)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded-full"
                >
                  +
                </button>
                <button
                  onClick={() => removeItem(item.id)}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md transition duration-300 ease-in-out"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">Total ({cart.length} items):</h3>
          <span className="text-2xl font-extrabold text-green-700">${getTotalPrice()}</span>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={clearCart}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out"
          >
            Clear Cart
          </button>
          <button
            onClick={orderNow}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-lg transition duration-300 ease-in-out"
          >
            Order Now
          </button>
        </div>
      </div>
    </div>
  );
}