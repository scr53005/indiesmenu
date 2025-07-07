// indiesmenu/lib/data/menu.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define types for the formatted data for better type safety
// These should ideally match what your frontend expects
export type FormattedDish = {
  id: string;
  name: string;
  type: 'dish';
  price: string; // Formatted as string (e.g., "15.50")
  categoryIds: number[];
  image?: string;
};

export type FormattedDrink = {
  id: string;
  name: string;
  type: 'drink';
  availableSizes: { size: string; price: string; }[];
  categoryIds: number[];
  image?: string;
};

export type MenuItem = FormattedDish | FormattedDrink;

export type MenuData = {
  categories: any[]; // You might want to define a more specific type for categories here
  dishes: FormattedDish[];
  drinks: FormattedDrink[];
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
      },
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
    }));

    return {
      categories,
      dishes: formattedDishes,
      drinks: Array.from(formattedDrinks.values())
    };

  } finally {
    // Keep prisma.$disconnect() here as this is the "core" logic function
    await prisma.$disconnect();
  }
}