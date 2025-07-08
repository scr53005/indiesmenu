// app/context/CartContext.tsx
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Buffer } from 'buffer'; // [CHANGE 1]: Import Buffer for client-side usage
import { distriate } from '@/lib/utils';

interface CartItem {
  id: string;
  name: string;
  price: string; // Decimal from Prisma
  quantity: number;
  options: { [key: string]: string }; // e.g., { size: 'large', cuisson: 'medium' }
};

interface CartContextType {
  cart: CartItem[];
  hiveOp?: string;
  table: string | ' 203 ';
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, newQuantity: number) => void; // Simplified signature
  clearCart: () => void;
  orderNow: () => string;
  getTotalItems: () => number;
  getTotalPrice: () => string;
  setTable: (tableId: string) => void;
}

const CartContext = createContext<CartContextType>({
  cart: [],
  hiveOp: '',
  table: ' 305 ',
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  orderNow: () => 'default',
  getTotalItems: () => 0,
  getTotalPrice: () => '0.00',
  setTable: () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [cart, setCart] = useState<CartItem[]>([]);

  const [table, setTableState] = useState<string | null>(() => { // Renamed setTable to setTableState to avoid conflict
    if (typeof window !== 'undefined') {
      const savedTable = localStorage.getItem('cartTable');
      const urlTable = searchParams.get('table');
      if (urlTable) {
        return urlTable;
      }
      return savedTable || null;
    }
    return null;
  });

  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error("Failed to load cart from localStorage:", error);
      setCart([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
      console.log('Cart saved to localStorage:', { cart, table });
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  }, [cart, table]); // [CHANGE 2]: Added 'table' to dependency array for useEffect for localStorage save

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
    console.log('CartContext - Adding item to cart:', item);
    setCart((prev) => {
      console.log('CartContext - Previous cart state:', prev);
      // [CHANGE 3]: Use areOptionsEqual for robust comparison
      const existingItem = prev.find((i) => i.id === item.id && areOptionsEqual(i.options, item.options));

      if (existingItem) {
        const updatedCart = prev.map((i) =>
          (i.id === item.id && areOptionsEqual(i.options, item.options))
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
        console.log('CartContext - Item exists, updated cart:', updatedCart);
        return updatedCart;
      } else {
        const newCart = [...prev, { ...item, quantity: item.quantity || 1 }]; // Ensure quantity is set for new items
        console.log('CartContext - New item added, new cart:', newCart);
        return newCart;
      }
    });
  };

  const removeItem = (id: string) => {
    console.log('CartContext - Removing item:', id);
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    console.log('CartContext - Updating quantity:', id, newQuantity);
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
    console.log('CartContext - Clearing cart');
    setCart([]);
    localStorage.removeItem('cart');
  };

   // Helper for option short codes for memo
  const optionShortCodes: { [key: string]: string } = {
    size: 's',
    cuisson: 'c', // Assuming 'cuisson' can be an option key from your dishes
    // Add other short codes as needed based on your item options
  };
  
  const orderNow = (hiveOp?: string) => {
    // [CHANGE 4]: Use NEXT_PUBLIC_ prefix for client-side environment variable
    const recipient = process.env.NEXT_PUBLIC_HIVE_ACCOUNT || 'indies.cafe';

    // 1. Calculate amountHbd from cart total
    const amountHbd = getTotalPrice(); // Returns a string like "12.50"

    /*const memo = hiveOp || 'Un serveur est appelé pour la TABLE ';
    const finalMemo = `${memo} ${table}` ;*/
    const amountNum = parseFloat(amountHbd);

    if (isNaN(amountNum)) {
      throw new Error(`Invalid amount_hbd: ${amountHbd}`);
    }

   // 2. Generate memo content
    const cartMemoParts: string[] = [];
    cart.forEach(item => {
      let itemMemo = '';
      let baseId = '';
      let itemTypePrefix = '';

      if (item.id.startsWith('dish-')) {
        itemTypePrefix = 'd';
        baseId = item.id.replace('dish-', '');
      } else if (item.id.startsWith('drink-')) {
        // Assuming drink ID format is 'drink-<numeric_id>-<size_string>'
        const parts = item.id.split('-');
        if (parts.length >= 2) {
            itemTypePrefix = 'b';
            baseId = parts[1]; // Get the numeric ID part
        } else {
            console.warn('Malformed drink ID in cart:', item.id);
            return; // Skip this item for memo generation
        }
      } else {
        console.warn('Unknown item ID format in cart:', item.id);
        return; // Skip this item for memo generation
      }

      itemMemo = `${itemTypePrefix}:${baseId}`;

      // Add options to memo string
      Object.keys(item.options).forEach(optionKey => {
        const shortCode = optionShortCodes[optionKey];
        if (shortCode && item.options[optionKey]) { // Only add if short code exists and option value is not empty
          itemMemo += `,${shortCode}:${item.options[optionKey]}`;
        }
      });

      // Add quantity if greater than 1
      if (item.quantity > 1) {
        itemMemo += `,q:${item.quantity}`;
      }
      cartMemoParts.push(itemMemo);
    });

    const cartContentMemo = cartMemoParts.join(';');
    const tableNumber = table || '203'; // Use default if table is null
    const distriateString = distriate(); // Call the distriate function

    // Concatenate all memo parts for the raw memo
    const rawMemo = `${cartContentMemo}; TABLE ${tableNumber} ${distriateString}`;

    // 3. Check memo length (255 characters limit)
    const memoLimit = 255;
    let finalMemo = rawMemo;

    if (rawMemo.length > memoLimit) {
      console.warn(`Memo exceeds ${memoLimit} characters (${rawMemo.length}). Truncating...`);
      // A simple truncation strategy: just cut off the end
      finalMemo = rawMemo.substring(0, memoLimit);
      // You could implement a more sophisticated strategy here,
      // e.g., truncating the cartContentMemo first while keeping table and distriate info.
    }


    const operation = [
      'transfer',
      {
        to: recipient,
        amount: `${amountNum.toFixed(3)} HBD`,
        memo: finalMemo,
      },
    ];

    console.log('CartContext - Final Memo:', finalMemo); // Log the actual memo being sent
    const encodedOperation = 'hive://sign/op/'+Buffer.from(JSON.stringify(operation)).toString('base64');
    console.log('CartContext - Ordering now with hiveOp: \'', encodedOperation, '\'');
    clearCart();
    return encodedOperation;
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
        hiveOp: '',
        table: table || ' 203 ',
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        orderNow,
        getTotalItems,
        getTotalPrice,
        setTable: (tableId: string) => {
          console.log('CartContext - Setting table:', tableId);
          setTableState(tableId); // Use setTableState for consistency
          localStorage.setItem('cartTable', tableId);
        }
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}