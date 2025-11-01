import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PUT - Update dish
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dishId = parseInt(params.id);
    const body = await request.json();
    const { name, description, price_eur, position, active, sold_out } = body;

    const updatedDish = await prisma.dishes.update({
      where: { dish_id: dishId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price_eur !== undefined && { price_eur: parseFloat(price_eur) }),
        ...(position !== undefined && { position }),
        ...(active !== undefined && { active }),
        ...(sold_out !== undefined && { sold_out }),
      },
    });

    return NextResponse.json(updatedDish);
  } catch (error) {
    console.error('Error updating dish:', error);
    return NextResponse.json({ error: 'Failed to update dish' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete dish
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dishId = parseInt(params.id);

    // Delete category relationships first
    await prisma.categories_dishes.deleteMany({
      where: { dish_id: dishId },
    });

    // Delete the dish
    await prisma.dishes.delete({
      where: { dish_id: dishId },
    });

    return NextResponse.json({ message: 'Dish deleted successfully' });
  } catch (error) {
    console.error('Error deleting dish:', error);
    return NextResponse.json({ error: 'Failed to delete dish' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
