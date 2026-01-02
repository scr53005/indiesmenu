// API endpoint to get unfulfilled transfers from the database
// Called by current_orders page on mount to show existing pending orders

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const unfulfilledTransfers = await prisma.transfers.findMany({
      where: { fulfilled: false },
      select: {
        id: true,
        from_account: true,
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
      amount: t.amount,
      symbol: t.symbol,
      memo: t.memo,
      parsedMemo: t.parsed_memo,
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
