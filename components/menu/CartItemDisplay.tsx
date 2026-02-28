// components/CartItemDisplay.tsx
import React from 'react';

interface CartItem {
    id: string;
    name: string;
    price: string;
    quantity: number;
    options: { [key: string]: string };
    comment?: string;
}

interface CartItemDisplayProps {
    item: CartItem;
    tableParam: string | null;
    updateQuantity: (id: string, newQuantity: number, options: { [key: string]: string }, table?: string) => void;
    removeItem: (id: string) => void;
    updateComment: (id: string, comment: string) => void;
}

const CartItemDisplay: React.FC<CartItemDisplayProps> = React.memo(({ item, tableParam, updateQuantity, removeItem, updateComment }) => {
    const hasOptions = Object.keys(item.options).length > 0;

    return (
        <div className="cart-item-grid text-black">
            <div className="cart-item-name text-black">{item.name}</div>
            <div className="cart-item-price text-black">€{item.price}</div>

            {/* Options row: always shown — contains option tags (if any) + comment input */}
            <div className="cart-item-options text-black">
                {item.options.ingredient && (
                    <span className="option-tag text-black">{item.options.ingredient}</span>
                )}
                {item.options.size && (
                    <span className="option-tag text-black">Size: {item.options.size}</span>
                )}
                {item.options.cuisson && (
                    <span className="option-tag text-black">Cuisson: {item.options.cuisson}</span>
                )}
                <input
                    type="text"
                    placeholder="Note..."
                    maxLength={80}
                    value={item.comment || ''}
                    onChange={(e) => updateComment(item.id, e.target.value)}
                    className="cart-comment-input"
                />
            </div>

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
