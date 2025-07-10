// components/CartItemDisplay.tsx
import React from 'react';

interface CartItem {
    id: string;
    name: string;
    price: string;
    quantity: number;
    options: { [key: string]: string };
}

interface CartItemDisplayProps {
    item: CartItem;
    tableParam: string | null;
    updateQuantity: (id: string, newQuantity: number, options?: { [key: string]: string }, table?: string) => void;
    removeItem: (id: string) => void;
}

const CartItemDisplay: React.FC<CartItemDisplayProps> = React.memo(({ item, tableParam, updateQuantity, removeItem }) => {
    // console.log(`Rendering CartItemDisplay: ${item.name}`); // Uncomment for debugging render cycles
    return (
        <div className="cart-item-grid"> {/* key prop is applied in the map function in parent */}
            <div className="cart-item-name">{item.name}</div>
            <div className="cart-item-price">€{item.price}</div>
            <div className="cart-item-quantity">{item.quantity}</div>
            <button onClick={() => updateQuantity(item.id, item.quantity - 1, item.options, tableParam || '203')} className="cart-button minus-button">-</button>
            <button onClick={() => updateQuantity(item.id, item.quantity + 1, item.options, tableParam || '203')} className="cart-button plus-button">+</button>
            <button onClick={() => removeItem(item.id)} className="cart-button drop-button">Drop</button>
        </div>
    );
});

export default CartItemDisplay;