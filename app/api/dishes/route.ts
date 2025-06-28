// app/api/dishes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'; // Adjust to your Prisma output path

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const dishes = await prisma.dishes.findMany({
      //include: { categories: true },
    });
    return NextResponse.json(dishes, {
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:3030', // Front-end origin
        'Access-Control-Allow-Methods': 'GET', // Adjust as needed
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}