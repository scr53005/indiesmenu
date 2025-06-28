import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const body = await request.json();
  const transferId = body.transferId || body.id; // Use transferId or id from the request body
  try { 
    // Validate transferId
    if (!transferId || isNaN(transferId)) {
      console.log('Invalid transfer ID:', transferId);
      return NextResponse.json({ error: 'Invalid transfer ID' }, { status: 400 });
    }

     // Check if transfer exists
    const transfer = await prisma.transfers.findUnique({
      where: { id: BigInt(transferId) },
    });

    console.log('Database check result:', transfer);

    if (!transfer) {
      console.log(`No transfer found for ID: ${transferId}`);
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }   

    // Update transfer
    const updatedTransfer = await prisma.transfers.update({
      where: {
        id: BigInt(transferId),
        fulfilled: false, // Only update if not fulfilled
      },
      data: {
        fulfilled: true,
        fulfilled_at: new Date(),
      },
      select: { id: true }, // Return only the id
    });

    console.log('Update result:', updatedTransfer);

    console.log(`Successfully fulfilled transfer ID: ${transferId}`);
    return NextResponse.json({ message: 'Transfer fulfilled' }, { status: 200 });
  } catch (error: any) {
    console.error('Fulfill error:', error.message, error.stack);
    if (error.code === 'P2025') { // Prisma error for no record found or update failed
      console.log(`No rows updated for ID: ${transferId}`);
      return NextResponse.json({ error: 'Transfer not found or already fulfilled' }, { status: 404 });
    }
    return NextResponse.json({ error: `Failed to fulfill transfer: ${error.message}` }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:3030',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
  
// This OPTIONS handler is for CORS preflight requests
// It allows the browser to check if the POST request is allowed from the specified origin
