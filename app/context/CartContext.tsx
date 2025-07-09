// app/context/CartContext.tsx
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
// import { Buffer } from 'buffer'; // [CHANGE 1]: Import Buffer for client-side usage
import { generateHiveTransferUrl, generateDistriatedHiveOp, dehydrateMemo } from '@/lib/utils';

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
  callWaiter: () => string; // Assuming you want to keep this for waiter calls
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
  callWaiter: () => 'default',
  getTotalItems: () => 0,
  getTotalPrice: () => '0.00',
  setTable: () => {},
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [table, setTableState] = useState<string | null>(null); // Use a state variable for table  
  const [cart, setCart] = useState<CartItem[]>([]);

 // Effect to load cart from localStorage (existing)
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
  
  
  useEffect(() => { // Renamed setTable to setTableState to avoid conflict
    if (typeof window !== 'undefined') {
      const savedTable = localStorage.getItem('cartTable');
      const urlTable = searchParams.get('table');
      let validatedTable: string | null = null;      

      if (urlTable) {
        const parsedTable = parseInt(urlTable, 10);
        if (!isNaN(parsedTable) && parsedTable > 0 && parsedTable <= 9999) {
          validatedTable = parsedTable.toString();
        } else {
          console.warn(`Invalid or out-of-range table parameter from URL: "${urlTable}". Using default or saved.`);
        }
      }
      // Prioritize validated URL table, then saved, then a hardcoded default if nothing else
      const initialTable = validatedTable || savedTable || '203';
        setTableState(initialTable); // Set the table state here
      }
    }, [searchParams]); // Run this effect when searchParams change

  // Effect to save cart and table to localStorage whenever they change
  // This ensures that the cart and table state are saved after initial hydration
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
      if (table !== null) { // Only attempt to save table if it has been set from initial hydration
        localStorage.setItem('cartTable', table);
      }      
      console.log('Cart saved to localStorage:', { cart, table });
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  }, [cart, table]); // Save cart and table state to localStorage whenever they change

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

  const orderNow = () => {
    const recipient = process.env.NEXT_PUBLIC_HIVE_ACCOUNT || 'indies.cafe';

    // 1. Calculate amountHbd from cart total
    const amountHbd = getTotalPrice(); // Returns a string like "12.50"
    // 2. Generate memo content
    const cartContentMemo = dehydrateMemo(cart);
    console.log('CartContext - Cart content memo:', cartContentMemo); // Log the memo content
    
    const tableNumber = table || '203'; // Use default if table is null
    //const distriateString = distriate(); // Call the distriate function

    // Concatenate all memo parts for the raw memo
    const rawMemo = `${cartContentMemo}; TABLE ${tableNumber}`;

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
    // 4. Generate the Hive operation
    const operation = generateDistriatedHiveOp({
      recipient: recipient,
      amountHbd: amountHbd,
      memo: finalMemo,
    });

    console.log('CartContext - Final Memo:', finalMemo); // Log the actual memo being sent

    // const encodedOperation = 'hive://sign/op/'+Buffer.from(JSON.stringify(operation)).toString('base64');
    // console.log('CartContext - Ordering now with hiveOp: \'', encodedOperation, '\'');
    clearCart();
    return operation;
  };

  const callWaiter = () => {
    const recipient = process.env.NEXT_PUBLIC_HIVE_ACCOUNT || 'indies.cafe';
    const amountHbd = '0.010'; // Fixed amount for "Call a Waiter"
    const tableNumber = table || '203';
    const memo = `Un serveur est appelé TABLE ${tableNumber}`;

    const encodedOperation = generateHiveTransferUrl({
      recipient,
      amountHbd,
      memo,
    });

    console.log('CartContext - Generated Hive Call Waiter URL:', encodedOperation);
    console.log('CartContext - Final Call Waiter Memo:', memo);

    // DO NOT clear the cart for "Call a Waiter"
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
        callWaiter,
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