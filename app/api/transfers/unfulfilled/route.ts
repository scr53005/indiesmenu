// API endpoint to get unfulfilled transfers from the database
// Called by current_orders page on mount to show existing pending orders

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCachedMenuData, type MenuData } from '@/lib/data/menu';
import { hydrateMemo, type HydratedOrderLine } from '@/lib/utils';

const prisma = new PrismaClient();

function getOrderContent(memo: string | null | undefined): string {
  const safeMemo = memo || '';
  const tableIndex = safeMemo.lastIndexOf('TABLE ');
  return tableIndex !== -1 ? safeMemo.substring(0, tableIndex).trim() : safeMemo;
}

function parseStoredMemo(parsedMemo: string | null): HydratedOrderLine[] | string | null {
  if (!parsedMemo) return null;

  try {
    const parsed = JSON.parse(parsedMemo);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Stored parsed_memo is often the raw memo string for legacy/current orders.
  }

  return parsedMemo;
}

function hydrateForResponse(
  memo: string | null,
  storedParsedMemo: string | null,
  menuData: MenuData | null,
): HydratedOrderLine[] | string | null {
  const orderContent = getOrderContent(memo);

  if (menuData) {
    try {
      return hydrateMemo(orderContent, menuData);
    } catch (error) {
      console.error(`[UNFULFILLED] Failed to hydrate memo "${memo}":`, error);
    }
  }

  return parseStoredMemo(storedParsedMemo) || orderContent;
}

export async function GET() {
  try {
    let menuData: MenuData | null = null;
    try {
      menuData = await getCachedMenuData();
    } catch (error) {
      console.error('[UNFULFILLED] Failed to load menu data for server-side hydration:', error);
    }

    const unfulfilledTransfers = await prisma.transfers.findMany({
      where: { fulfilled: false },
      select: {
        id: true,
        from_account: true,
        to_account: true,
        amount: true,
        symbol: true,
        memo: true,
        parsed_memo: true,
        received_at: true,
      },
      orderBy: { id: 'desc' },
      take: 50,
    });

    const formatted = unfulfilledTransfers.map(t => ({
      id: t.id.toString(),
      from_account: t.from_account,
      to_account: t.to_account,
      amount: t.amount,
      symbol: t.symbol,
      memo: t.memo,
      parsedMemo: hydrateForResponse(t.memo, t.parsed_memo, menuData),
      received_at: t.received_at ? t.received_at.toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ transfers: formatted });
  } catch (error: any) {
    console.error('Error fetching unfulfilled transfers:', error.message);
    return NextResponse.json(
      { error: `Failed to fetch unfulfilled transfers: ${error.message}` },
      { status: 500 }
    );
  }
}
