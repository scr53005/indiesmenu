// indiesmenu/lib/data/menu.ts

import { PrismaClient } from '@prisma/client';

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
  categoryIds: number[];
  // hasCuisson?: boolean; // Optional, only for dishes that have cuisson options
  // availableCuisson?: { en: string; fr: string; }[]; // Optional, only for dishes that have cuisson options
  cuissons: FormattedCuisson[]; // NEW: Associated cuissons for the dish
  ingredients: FormattedIngredient[]; // NEW: Associated ingredients for the dish
  image?: string;
};

export type FormattedDrink = {
  id: string;
  name: string;
  type: 'drink';
  availableSizes: { size: string; price: string; }[];
  categoryIds: number[];
  image?: string;
  ingredients: FormattedIngredient[]; // NEW: Associated ingredients for the drink
};

export type MenuItem = FormattedDish | FormattedDrink;

export type MenuData = {
  categories: any[]; // You might want to define a more specific type for categories here
  dishes: FormattedDish[];
  drinks: FormattedDrink[];
  cuissons: FormattedCuisson[]; // NEW: Global list of all cuissons
  ingredients: FormattedIngredient[]; // NEW: Global list of all ingredients 
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
      orderBy: {
        name: 'asc', // Order categories alphabetically
      },
    });

    // Fetch dishes and drinks separately to include their categories (as needed for formatting)
    const dishes = await prisma.dishes.findMany({
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
          price: ds.price_eur.toFixed(2),
        })),
        categoryIds: drink.categories_drinks.map(cd => cd.category_id),
        image: drink.image || undefined,
        ingredients: drink.drinks_ingredients.map(di => ({ // Map associated ingredients
          id: di.ingredients.ingredient_id,
          name: di.ingredients.name,
        })),        
      });
    });

    // Format dishes for frontend
    const formattedDishes: FormattedDish[] = dishes.map((dish) => ({
      id: `dish-${dish.dish_id}`,
      name: dish.name,
      type: 'dish',
      price: dish.price_eur.toFixed(2),
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

    return {
      categories,
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
    };

  } finally {
    // Keep prisma.$disconnect() here as this is the "core" logic function
    await prisma.$disconnect();
  }
}