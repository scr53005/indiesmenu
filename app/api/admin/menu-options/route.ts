import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { menuError } from '@/lib/admin/menu-response';

export async function GET() {
  try {
    const [categories, ingredients, cuissons] = await Promise.all([
      prisma.categories.findMany({ orderBy: { name: 'asc' } }),
      prisma.ingredients.findMany({
        orderBy: { name: 'asc' },
        include: { ingredients_alergenes: { include: { alergenes: true } } },
      }),
      prisma.cuisson.findMany({ orderBy: { french_name: 'asc' } }),
    ]);
    return NextResponse.json({ categories, ingredients, cuissons });
  } catch (error) { return menuError(error); }
}
