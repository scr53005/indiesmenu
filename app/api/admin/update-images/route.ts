// API endpoint for updating dish and drink images
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type ImageAssignment = {
  imageName: string; // e.g., "pulledpork.jpg"
  itemType: 'dish' | 'drink';
  itemId: number;
};

/**
 * POST /api/admin/update-images
 * Body: { assignments: ImageAssignment[] }
 * Updates dish/drink image fields with the specified image file names
 */
export async function POST(req: NextRequest) {
  try {
    const { assignments } = await req.json();

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: 'assignments must be a non-empty array' },
        { status: 400 }
      );
    }

    console.log('[UPDATE IMAGES] Processing assignments:', assignments);

    const results = {
      dishesUpdated: 0,
      drinksUpdated: 0,
      errors: [] as string[],
    };

    // Process updates in a transaction
    await prisma.$transaction(async (tx) => {
      for (const assignment of assignments) {
        const { imageName, itemType, itemId } = assignment;

        try {
          if (itemType === 'dish') {
            await tx.dishes.update({
              where: { dish_id: itemId },
              data: { image: imageName },
            });
            results.dishesUpdated++;
            console.log(`[UPDATE IMAGES] ✅ Updated dish ${itemId} with image: ${imageName}`);
          } else if (itemType === 'drink') {
            await tx.drinks.update({
              where: { drink_id: itemId },
              data: { image: imageName },
            });
            results.drinksUpdated++;
            console.log(`[UPDATE IMAGES] ✅ Updated drink ${itemId} with image: ${imageName}`);
          } else {
            results.errors.push(`Invalid item type: ${itemType}`);
          }
        } catch (error: any) {
          const errorMsg = `Failed to update ${itemType} ${itemId}: ${error.message}`;
          console.error('[UPDATE IMAGES]', errorMsg);
          results.errors.push(errorMsg);
        }
      }
    });

    console.log('[UPDATE IMAGES] Results:', results);

    return NextResponse.json({
      success: true,
      ...results,
    });

  } catch (error: any) {
    console.error('[UPDATE IMAGES] Transaction error:', error);
    return NextResponse.json(
      { error: 'Failed to update images', message: error.message },
      { status: 500 }
    );
  }
}
