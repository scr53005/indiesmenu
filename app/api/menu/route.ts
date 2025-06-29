// indiesmenu-backend/app/api/menu/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
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

    // Fetch dishes and drinks separately to include their categories    
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
    // Create a map for quick lookup of drinks by their ID
    const formattedDrinks = new Map<number, {
      id: string;
      name: string;
      type: 'drink';
      availableSizes: { size: string; price: string; }[]; // Renamed to clearly indicate all sizes are here
      categoryIds: number[]; // Store category IDs for easy filtering
    }>();    

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
      });
    });

      // Map drinks for the current category
      /*const drinks = categories.categories_drinks.map((cd) => ({
        id: `drink-${cd.drinks.drink_id}`, // Prefix with 'drink-' for unique frontend IDs
        name: cd.drinks.name,
        type: 'drink',
        description: cd.drinks.description || '', // Ensure description is a string
        sizes: cd.drinks.drink_sizes.map((ds) => ({
          size: ds.size,
          // Convert Decimal price to string, ensuring 2 decimal places
          price: ds.price_eur.toFixed(2),
        })),
        // Add any other drink-specific fields needed by the frontend
      }));*/

    return NextResponse.json({ categories, dishes, drinks }, {
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3030',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3030',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}