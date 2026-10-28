import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseMenuInput } from '@/lib/admin/menu';
import { drinkInclude, saveDrink } from '@/lib/admin/menu-store';
import { menuError } from '@/lib/admin/menu-response';

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category');
    return NextResponse.json(await prisma.drinks.findMany({
      where: category ? { categories_drinks: { some: { categories: { name: category } } } } : undefined,
      include: drinkInclude,
      orderBy: { name: 'asc' },
    }));
  } catch (error) { return menuError(error); }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(await saveDrink(parseMenuInput(await request.json(), 'drink', true)), { status: 201 });
  } catch (error) { return menuError(error); }
}
