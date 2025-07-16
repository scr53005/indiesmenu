// app/context/CartContext.tsx
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateHiveTransferUrl, generateDistriatedHiveOp, dehydrateMemo } from '@/lib/utils';

interface CartItem {
  id: string; // This ID should be unique, incorporating options like 'drink-123-large' or 'dish-456-mediumrare'
  name: string; // e.g., 'Coca-Cola (Large)' or 'Steak (Medium Rare)'
  price: string;
  quantity: number;
  options: { [key: string]: string }; // e.g., { size: 'large', cuisson: 'medium' }
};

interface CartContextType {
  cart: CartItem[];
  // hiveOp?: string; // Removed as per user's earlier instruction
  table: string; // Changed to string, assuming '203' or actual table number
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void; // `id` here is the unique cart item id
  updateQuantity: (id: string, newQuantity: number, options: { [key: string]: string }, table?: string) => void;
  clearCart: () => void;
  orderNow: () => string;
  callWaiter: () => string;
  getTotalItems: () => number;
  getTotalPrice: () => string;
  setTable: (tableId: string) => void;
}

const CartContext = createContext<CartContextType>({
  cart: [],
  // hiveOp: '', // Removed from default value
  table: '203', // Default table
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  orderNow: () => '',
  callWaiter: () => '',
  getTotalItems: () => 0,
  getTotalPrice: () => '0.00',
  setTable: () => {},
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableState, setTableState] = useState<string>(''); // Renamed to avoid conflict with context value
  const searchParams = useSearchParams();
  const urlTable = searchParams.get('table');

  useEffect(() => {
    // Initialize cart from localStorage on mount
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
    // Initialize table from localStorage or URL
    const savedTable = localStorage.getItem('cartTable');
    if (savedTable) {
        setTableState(savedTable);
    } else if (urlTable) {
        const validatedTable = parseInt(urlTable, 10);
        const finalTable = isNaN(validatedTable) ? '203' : validatedTable.toString();
        setTableState(finalTable);
        localStorage.setItem('cartTable', finalTable);
    } else {
        setTableState('203'); // Default if neither localStorage nor URL provides it
        localStorage.setItem('cartTable', '203');
    }

  }, [urlTable]); // Depend on urlTable to react to changes in the URL param

  useEffect(() => {
    // Save cart to localStorage whenever it changes
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]); // Depend on cart state

  // Use functional updates to make these callbacks stable
  const addItem = useCallback((item: CartItem) => {
    setCart(prevCart => {
      // Find item with same unique ID (which now includes options in its 'id' string)
      const existingItemIndex = prevCart.findIndex(cartItem => cartItem.id === item.id);

      if (existingItemIndex > -1) {
        // If item with same unique ID exists, update its quantity
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + 1,
        };
        return newCart;
      }
      // If not, add new item
      return [...prevCart, { ...item, quantity: 1 }];
    });
  }, []); // Empty dependency array because we're using functional update

  const removeItem = useCallback((id: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  }, []); // Empty dependency array

  const updateQuantity = useCallback((id: string, newQuantity: number, options: { [key: string]: string }, table?: string) => {
    setCart(prevCart => {
      if (newQuantity <= 0) {
        // If new quantity is 0 or less, remove the item
        return prevCart.filter(item => item.id !== id);
      }
      // Otherwise, update the quantity of the matching item
      return prevCart.map(item =>
        item.id === id // The 'id' here is already the unique ID including options
            ? { ...item, quantity: newQuantity }
            : item
      );
    });
  }, []); // Empty dependency array. 'options' and 'table' are arguments, not dependencies.

  const clearCart = useCallback(() => {
    setCart([]);
  }, []); // Empty dependency array

  // Memoize total calculations for stability
  const getTotalItems = useCallback(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]); // Depends on 'cart' content

  const getTotalPrice = useCallback(() => {
    return cart
      .reduce((total, item) => {
        const price = parseFloat(item.price);
        return total + price * item.quantity;
      }, 0)
      .toFixed(2);
  }, [cart]); // Depends on 'cart' content

  const orderNow = useCallback(() => {
    // Prepare the items array for dehydration, if dehydrateMemo expects this format
    const itemsToDehydrate = cart.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price, // parseFloat(item.price), // Convert price back to number for memo structure
        quantity: item.quantity,
        options: item.options
    }));

/* interface CartItem {
  id: string; // This ID should be unique, incorporating options like 'drink-123-large' or 'dish-456-mediumrare'
  name: string; // e.g., 'Coca-Cola (Large)' or 'Steak (Medium Rare)'
  price: string;
  quantity: number;
  options: { [key: string]: string }; // e.g., { size: 'large', cuisson: 'medium' }
};
*/
    // Dehydrate the items list to a string
    const dehydratedItemsString = dehydrateMemo(itemsToDehydrate);
    const memoWithTableInfo = dehydratedItemsString + (tableState ? ` TABLE ${tableState} ` : ' No table specified ');
    // Construct the full memo object, embedding the dehydrated items string
    /*const fullMemoObject = {
        type: 'order',
        table: tableState,
        // Assuming the dehydrated string is placed under a key like 'dehydratedItems'
        dehydratedItems: dehydratedItemsString, // Embed the dehydrated items string
        totalPrice: getTotalPrice(),
        timestamp: new Date().toISOString(),
    };*/

    // Stringify the entire memo object for the Hive transfer
    /*const finalMemoString = JSON.stringify(fullMemoObject);*/

    const recipient = process.env.NEXT_PUBLIC_HIVE_ACCOUNT || 'indies.cafe';
    const amountHbd = getTotalPrice(); // Use the formatted total price

    const encodedOperation = generateDistriatedHiveOp({
      recipient,
      amountHbd,
      memo: memoWithTableInfo, // Use the dehydrated items string and the table info directly as the memo
    });

    console.log('CartContext - Generated Hive Order URL:', encodedOperation);
    console.log('CartContext - Final Order Memo Object:', memoWithTableInfo); // Log the full object for clarity

    clearCart(); // Clear cart after generating order URL

    return encodedOperation;
  }, [cart, tableState, getTotalPrice, clearCart]); // Dependencies: cart, tableState, getTotalPrice, clearCart

  const callWaiter = useCallback(() => {
    // As requested, use a fixed string for the memo for 'Call a Waiter'
    const fixedMemoString = 'Un serveur est appelé ' + (tableState ? `TABLE ${tableState}` : '');

    const recipient = process.env.NEXT_PUBLIC_HIVE_ACCOUNT || 'indies.cafe';
    const amountHbd = '0.001'; // Symbolic amount for waiter call

    const encodedOperation = generateHiveTransferUrl({
      recipient,
      amountHbd,
      memo: fixedMemoString, // Corrected: Pass the fixed string directly
    });

    console.log('CartContext - Generated Hive Call Waiter URL:', encodedOperation);
    console.log('CartContext - Final Call Waiter Memo:', fixedMemoString); // Log the fixed string for clarity

    return encodedOperation;
  }, [tableState]); // Dependencies: tableState

  const setTable = useCallback((tableId: string) => {
    console.log('CartContext - Setting table:', tableId);
    setTableState(tableId);
    localStorage.setItem('cartTable', tableId);
  }, []); // Empty dependency array

  return (
    <CartContext.Provider
      value={{
        cart,
        // hiveOp: '', // Removed from context value
        table: tableState,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        orderNow,
        callWaiter,
        getTotalItems,
        getTotalPrice,
        setTable
      }}
    >
      {children}
    </CartContext.Provider>
  );
};