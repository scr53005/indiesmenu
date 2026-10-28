import { NextRequest, NextResponse } from 'next/server';
import { parseMenuId, parseMenuInput } from '@/lib/admin/menu';
import { deleteMenuItem, saveDrink } from '@/lib/admin/menu-store';
import { menuError } from '@/lib/admin/menu-response';

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const id = parseMenuId((await params).id);
    return NextResponse.json(await saveDrink(parseMenuInput(await request.json(), 'drink', false), id));
  } catch (error) { return menuError(error); }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    await deleteMenuItem('drink', parseMenuId((await params).id));
    return NextResponse.json({ success: true });
  } catch (error) { return menuError(error); }
}
