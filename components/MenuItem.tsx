// components/MenuItem.tsx
import React from 'react';

// Re-import necessary types or ensure they are globally available if preferred
// For simplicity, defining them here if not imported from a shared types file
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

interface MenuItemProps {
    item: Dish | Drink;
    selectedSizes: { [key: string]: string };
    handleSizeChange: (drinkId: string, size: string) => void;
    handleAddItem: (item: Dish | Drink) => void;
}

const MenuItem: React.FC<MenuItemProps> = React.memo(({ item, selectedSizes, handleSizeChange, handleAddItem }) => {
    // console.log(`Rendering MenuItem: ${item.name}`); // Uncomment for debugging render cycles
    return (
        <div className="menu-item"> {/* key prop is applied in the map function in parent */}
            {item.image && (
                <img src={item.image} alt={item.name} className="menu-item-image" />
            )}
            <div className="menu-item-details">
                <h4 className="font-bold text-lg">{item.name}</h4>
                {item.type === 'dish' ? (
                    <p>€{item.price}</p>
                ) : (
                    <div>
                        <select
                            value={selectedSizes[item.id] || item.availableSizes[0]?.size || ''}
                            onChange={(e) => handleSizeChange(item.id, e.target.value)}
                            className="mt-2 p-1 border rounded"
                        >
                            {item.availableSizes.map((size) => (
                                <option key={size.size} value={size.size}>
                                    {size.size}: €{size.price}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
            <button
                onClick={() => handleAddItem(item)}
                className="add-to-cart-button"
            >
                Add to Cart
            </button>
        </div>
    );
});

export default MenuItem;