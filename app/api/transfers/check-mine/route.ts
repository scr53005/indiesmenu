// Lightweight endpoint for customer-side order confirmation polling.
// Checks if a transfer with a matching memo prefix exists in the transfers table.

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const memoPrefix = searchParams.get('memo_prefix');

    if (!memoPrefix || memoPrefix.length < 5) {
      return NextResponse.json(
        { error: 'memo_prefix parameter is required (min 5 chars)' },
        { status: 400 }
      );
    }

    // Default: look back 60 minutes
    const sinceParam = searchParams.get('since');
    const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60 * 60 * 1000);

    const transfer = await prisma.transfers.findFirst({
      where: {
        memo: { startsWith: memoPrefix },
        received_at: { gte: since },
      },
      orderBy: { received_at: 'desc' },
      select: {
        id: true,
        received_at: true,
        fulfilled: true,
      },
    });

    if (!transfer) {
      console.warn(`[check-mine] No transfer found for prefix="${memoPrefix}" since=${since.toISOString()}`);
      return NextResponse.json({ found: false });
    }

    console.warn(`[check-mine] Found transfer id=${transfer.id} for prefix="${memoPrefix}" fulfilled=${transfer.fulfilled}`);
    return NextResponse.json({
      found: true,
      received_at: transfer.received_at?.toISOString() ?? null,
      fulfilled: transfer.fulfilled ?? false,
    });
  } catch (error: any) {
    console.error('Transfer check-mine error:', error.message);
    return NextResponse.json(
      { error: `Failed to check transfer: ${error.message}` },
      { status: 500 }
    );
  }
}
