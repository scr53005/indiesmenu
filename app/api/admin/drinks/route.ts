import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Fetch drinks (optionally by category)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    let drinks;

    if (category) {
      // Fetch drinks in specific category
      drinks = await prisma.drinks.findMany({
        where: {
          categories_drinks: {
            some: {
              categories: {
                name: category,
              },
            },
          },
        },
        include: {
          drink_sizes: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
    } else {
      // Fetch all drinks
      drinks = await prisma.drinks.findMany({
        include: {
          drink_sizes: true,
        },
        orderBy: {
          name: 'asc',
        },
      });
    }

    return NextResponse.json(drinks);
  } catch (error) {
    console.error('Error fetching drinks:', error);
    return NextResponse.json({ error: 'Failed to fetch drinks' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
