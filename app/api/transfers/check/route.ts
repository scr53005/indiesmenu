// Helper endpoint to check if a transfer exists
// Reuses the same Prisma pattern from /api/poll-hbd/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id parameter is required' },
        { status: 400 }
      );
    }

    // Use the same findUnique pattern as poll-hbd (line 48)
    const exists = await prisma.transfers.findUnique({
      where: { id: BigInt(id) }
    });

    return NextResponse.json({ exists: !!exists });
  } catch (error: any) {
    console.error('Transfer check error:', error.message);
    return NextResponse.json(
      { error: `Failed to check transfer: ${error.message}` },
      { status: 500 }
    );
  }
}
