// app/context/CartContext.tsx
'use client';
// import { Decimal } from '@prisma/client/runtime/library';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { generateHiveTransferUrl, generateDistriatedHiveOp, dehydrateMemo } from '@/lib/utils';

interface CartItem {
  id: string; // This ID should be unique, incorporating options like 'drink-123-large' or 'dish-456-mediumrare'
  name: string; // e.g., 'Coca-Cola (Large)' or 'Steak (Medium Rare)'
  price: string;
  quantity: number;
  options: { [key: string]: string }; // e.g., { size: 'large', cuisson: 'medium' }
  conversion_rate?: number; // Optional conversion rate for this item, if applicable
  discount: number; // Discount multiplier (e.g., 0.9 = 10% off, 1.0 = no discount)
};

interface CartContextType {
  cart: CartItem[];
  table: string; // Changed to string, assuming '203' or actual table number
  conversion_rate: number; // Conversion rate for prices
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void; // `id` here is the unique cart item id
  updateQuantity: (id: string, newQuantity: number, options: { [key: string]: string }, table?: string) => void;
  clearCart: () => void;
  orderNow: () => string;
  callWaiter: () => string;
  getTotalItems: () => number;
  getTotalPrice: () => string;
  getTotalEurPrice: () => string;
  getTotalEurPriceNoDiscount: () => string;
  getDiscountAmount: () => string;
  getMemo: () => string;
  getMemoWithDistriate: () => string; // Returns memo with distriate suffix (for Flow 7)
  setTable: (tableId: string) => void;
}

const CartContext = createContext<CartContextType>({
  cart: [],
  table: '203', // Default table
  conversion_rate: 1.0000, // Default conversion rate
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  orderNow: () => '',
  callWaiter: () => '',
  getTotalItems: () => 0,
  getTotalPrice: () => '0.00',
  getTotalEurPrice: () => '0.00',
  getTotalEurPriceNoDiscount: () => '0.00',
  getDiscountAmount: () => '0.00',
  getMemo: () => '',
  getMemoWithDistriate: () => '',
  setTable: () => {},
});

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableState, setTableState] = useState<string>(''); // Renamed to avoid conflict with context value
  const [conversionRate, setConversionRate] = useState<number>(1.0); // Default conversion rate
  const searchParams = useSearchParams();
  const urlTable = searchParams.get('table');

  useEffect(() => {
    // Initialize cart from localStorage on mount
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const parsedCart: CartItem[] = JSON.parse(savedCart);
      setCart(parsedCart);
      const firstItemWithRate = parsedCart.find(item => item.conversion_rate !== undefined);
      if (firstItemWithRate && firstItemWithRate.conversion_rate !== undefined) {
        setConversionRate(firstItemWithRate.conversion_rate);
      }
    }
    // Initialize table from URL or localStorage (URL takes precedence - it's the source of truth from QR codes)
    if (urlTable) {
        // URL parameter present - this is authoritative (from QR code scan or direct link)
        const validatedTable = parseInt(urlTable, 10);
        const finalTable = isNaN(validatedTable) ? '203' : validatedTable.toString();
        setTableState(finalTable);
        localStorage.setItem('cartTable', finalTable);
        console.log('[CART CONTEXT] Table set from URL:', finalTable);
    } else {
        // No URL parameter - check localStorage for previously saved table
        const savedTable = localStorage.getItem('cartTable');
        if (savedTable) {
            setTableState(savedTable);
            console.log('[CART CONTEXT] Table restored from localStorage:', savedTable);
        } else {
            // No URL and no localStorage - use default
            setTableState('203');
            localStorage.setItem('cartTable', '203');
            console.log('[CART CONTEXT] Table set to default: 203');
        }
    }

  }, [urlTable]); // Depend on urlTable to react to changes in the URL param

  useEffect(() => {
    // Save cart to localStorage whenever it changes
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]); // Depend on cart state

  // Use functional updates to make these callbacks stable
  const addItem = useCallback((item: CartItem) => {
    console.log('[CART CONTEXT] addItem called with:', item);
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
        console.log('[CART CONTEXT] Updated existing item, new cart:', newCart);
        return newCart;
      }
      // Set conversion_rate if not already set (default 1.0)
      if (item.conversion_rate !== undefined && conversionRate === 1.0) {
        setConversionRate(item.conversion_rate);
        // alert(`CartContext - Setting conversion rate to: ${item.conversion_rate}`);
      }
      // If not, add new item
      const newCart = [...prevCart, { ...item, quantity: 1 }];
      console.log('[CART CONTEXT] Added new item, new cart:', newCart);
      return newCart;
    });
  }, [conversionRate]); 

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
    const eurPrice = cart.reduce((total, item) => {
      const price = parseFloat(item.price);
      return total + price * item.quantity;
    }, 0);
    const hbdPrice = eurPrice * conversionRate;
    return hbdPrice.toFixed(2);
  }, [cart, conversionRate]);

  const getTotalEurPrice = useCallback(() => {
    const eurPrice = cart.reduce((total, item) => {
      const price = parseFloat(item.price);
      return total + price * item.quantity;
    }, 0);
    return eurPrice.toFixed(2);
  }, [cart]);

  const getTotalEurPriceNoDiscount = useCallback(() => {
    const eurPriceNoDiscount = cart.reduce((total, item) => {
      const price = parseFloat(item.price);
      const discount = item.discount;

      // Only reverse discount if discount < 1 (actual discount, not surcharge or no-discount)
      const originalPrice = discount < 1 ? price / discount : price;

      return total + originalPrice * item.quantity;
    }, 0);
    return eurPriceNoDiscount.toFixed(2);
  }, [cart]);

  const getDiscountAmount = useCallback(() => {
    const guestPrice = parseFloat(getTotalEurPriceNoDiscount()) * 1.05; // No discount + 5% fee
    const accountPrice = parseFloat(getTotalEurPrice()); // With discount, no fee
    const forfeitureAmount = guestPrice - accountPrice;
    return forfeitureAmount.toFixed(2);
  }, [getTotalEurPrice, getTotalEurPriceNoDiscount]);

  const getMemo = useCallback(() => {
    // Prepare the items array for dehydration
    const itemsToDehydrate = cart.map(item => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      options: item.options
    }));

    // Dehydrate the items list to a string
    let dehydratedItemsString = dehydrateMemo(itemsToDehydrate);
    dehydratedItemsString = dehydratedItemsString.endsWith(';') ? dehydratedItemsString : dehydratedItemsString + ';';
    const memoWithTableInfo = dehydratedItemsString + (tableState ? ` TABLE ${tableState} ` : ' No table specified ');

    return memoWithTableInfo;
  }, [cart, tableState]);

  const getMemoWithDistriate = useCallback(() => {
    // Get base memo and add distriate suffix (same pattern as orderNow)
    const baseMemo = getMemo();
    // Use generateDistriatedHiveOp to get the memo with suffix, then extract just the memo
    const params = {
      recipient: 'temp',
      amountHbd: '0.001',
      memo: baseMemo
    };
    generateDistriatedHiveOp(params); // This modifies params.memo to include distriate suffix
    return params.memo;
  }, [getMemo]);

  const orderNow = useCallback(() => {
    const memoWithTableInfo = getMemo();
    const recipient = process.env.NEXT_PUBLIC_HIVE_ACCOUNT || 'indies.cafe';
    const amountHbd = getTotalPrice(); // Use the formatted total price

    const encodedOperation = generateDistriatedHiveOp({
      recipient,
      amountHbd,
      memo: memoWithTableInfo, // Use the dehydrated items string and the table info directly as the memo
    });

    console.log('CartContext - Generated Hive Order URL:', encodedOperation);
    console.log('CartContext - Final Order Memo Object:', memoWithTableInfo); // Log the full object for clarity

    // clearCart(); // Clear cart after generating order URL

    return encodedOperation;
  }, [getMemo, getTotalPrice, getTotalEurPrice]); // Dependencies: getMemo, getTotalPrice, getTotalEurPrice

  const callWaiter = useCallback(() => {
    // As requested, use a fixed string for the memo for 'Call a Waiter'
    const fixedMemoString = 'Un serveur est appelé ' + (tableState ? `TABLE ${tableState}` : '');

    const recipient = process.env.NEXT_PUBLIC_HIVE_ACCOUNT || 'indies.cafe';
    const amountHbd = '0.020'; // Symbolic amount for waiter call

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
        table: tableState,
        conversion_rate: conversionRate,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        orderNow,
        callWaiter,
        getTotalItems,
        getTotalPrice,
        getTotalEurPrice,
        getTotalEurPriceNoDiscount,
        getDiscountAmount,
        getMemo,
        getMemoWithDistriate,
        setTable
      }}
    >
      {children}
    </CartContext.Provider>
  );
};