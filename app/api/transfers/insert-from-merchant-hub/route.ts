// Helper endpoint to insert a transfer from merchant-hub
// Reuses the EXACT same Prisma insert pattern from /api/poll-hbd/route.ts (lines 51-62)

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, from_account, amount, symbol, memo, parsed_memo, received_at } = body;

    if (!id || !from_account || !amount || !symbol || !memo) {
      return NextResponse.json(
        { error: 'Missing required fields: id, from_account, amount, symbol, memo' },
        { status: 400 }
      );
    }

    // Use the EXACT same create pattern as poll-hbd (lines 51-62)
    await prisma.transfers.create({
      data: {
        id: BigInt(id),
        from_account,
        amount,
        symbol,
        memo,
        parsed_memo: parsed_memo || memo,
        fulfilled: false,
        received_at: received_at ? new Date(received_at) : new Date(),
      },
    });

    console.log('[INSERT FROM MERCHANT-HUB] Successfully inserted transfer:', id);

    return NextResponse.json({
      success: true,
      message: 'Transfer inserted successfully'
    });
  } catch (error: any) {
    console.error('[INSERT FROM MERCHANT-HUB] Error:', error.message);
    return NextResponse.json(
      { error: `Failed to insert transfer: ${error.message}` },
      { status: 500 }
    );
  }
}
