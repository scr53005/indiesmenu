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
        'Access-Control-Allow-Origin': '*', // Front-end origin
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

// This OPTIONS handler is for CORS preflight requests
// It allows the browser to check if the POST request is allowed from the specified origin
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}