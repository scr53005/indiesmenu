import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseMenuInput } from '@/lib/admin/menu';
import { dishInclude, saveDish } from '@/lib/admin/menu-store';
import { menuError } from '@/lib/admin/menu-response';

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category');
    return NextResponse.json(await prisma.dishes.findMany({
      where: category ? { categories_dishes: { some: { categories: { name: category } } } } : undefined,
      include: dishInclude,
      orderBy: category ? { position: 'asc' } : { name: 'asc' },
    }));
  } catch (error) { return menuError(error); }
}

export async function POST(request: NextRequest) {
  try {
    return NextResponse.json(await saveDish(parseMenuInput(await request.json(), 'dish', true)), { status: 201 });
  } catch (error) { return menuError(error); }
}
