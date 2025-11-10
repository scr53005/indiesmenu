// indiesmenu/lib/data/menu.ts

import { PrismaClient } from '@prisma/client';
// import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export type FormattedCuisson = {
  id: number;
  english_name: string;
  french_name: string;
};

export type FormattedIngredient = {
  id: number;
  name: string;
};

// Define types for the formatted data for better type safety
// These should ideally match what your frontend expects
export type FormattedDish = {
  id: string;
  name: string;
  type: 'dish';
  price: string; // Formatted as string (e.g., "15.50")
  discount: number; // Discount multiplier (1.0 = no discount, 0.9 = 10% off)
  categoryIds: number[];
  cuissons: FormattedCuisson[];
  ingredients: FormattedIngredient[];
  image?: string;
};

export type FormattedDrink = {
  id: string;
  name: string;
  type: 'drink';
  availableSizes: { size: string; price: string; discount: number }[]; // Discount multiplier (1.0 = no discount, 0.9 = 10% off)
  categoryIds: number[];
  image?: string;
  ingredients: FormattedIngredient[]; // NEW: Associated ingredients for the drink
  selection_mode?: string; // 'choose_one' or null - indicates if customer must select an ingredient
};

export type MenuItem = FormattedDish | FormattedDrink;

export type MenuData = {
  categories: any[]; // You might want to define a more specific type for categories here
  dishes: FormattedDish[];
  drinks: FormattedDrink[];
  cuissons: FormattedCuisson[]; // NEW: Global list of all cuissons
  ingredients: FormattedIngredient[]; // NEW: Global list of all ingredients 
  conversion_rate: number; // Conversion rate for prices
};

export async function getMenuData(): Promise<MenuData> {
  try {
    // Fetch categories with nested dishes and drinks
    const categories = await prisma.categories.findMany({
      include: {
        categories_dishes: {
          include: {
            dishes: true, // Include the actual dish details
          },
        },
        categories_drinks: {
          include: {
            drinks: {
              include: {
                drink_sizes: true, // Include drink sizes for each drink
              },
            },
          },
        },
      },
    });

    // Custom ordering: hardcoded category order by category_id
    // Order: SUGGESTION(30), PLAT DU JOUR(31), PARTAGER(20), FINGER FOOD(21),
    //        SALADES(22), POISSONS(23), SOUPE DU MOMENT(24), BURGERS(25),
    //        VIANDES(27), DESSERTS(28), KIDS MENU(29)
    const categoryOrder = [30, 31, 20, 21, 22, 23, 24, 25, 27, 28, 29];
    const sortedCategories = categories.sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a.category_id);
      const bIndex = categoryOrder.indexOf(b.category_id);

      // If both are in the order list, sort by their position
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      // If only a is in the list, it comes first
      if (aIndex !== -1) return -1;
      // If only b is in the list, it comes first
      if (bIndex !== -1) return 1;
      // Otherwise, maintain original order (shouldn't happen if all categories are listed)
      return 0;
    });

    // Fetch dishes and drinks separately to include their categories (as needed for formatting)
    // Filter to only include active dishes that are not sold out
    const dishes = await prisma.dishes.findMany({
      where: {
        active: true,
        sold_out: false,
      },
      include: {
        categories_dishes: {
          include: {
            categories: true,
          },
        },
        dishes_cuisson: { // NEW: Include related cuisson entries
          include: {
            cuisson: true, // Include the actual cuisson details
          },
        },
        dishes_ingredients: { // NEW: Include related ingredient entries
          include: {
            ingredients: true, // Include the actual ingredient details
          },
        },
      },
    });

    const drinks = await prisma.drinks.findMany({
      include: {
        categories_drinks: {
          include: {
            categories: true,
          },
        },
        drink_sizes: true, // Include drink sizes for each drink
        drinks_ingredients: { // NEW: Include related ingredient entries
          include: {
            ingredients: true, // Include the actual ingredient details
          },
        },        
      },
    });

    // NEW: Fetch all cuissons and ingredients globally (with error handling)
    let allCuissons: Array<{ cuisson_id: number; english_name: string; french_name: string }> = [];
    let allIngredients: Array<{ ingredient_id: number; name: string }> = [];

    try {
      allCuissons = await prisma.cuisson.findMany({
        orderBy: { english_name: 'asc' }
      });
    } catch (error) {
      console.error('[MENU] Error fetching cuissons from database (non-fatal):', error);
      // Load from fallback file
      try {
        const fallbackCuissons = await import('./fallback-cuissons.json');
        allCuissons = fallbackCuissons.default.map(c => ({
          cuisson_id: c.id,
          english_name: c.english_name,
          french_name: c.french_name
        }));
        console.log('[MENU] Loaded cuissons from fallback file');
      } catch (fallbackError) {
        console.error('[MENU] Failed to load fallback cuissons:', fallbackError);
        // Continue with empty array as last resort
      }
    }

    try {
      allIngredients = await prisma.ingredients.findMany({
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error('[MENU] Error fetching ingredients from database (non-fatal):', error);
      // Load from fallback file
      try {
        const fallbackIngredients = await import('./fallback-ingredients.json');
        allIngredients = fallbackIngredients.default.map(i => ({
          ingredient_id: i.id,
          name: i.name
        }));
        console.log('[MENU] Loaded ingredients from fallback file');
      } catch (fallbackError) {
        console.error('[MENU] Failed to load fallback ingredients:', fallbackError);
        // Continue with empty array as last resort
      }
    }

    // --- Prepare drinks for frontend format ---
    const formattedDrinks = new Map<number, FormattedDrink>();

    drinks.forEach((drink) => {
      formattedDrinks.set(drink.drink_id, {
        id: `drink-${drink.drink_id}`,
        name: drink.name,
        type: 'drink',
        availableSizes: drink.drink_sizes.map((ds) => ({
          size: ds.size,
          price: (ds.price_eur.toNumber() * (ds.discount ?? 1.0)).toFixed(2),
          discount: ds.discount ?? 1.0, // Pass discount to frontend (1.0 = no discount)
        })),
        categoryIds: drink.categories_drinks.map(cd => cd.category_id),
        image: drink.image || undefined,
        ingredients: drink.drinks_ingredients.map(di => ({ // Map associated ingredients
          id: di.ingredients.ingredient_id,
          name: di.ingredients.name,
        })),
        selection_mode: drink.selection_mode || undefined,
      });
    });

    // Format dishes for frontend
    const formattedDishes: FormattedDish[] = dishes.map((dish) => ({
      id: `dish-${dish.dish_id}`,
      name: dish.name,
      type: 'dish',
      price: (dish.price_eur.toNumber() * (dish.discount ?? 1.0)).toFixed(2), // Apply discount if available
      discount: dish.discount ?? 1.0, // Pass discount to frontend (1.0 = no discount)
      categoryIds: dish.categories_dishes.map((cd) => cd.category_id),
      image: dish.image || undefined,
      cuissons: dish.dishes_cuisson.map(dc => ({ // Map associated cuissons
        id: dc.cuisson.cuisson_id,
        english_name: dc.cuisson.english_name,
        french_name: dc.cuisson.french_name,
      })),
      ingredients: dish.dishes_ingredients.map(di => ({ // Map associated ingredients
        id: di.ingredients.ingredient_id,
        name: di.ingredients.name,
      })),
    }));

    // let conversionRate = 1.0; // Set a default conversion rate, if applicable
    const conversionRate = await prisma.currency_conversion.findFirst({
      orderBy: {
        date: 'desc', // Sort by date in descending order to get the most recent
      },
      select: {
        conversion_rate: true, // Only select the conversion_rate field
      },
    });

    return {
      categories: sortedCategories,
      dishes: formattedDishes,
      drinks: Array.from(formattedDrinks.values()),
      cuissons: allCuissons.map(c => ({ // Format global cuissons list
        id: c.cuisson_id,
        english_name: c.english_name,
        french_name: c.french_name,
      })),
      ingredients: allIngredients.map(i => ({ // Format global ingredients list
        id: i.ingredient_id,
        name: i.name,
      })),
      conversion_rate: conversionRate ? conversionRate.conversion_rate.toNumber(): 1.0000, // Include conversion rate if available
    };

  } finally {
    // Keep prisma.$disconnect() here as this is the "core" logic function
    await prisma.$disconnect();
  }
}

// ===================================
// CACHING LAYER
// ===================================

let menuCache: {
  data: MenuData | null;
  timestamp: number;
  isStale: boolean;
} = {
  data: null,
  timestamp: 0,
  isStale: true,
};

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
const STALE_WHILE_REVALIDATE_TTL = 24 * 60 * 60 * 1000; // 24 hours - serve stale while fetching fresh

/**
 * Get menu data with server-side caching
 * - Cache revalidates every 7 days
 * - Serves stale data while revalidating in background
 * - Never throws errors (returns last good data on failure)
 */
export async function getCachedMenuData(): Promise<MenuData> {
  const now = Date.now();
  const cacheAge = now - menuCache.timestamp;

  // Case 1: Cache is fresh (< 7 days old)
  if (menuCache.data && cacheAge < CACHE_TTL) {
    console.log(`[MENU CACHE] Serving fresh cache (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
    return menuCache.data;
  }

  // Case 2: Cache is stale but not too old (7-31 days) - serve stale, revalidate in background
  if (menuCache.data && cacheAge < STALE_WHILE_REVALIDATE_TTL && !menuCache.isStale) {
    console.log(`[MENU CACHE] Serving stale cache, revalidating in background`);
    menuCache.isStale = true; // Mark as being revalidated

    // Revalidate in background (don't await)
    getMenuData()
      .then((freshData) => {
        menuCache = {
          data: freshData,
          timestamp: Date.now(),
          isStale: false,
        };
        console.log(`[MENU CACHE] Background revalidation successful`);
      })
      .catch((error) => {
        console.error(`[MENU CACHE] Background revalidation failed:`, error);
        menuCache.isStale = false; // Reset flag so we can try again later
      });

    return menuCache.data; // Return stale data immediately
  }

  // Case 3: No cache or cache is very old - fetch fresh data
  console.log(`[MENU CACHE] No cache or cache too old, fetching fresh data`);

  try {
    const freshData = await getMenuData();
    menuCache = {
      data: freshData,
      timestamp: now,
      isStale: false,
    };
    console.log(`[MENU CACHE] Fresh data cached successfully`);
    return freshData;
  } catch (error) {
    console.error(`[MENU CACHE] Failed to fetch fresh data:`, error);

    // If we have any cached data (even if very old), return it as fallback
    if (menuCache.data) {
      console.warn(`[MENU CACHE] Returning stale cache due to error (age: ${Math.round(cacheAge / 1000 / 60 / 60)} hours)`);
      return menuCache.data;
    }

    // No cache and fetch failed - throw error (will be handled by route handler)
    throw error;
  }
}