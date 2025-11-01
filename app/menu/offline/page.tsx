'use client';

import { useEffect, useState } from 'react';
import MenuItem from '@/components/MenuItem';
import { MenuData, FormattedDish, FormattedDrink } from '@/lib/data/menu';
import '@/app/globals.css';

interface GroupedCategory<T> {
  id: number;
  name: string;
  items: T[];
}

export default function OfflineMenuPage() {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [groupedDishes, setGroupedDishes] = useState<GroupedCategory<FormattedDish>[]>([]);
  const [groupedDrinks, setGroupedDrinks] = useState<GroupedCategory<FormattedDrink>[]>([]);
  const [activeMenuSection, setActiveMenuSection] = useState<'dishes' | 'drinks' | null>('dishes');
  const [openCategories, setOpenCategories] = useState<Set<number>>(new Set());
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchCachedMenu = async () => {
      try {
        const response = await fetch('/api/menu');
        const data: MenuData = await response.json();
        setMenu(data);
      } catch (error) {
        console.error('Failed to load menu:', error);
      }
    };

    fetchCachedMenu();
  }, []);

  useEffect(() => {
    if (menu) {
      // Filter out SUGGESTION (30) and PLAT DU JOUR (31) and Sauces (26)
      const filteredCategories = menu.categories.filter(
        cat => cat.category_id !== 30 && cat.category_id !== 31 && cat.category_id !== 26
      );

      // Build dishes by category
      const dishesArray: GroupedCategory<FormattedDish>[] = filteredCategories.map(cat => ({
        id: cat.category_id,
        name: cat.name,
        items: menu.dishes
          .filter(dish => dish.categoryIds.includes(cat.category_id))
          .sort((a, b) => {
            if (a.image && !b.image) return -1;
            if (!a.image && b.image) return 1;
            return 0;
          })
      }));

      // Build drinks by category
      const drinksArray: GroupedCategory<FormattedDrink>[] = filteredCategories.map(cat => ({
        id: cat.category_id,
        name: cat.name,
        items: menu.drinks
          .filter(drink => drink.categoryIds.includes(cat.category_id))
          .sort((a, b) => {
            if (a.image && !b.image) return -1;
            if (!a.image && b.image) return 1;
            return 0;
          })
      }));

      const nonEmptyDishes = dishesArray.filter(cat => cat.items.length > 0);
      const nonEmptyDrinks = drinksArray.filter(cat => cat.items.length > 0);

      setGroupedDishes(nonEmptyDishes);
      setGroupedDrinks(nonEmptyDrinks);
    }
  }, [menu]);

  const toggleCategory = (categoryId: number) => {
    setOpenCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  if (!menu) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📡</div>
          <p className="text-xl text-gray-700">Chargement du menu hors ligne...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Offline Warning Banner */}
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-3 shadow-lg">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-semibold text-sm md:text-base">
            {isOnline ? (
              <>
                ✅ Connexion rétablie - <a href="/menu" className="underline">Rafraîchir pour voir le menu complet</a>
              </>
            ) : (
              <>
                📡 Mode hors ligne - Menu permanent uniquement
              </>
            )}
          </p>
          <p className="text-xs opacity-90 mt-1">
            Les plats du jour, suggestions et prix récents ne sont pas affichés
          </p>
        </div>
      </div>

      {/* Menu Selector - Fixed below warning banner */}
      <div className="fixed left-0 right-0 z-[9998] bg-white shadow-md" style={{ top: '60px' }}>
        <div className="flex justify-around items-center py-3">
          <button
            onClick={() => setActiveMenuSection('dishes')}
            className={`flex-1 text-center py-2 mx-2 rounded-lg font-semibold transition-colors ${
              activeMenuSection === 'dishes'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🍽️ Plats
          </button>
          <button
            onClick={() => setActiveMenuSection('drinks')}
            className={`flex-1 text-center py-2 mx-2 rounded-lg font-semibold transition-colors ${
              activeMenuSection === 'drinks'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🍹 Boissons
          </button>
        </div>
      </div>

      {/* Menu Content - with top padding to account for fixed elements */}
      <div className="flex-1 overflow-y-auto" style={{ paddingTop: '130px', paddingBottom: '20px' }}>
        {activeMenuSection === 'dishes' && (
          <div className="menu-section">
            {groupedDishes.map((category) => (
              <div key={category.id} className="category-folder-container">
                <h3 onClick={() => toggleCategory(category.id)} className="category-folder-header">
                  {category.name}
                  <span className="toggle-icon">
                    {openCategories.has(category.id) ? '▲' : '▼'}
                  </span>
                </h3>
                {openCategories.has(category.id) && (
                  <div className="category-items-grid">
                    {category.items.map((item: FormattedDish) => (
                      <MenuItem
                        key={item.id}
                        item={item}
                        selectedCuisson={{}}
                        handleCuissonChange={() => {}}
                        handleAddItem={() => {}} // Disabled in offline mode
                        selectedSizes={{}}
                        handleSizeChange={() => {}}
                        selectedIngredients={{}}
                        handleIngredientChange={() => {}}
                        offlineMode={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeMenuSection === 'drinks' && (
          <div className="menu-section">
            {groupedDrinks.map((category) => (
              <div key={category.id} className="category-folder-container">
                <h3 onClick={() => toggleCategory(category.id)} className="category-folder-header">
                  {category.name}
                  <span className="toggle-icon">
                    {openCategories.has(category.id) ? '▲' : '▼'}
                  </span>
                </h3>
                {openCategories.has(category.id) && (
                  <div className="category-items-grid">
                    {category.items.map((item: FormattedDrink) => (
                      <MenuItem
                        key={item.id}
                        item={item}
                        selectedSizes={{}}
                        handleSizeChange={() => {}}
                        handleAddItem={() => {}} // Disabled in offline mode
                        selectedCuisson={{}}
                        handleCuissonChange={() => {}}
                        selectedIngredients={{}}
                        handleIngredientChange={() => {}}
                        offlineMode={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Offline Info Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white text-center py-2 text-sm">
        Mode consultation uniquement - Reconnectez-vous pour commander
      </div>
    </div>
  );
}
