import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all ingredients with their allergen assignments
export async function GET() {
  try {
    const ingredients = await prisma.ingredients.findMany({
      include: {
        ingredients_alergenes: {
          include: {
            alergenes: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(ingredients);
  } catch (error) {
    console.error('Error fetching ingredients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ingredients' },
      { status: 500 }
    );
  }
}

// PUT: Update ingredient's allergen assignments (multiple allergens)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredient_id, alergene_ids } = body;

    if (!ingredient_id) {
      return NextResponse.json(
        { error: 'ingredient_id is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(alergene_ids)) {
      return NextResponse.json(
        { error: 'alergene_ids must be an array' },
        { status: 400 }
      );
    }

    // Delete existing allergen assignments
    await prisma.ingredients_alergenes.deleteMany({
      where: { ingredient_id: parseInt(ingredient_id) },
    });

    // Create new allergen assignments
    if (alergene_ids.length > 0) {
      await prisma.ingredients_alergenes.createMany({
        data: alergene_ids.map((alergene_id) => ({
          ingredient_id: parseInt(ingredient_id),
          alergene_id: parseInt(alergene_id),
        })),
      });
    }

    // Fetch updated ingredient with allergens
    const updatedIngredient = await prisma.ingredients.findUnique({
      where: { ingredient_id: parseInt(ingredient_id) },
      include: {
        ingredients_alergenes: {
          include: {
            alergenes: true,
          },
        },
      },
    });

    console.log(`[ADMIN] Updated ingredient ${ingredient_id} with ${alergene_ids.length} allergen(s)`);

    return NextResponse.json(updatedIngredient);
  } catch (error) {
    console.error('Error updating ingredient allergens:', error);
    return NextResponse.json(
      { error: 'Failed to update ingredient allergens' },
      { status: 500 }
    );
  }
}
