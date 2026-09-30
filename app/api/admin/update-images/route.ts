import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { invalidateMenuCache } from '@/lib/data/menu';
import { menuImagePublicPath } from '@/lib/menuImageFiles';

type ImageAssignment = {
  imageName: string;
  itemType: 'dish' | 'drink';
  itemId: number;
};

type ValidatedAssignment = ImageAssignment & {
  imagePath: string;
};

function validateAssignments(value: unknown): ValidatedAssignment[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const validated: ValidatedAssignment[] = [];
  const targetKeys = new Set<string>();

  for (const assignment of value) {
    if (!assignment || typeof assignment !== 'object') return null;

    const { imageName, itemType, itemId } = assignment as Partial<ImageAssignment>;
    if (typeof imageName !== 'string') return null;

    const imagePath = menuImagePublicPath(imageName);

    if (!imagePath ||
        (itemType !== 'dish' && itemType !== 'drink') ||
        !Number.isInteger(itemId) ||
        (itemId as number) <= 0) {
      return null;
    }

    const targetKey = `${itemType}:${itemId}`;
    if (targetKeys.has(targetKey)) return null;
    targetKeys.add(targetKey);

    validated.push({
      imageName,
      imagePath,
      itemType,
      itemId: itemId as number,
    });
  }

  return validated;
}

/** Update dish/drink image paths atomically and make the new menu visible immediately. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const assignments = validateAssignments(body.assignments);

    if (!assignments) {
      return NextResponse.json(
        { error: 'Assignments must contain unique dish/drink targets and valid image filenames' },
        { status: 400 },
      );
    }

    let dishesUpdated = 0;
    let drinksUpdated = 0;

    await prisma.$transaction(async (tx) => {
      for (const assignment of assignments) {
        if (assignment.itemType === 'dish') {
          await tx.dishes.update({
            where: { dish_id: assignment.itemId },
            data: { image: assignment.imagePath },
          });
          dishesUpdated++;
        } else {
          await tx.drinks.update({
            where: { drink_id: assignment.itemId },
            data: { image: assignment.imagePath },
          });
          drinksUpdated++;
        }
      }
    });

    invalidateMenuCache();
    console.warn(
      `[UPDATE IMAGES] Updated ${dishesUpdated} dish(es) and ${drinksUpdated} drink(s); menu cache invalidated`,
    );

    return NextResponse.json({
      success: true,
      dishesUpdated,
      drinksUpdated,
      cacheInvalidated: true,
    });
  } catch (error) {
    console.error('[UPDATE IMAGES] Transaction failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to update images',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
