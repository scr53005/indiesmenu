import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { invalidateMenuCache } from '@/lib/data/menu';

const prisma = new PrismaClient();

// GET - Fetch dishes (optionally by category)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    let dishes;

    if (category) {
      // Fetch dishes in specific category
      dishes = await prisma.dishes.findMany({
        where: {
          categories_dishes: {
            some: {
              categories: {
                name: category,
              },
            },
          },
        },
        orderBy: {
          position: 'asc',
        },
      });
    } else {
      // Fetch all dishes
      dishes = await prisma.dishes.findMany({
        orderBy: {
          name: 'asc',
        },
      });
    }

    return NextResponse.json(dishes);
  } catch (error) {
    console.error('Error fetching dishes:', error);
    return NextResponse.json({ error: 'Failed to fetch dishes' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new dish
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, price_eur, category, position, active } = body;

    if (!name || !price_eur || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price_eur, category' },
        { status: 400 }
      );
    }

    // Get category ID
    const categoryRecord = await prisma.categories.findFirst({
      where: { name: category },
    });

    if (!categoryRecord) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Create dish
    const newDish = await prisma.dishes.create({
      data: {
        name,
        description: description || null,
        price_eur: parseFloat(price_eur),
        position: position || 0,
        active: active !== undefined ? active : true,
        sold_out: false,
      },
    });

    // Link to category
    await prisma.categories_dishes.create({
      data: {
        dish_id: newDish.dish_id,
        category_id: categoryRecord.category_id,
      },
    });

    // Invalidate menu cache so new dish appears immediately
    invalidateMenuCache();
    console.log(`[ADMIN] Created dish ${newDish.dish_id}, cache invalidated`);

    return NextResponse.json(newDish, { status: 201 });
  } catch (error) {
    console.error('Error creating dish:', error);
    return NextResponse.json({ error: 'Failed to create dish' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
