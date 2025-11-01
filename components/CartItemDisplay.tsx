// components/CartItemDisplay.tsx
import React from 'react';

// Define the interface for a CartItem, including its options
interface CartItem {
    id: string;
    name: string;
    price: string;
    quantity: number;
    options: { [key: string]: string }; // e.g., { size: 'large', cuisson: 'medium' }
}

// Define the props for the CartItemDisplay component
interface CartItemDisplayProps {
    item: CartItem;
    tableParam: string | null;
    // updateQuantity now correctly expects options and table, as defined in CartContext
    updateQuantity: (id: string, newQuantity: number, options: { [key: string]: string }, table?: string) => void;
    removeItem: (id: string) => void;
}

const CartItemDisplay: React.FC<CartItemDisplayProps> = React.memo(({ item, tableParam, updateQuantity, removeItem }) => {
    // console.log(`Rendering CartItemDisplay: ${item.name}`); // Uncomment for debugging render cycles

    // Check if there are any options (like size or cuisson) associated with the item
    const hasOptions = Object.keys(item.options).length > 0;

    return (
        <div className="cart-item-grid text-black"> {/* key prop is applied in the map function in parent */}
            <div className="cart-item-name text-black">{item.name}</div>
            <div className="cart-item-price text-black">€{item.price}</div>

            {/* Display options if the item has any */}
            {hasOptions && (
                <div className="cart-item-options text-black">
                    {/* Display ingredient option if present for drinks */}
                    {item.options.ingredient && (
                        <span className="option-tag text-black">{item.options.ingredient}</span>
                    )}
                    {/* Display size option if present */}
                    {item.options.size && (
                        <span className="option-tag text-black">Size: {item.options.size}</span>
                    )}
                    {/* Display cuisson option if present for meat dishes */}
                    {item.options.cuisson && (
                        <span className="option-tag text-black">Cuisson: {item.options.cuisson}</span>
                    )}
                </div>
            )}

            <div className="cart-item-quantity text-black">{item.quantity}</div>
            <button
                onClick={() => updateQuantity(item.id, item.quantity - 1, item.options, tableParam || '203')}
                className="cart-button minus-button"
            >
                -
            </button>
            <button
                onClick={() => updateQuantity(item.id, item.quantity + 1, item.options, tableParam || '203')}
                className="cart-button plus-button"
            >
                +
            </button>
            <button
                onClick={() => removeItem(item.id)}
                className="cart-button drop-button"
            >
                Drop
            </button>
        </div>
    );
});

export default CartItemDisplay;