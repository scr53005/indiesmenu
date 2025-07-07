// app/context/CartContext.tsx
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams

interface CartItem {
  id: string;
  name: string;
  price: string; // Decimal from Prisma
  quantity: number;
  options: { [key: string]: string }; // e.g., { size: 'large', cuisson: 'medium' }
};

// Define the shape of the cart context state and actions
interface CartContextType {
  cart: CartItem[];
  hiveOp?: string; // Optional, if you want to pass a hive operation
  table: string | ' 203 '; // Table ID, can be set later or passed as a prop
  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void; // Updated for unique item identification
  updateQuantity: (id: string, newQuantity: number, options?: { [key: string]: string }, table?: string) => void; // Updated
  clearCart: () => void;
  orderNow: () => string; // Added for orderNow functionality
  getTotalItems: () => number;
  getTotalPrice: () => string;
  setTable: (tableId: string) => void;
}

// Create the context with a default undefined value (it will be provided by CartProvider)
const CartContext = createContext<CartContextType>({
  cart: [],
  hiveOp: '', // Optional, can be set later
  table: ' 305 ', // Default table ID, can be set later or passed as a prop
  // Default implementations for actions
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  orderNow: () => 'default', // Default implementation for orderNow
  getTotalItems: () => 0,
  getTotalPrice: () => '0.00',
  setTable: () => {},
});

// CartProvider component to provide the cart context to its children
// This component will manage the cart state and provide functions to manipulate it
export function CartProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams(); // Initialize useSearchParams here
  const [cart, setCart] = useState<CartItem[]>([]);

 const [table, setTable] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const savedTable = localStorage.getItem('cartTable');
      // Prioritize URL parameter if available when initializing
      const urlTable = searchParams.get('table');
      if (urlTable) {
        return urlTable;
      }
      return savedTable || null;
    }
    return null;
  });

  // Optional: Load cart from localStorage on initial render
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('cart');
      // const storedHiveOp = localStorage.getItem('hiveOp');
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
      // Fallback to empty cart if there's an issue with localStorage
      setCart([]);
    }
  }, []);

  // Optional: Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));// Save cart to localStorage
      //localStorage.setItem('cartTable', table || 'no table value'); // Save table to localStorage
      //localStorage.setItem('hiveOp', ''); // Save hiveOp to localStorage if needed
      console.log('Cart saved to localStorage:', { cart, table }); // Debug log
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  }, [cart]);

  // Helper function for deep comparison of options (important for unique items)
  const areOptionsEqual = (opts1: { [key: string]: string }, opts2: { [key: string]: string }) => {
    const keys1 = Object.keys(opts1);
    const keys2 = Object.keys(opts2);
    if (keys1.length !== keys2.length) {
      return false;
    }
    for (const key of keys1) {
      if (opts1[key] !== opts2[key]) {
        return false;
      }
    }
    return true;
  };

  const addItem = (item: CartItem) => {
    console.log('Adding item to cart:', item); // Debug log
    // Default options and table if not provided
    const defaultOptions = item.options || {};
    // const defaultTable = item.table || '203'; // Or some other default table ID

    setCart((prev) => {
      const existingItem = prev.find((i) => i.id === item.id && i.options.size === item.options.size);
      if (existingItem) {
        return prev.map((i) =>
          i.id === item.id && i.options.size === item.options.size
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prev, item];
    });

  };

  // Update removeItem to consider options for uniqueness
  const removeItem = (id: string) => {
    console.log('Removing item:', id); // Debug log
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    console.log('Updating quantity:', id, newQuantity); // Debug log
    if (newQuantity <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== id));
    } else {
      setCart((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const clearCart = () => {
    console.log('Clearing cart'); // Debug log
    setCart([]);
    localStorage.removeItem('cart'); // Clear localStorage as well
  };

  const orderNow = (hiveOp?: string) => {
    const recipient = process.env.HIVE_ACCOUNT || 'indies.cafe';
    const amountHbd = '0.01';
    const memo = hiveOp || 'Un serveur est appelé pour la TABLE ';
    const finalMemo = `${memo} ${table}` ; // Handle empty original memo
    const amountNum = parseFloat(amountHbd);

    if (isNaN(amountNum)) {
      // Consider how to handle errors, perhaps throw or return an error string
      // For now, let's adapt the throw from the original function
      throw new Error(`Invalid amount_hbd: ${amountHbd}`);
    }

    const operation = [
      'transfer',
      {
        to: recipient,
        amount: `${amountNum.toFixed(3)} HBD`,
        memo: finalMemo,
      },
    ];

    // Node.js Buffer for Base64 encoding
    const encodedOperation = 'hive://sign/op/'+Buffer.from(JSON.stringify(operation)).toString('base64');
    console.log('Ordering now with hiveOp: \'', encodedOperation, '\''); // Debug log
    // Here you would typically send the cart to your backend or Hive operation
    // For now, just clear the cart after ordering
    clearCart();
    return encodedOperation; // Return the hive operation URL
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart
      .reduce((total, item) => {
        const price = parseFloat(item.price);
        return total + price * item.quantity;
      }, 0)
      .toFixed(2);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        hiveOp: '', // Optional, can be set later
        table: table || ' 203 ', // Default table ID, can be set later or passed as a prop

        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        orderNow,
        getTotalItems,
        getTotalPrice,
        setTable: (tableId: string) => {
          console.log('Setting table:', tableId); // Debug log
          setTable(tableId);
          localStorage.setItem('cartTable', tableId); // Save to localStorage
        }
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// Custom hook to consume the cart context
export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}