// components/MenuItem.tsx
import React from 'react';
// Import the enriched types directly from your menu data file
import { FormattedCuisson, FormattedIngredient, FormattedDish, FormattedDrink } from '@/lib/data/menu';

// Define the props for the MenuItem component
interface MenuItemProps {
    item: FormattedDish | FormattedDrink; // Use the enriched types from menu.ts
    selectedSizes: { [key: string]: string }; // Tracks selected size for drinks
    selectedCuisson: { [key: string]: string }; // Tracks selected cuisson for dishes
    selectedIngredients: { [key: string]: string }; // Tracks selected ingredient for drinks with choose_one mode
    // Callback for when a drink size selection changes
    handleSizeChange: (itemId: string, size: string) => void;
    // Callback for when a dish cuisson selection changes
    handleCuissonChange: (itemId: string, cuissonEnglishName: string) => void;
    // Callback for when a drink ingredient selection changes
    handleIngredientChange: (itemId: string, ingredientName: string) => void;
    // Callback for adding an item to the cart, now accepts options
    handleAddItem: (item: FormattedDish | FormattedDrink, options?: { [key: string]: string }) => void;
    // Optional: offline mode disables add to cart button
    offlineMode?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = React.memo(({
    item,
    selectedSizes,
    selectedCuisson,
    selectedIngredients,
    handleSizeChange,
    handleCuissonChange,
    handleIngredientChange,
    handleAddItem,
    offlineMode = false
}) => {
    // Determine if the current item is a dish for type-specific rendering
    const isDish = item.type === 'dish';
    // Check if a dish has associated cuisson options
    const hasCuissonOptions = isDish && (item as FormattedDish).cuissons && (item as FormattedDish).cuissons.length > 0;
    // Check if a drink requires ingredient selection
    const hasIngredientSelection = !isDish && (item as FormattedDrink).selection_mode === 'choose_one' && (item as FormattedDrink).ingredients && (item as FormattedDrink).ingredients.length > 0;

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

    // Determine the currently selected cuisson for a dish, defaulting to Medium if available, otherwise first option
    const currentCuisson = selectedCuisson[item.id] || (hasCuissonOptions ?
        ((item as FormattedDish).cuissons.find(c => c.english_name === 'Medium')?.english_name ||
         (item as FormattedDish).cuissons[0]?.english_name) : '');
    // Determine the currently selected size for a drink, defaulting to the first option if available
    const currentSize = selectedSizes[item.id] || (!isDish && (item as FormattedDrink).availableSizes[0]?.size || '');
    // Determine the currently selected ingredient for a drink, defaulting to the first option if available
    const currentIngredient = selectedIngredients[item.id] || (hasIngredientSelection ? (item as FormattedDrink).ingredients[0]?.name : '');

    // Function to handle adding the item to the cart, including selected options
    const handleAddToCartClick = () => {
        const options: { [key: string]: string } = {};
        if (hasCuissonOptions) {
            options.cuisson = currentCuisson; // Add selected cuisson to options
        }
        if (!isDish) {
            options.size = currentSize; // Add selected size to options for drinks
        }
        if (hasIngredientSelection) {
            options.ingredient = currentIngredient; // Add selected ingredient to options for drinks
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
                        {hasIngredientSelection && ( // Render ingredient select if drink has choose_one mode
                            <select
                                value={currentIngredient}
                                onChange={(e) => handleIngredientChange(item.id, e.target.value)}
                                className="mt-2 p-1 border rounded"
                            >
                                {(item as FormattedDrink).ingredients.map((ingredient) => (
                                    <option key={ingredient.id} value={ingredient.name}>
                                        {ingredient.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        {(item as FormattedDrink).availableSizes.length > 1 ? (
                            // Show dropdown if multiple sizes available
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
                        ) : (item as FormattedDrink).availableSizes.length === 1 ? (
                            // Show size as text if only one size available
                            <p className="text-sm text-gray-700 mt-1">
                                {(item as FormattedDrink).availableSizes[0].size}
                            </p>
                        ) : null}
                        {!hasIngredientSelection && (item as FormattedDrink).ingredients.length > 0 && ( // Display ingredients for info if not choose_one mode
                            <p className="text-sm text-gray-600 mt-1">
                                Ingredients: {(item as FormattedDrink).ingredients.map(i => i.name).join(', ')}
                            </p>
                        )}
                        <p>€{displayPrice}</p>
                    </div>
                )}
            </div>
            {!offlineMode && (
                <button
                    onClick={handleAddToCartClick}
                    className="add-to-cart-button"
                >
                    Add to Cart
                </button>
            )}
        </div>
    );
});

export default MenuItem;