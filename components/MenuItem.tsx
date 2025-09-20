// components/MenuItem.tsx
import React from 'react';
// Import the enriched types directly from your menu data file
import { FormattedCuisson, FormattedIngredient, FormattedDish, FormattedDrink } from '@/lib/data/menu';

// Define the props for the MenuItem component
interface MenuItemProps {
    item: FormattedDish | FormattedDrink; // Use the enriched types from menu.ts
    selectedSizes: { [key: string]: string }; // Tracks selected size for drinks
    selectedCuisson: { [key: string]: string }; // Tracks selected cuisson for dishes
    // Callback for when a drink size selection changes
    handleSizeChange: (itemId: string, size: string) => void;
    // Callback for when a dish cuisson selection changes
    handleCuissonChange: (itemId: string, cuissonEnglishName: string) => void;
    // Callback for adding an item to the cart, now accepts options
    handleAddItem: (item: FormattedDish | FormattedDrink, options?: { [key: string]: string }) => void;
}

const MenuItem: React.FC<MenuItemProps> = React.memo(({
    item,
    selectedSizes,
    selectedCuisson,
    handleSizeChange,
    handleCuissonChange,
    handleAddItem
}) => {
    // Determine if the current item is a dish for type-specific rendering
    const isDish = item.type === 'dish';
    // Check if a dish has associated cuisson options
    const hasCuissonOptions = isDish && (item as FormattedDish).cuissons && (item as FormattedDish).cuissons.length > 0;

    // Initialize display price with the item's base price
    let displayPrice; // = item.price;

    // If it's a drink, adjust the displayed price based on the selected size
    if (!isDish) {
        const drinkItem = item as FormattedDrink;
        const currentSelectedSize = selectedSizes[item.id];

        if (currentSelectedSize) {
            // Find the price for the actively selected size
            const sizeOption = drinkItem.availableSizes.find(s => s.size === currentSelectedSize);
            if (sizeOption) {
                displayPrice = sizeOption.price;
            }
        } else if (drinkItem.availableSizes.length > 0) {
            // If no size is selected, default to the price of the first available size
            displayPrice = drinkItem.availableSizes[0].price;
        }
    } else {
        // For dishes, just use the base price
        displayPrice = (item as FormattedDish).price;
    }

    // Determine the currently selected cuisson for a dish, defaulting to the first option if available
    const currentCuisson = selectedCuisson[item.id] || (hasCuissonOptions ? (item as FormattedDish).cuissons[0]?.english_name : '');
    // Determine the currently selected size for a drink, defaulting to the first option if available
    const currentSize = selectedSizes[item.id] || (!isDish && (item as FormattedDrink).availableSizes[0]?.size || '');

    // Function to handle adding the item to the cart, including selected options
    const handleAddToCartClick = () => {
        const options: { [key: string]: string } = {};
        if (hasCuissonOptions) {
            options.cuisson = currentCuisson; // Add selected cuisson to options
        }
        if (!isDish) {
            options.size = currentSize; // Add selected size to options for drinks
        }
        handleAddItem(item, options); // Call the parent's addItem function with item and options
    };

    return (
        <div className="menu-item text-black"> {/* key prop is applied in the map function in the parent component */}
            {item.image && (
                <img src={item.image} alt={item.name} className="menu-item-image" />
            )}
            <div className="menu-item-details">
                <h4 className="font-bold text-lg">{item.name}</h4>
                {isDish ? (
                    // Render specific controls for dishes
                    <>
                        {hasCuissonOptions ? ( // Only render select if cuisson options exist for the dish
                            <div>
                                <select
                                    value={currentCuisson}
                                    onChange={(e) => handleCuissonChange(item.id, e.target.value)}
                                    className="mt-2 p-1 border rounded"
                                >
                                    {(item as FormattedDish).cuissons.map((cuisson) => (
                                        <option key={cuisson.id} value={cuisson.english_name}>
                                            {cuisson.english_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            // If no cuisson options, just display the price for dishes
                            <p>€{displayPrice}</p>
                        )}
                        {/* Always display price for dishes, possibly below cuisson select */}
                        {hasCuissonOptions && <p>€{displayPrice}</p>}
                    </>
                ) : (
                    // Render specific controls for drinks
                    <div>
                        {(item as FormattedDrink).availableSizes.length > 0 && ( // Only render select if sizes exist for the drink
                            <select
                                value={currentSize}
                                onChange={(e) => handleSizeChange(item.id, e.target.value)}
                                className="mt-2 p-1 border rounded"
                            >
                                {(item as FormattedDrink).availableSizes.map((size) => (
                                    <option key={size.size} value={size.size}>
                                        {size.size}: €{size.price}
                                    </option>
                                ))}
                            </select>
                        )}
                        <p>€{displayPrice}</p>
                    </div>
                )}
            </div>
            <button
                onClick={handleAddToCartClick}
                className="add-to-cart-button"
            >
                Add to Cart
            </button>
        </div>
    );
});

export default MenuItem;