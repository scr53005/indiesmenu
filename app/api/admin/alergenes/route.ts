import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch all allergens
export async function GET() {
  try {
    const alergenes = await prisma.alergenes.findMany({
      orderBy: { name_en: 'asc' },
    });

    return NextResponse.json(alergenes);
  } catch (error) {
    console.error('Error fetching allergens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch allergens' },
      { status: 500 }
    );
  }
}
