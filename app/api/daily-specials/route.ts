import { NextResponse } from 'next/server';
import { PrismaClient, dishes } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Fetch active SUGGESTION dishes
    const suggestions = await prisma.dishes.findMany({
      where: {
        active: true,
        categories_dishes: {
          some: {
            categories: {
              name: 'SUGGESTION',
            },
          },
        },
      },
      orderBy: {
        position: 'asc',
      },
    });

    // Fetch active PLAT DU JOUR dishes
    const platsDuJour = await prisma.dishes.findMany({
      where: {
        active: true,
        categories_dishes: {
          some: {
            categories: {
              name: 'PLAT DU JOUR',
            },
          },
        },
      },
      orderBy: {
        position: 'asc',
      },
    });

    // Fetch soupe du moment dishes (small and large)
    // Get category first
    const soupeCategory = await prisma.categories.findFirst({
      where: {
        name: {
          contains: 'soupe',
          mode: 'insensitive',
        },
      },
    });

    let soupes: dishes[] = [];
    if (soupeCategory) {
      soupes = await prisma.dishes.findMany({
        where: {
          active: true,
          categories_dishes: {
            some: {
              category_id: soupeCategory.category_id,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });
    }

    return NextResponse.json({
      suggestions,
      platsDuJour,
      soupes,
    });
  } catch (error) {
    console.error('Error fetching daily specials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily specials' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
