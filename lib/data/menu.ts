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
  discount?: number; // Optional discount field
  categoryIds: number[];
  cuissons: FormattedCuisson[]; 
  ingredients: FormattedIngredient[]; 
  image?: string;
};

export type FormattedDrink = {
  id: string;
  name: string;
  type: 'drink';
  availableSizes: { size: string; price: string; discount?: number }[];
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

    // NEW: Fetch all cuissons and ingredients globally
    const allCuissons = await prisma.cuisson.findMany({
      orderBy: { english_name: 'asc' } // Order them for consistent display
    });
    const allIngredients = await prisma.ingredients.findMany({
      orderBy: { name: 'asc' } // Order them for consistent display
    });

    // --- Prepare drinks for frontend format ---
    const formattedDrinks = new Map<number, FormattedDrink>();

    drinks.forEach((drink) => {
      formattedDrinks.set(drink.drink_id, {
        id: `drink-${drink.drink_id}`,
        name: drink.name,
        type: 'drink',
        availableSizes: drink.drink_sizes.map((ds) => ({
          size: ds.size,
          price: (ds.price_eur.toNumber() * (ds.discount?? 1.0)).toFixed(2),
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