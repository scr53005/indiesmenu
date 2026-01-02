// API endpoint to sync transfers from merchant-hub Redis to local database
// This is the ONLY place that reads from Redis and ACKs
// Called periodically by cron or by the admin page

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getMerchantHubUrl(): string {
  return process.env.NEXT_PUBLIC_MERCHANT_HUB_URL || 'https://merchant-hub-theta.vercel.app';
}

export async function POST() {
  const merchantHubUrl = getMerchantHubUrl().replace(/\/$/, '');
  const consumerId = `sync-${Date.now()}`;

  try {
    // 1. Consume transfers from merchant-hub Redis Stream
    // NOTE: Polling is handled separately by the page via /api/poll (only if this page is the elected poller)
    const consumeRes = await fetch(
      `${merchantHubUrl}/api/transfers/consume?restaurantId=indies&consumerId=${consumerId}&count=50`
    );

    if (!consumeRes.ok) {
      throw new Error(`Failed to consume from merchant-hub: ${consumeRes.statusText}`);
    }

    const data = await consumeRes.json();

    if (!data.transfers || data.transfers.length === 0) {
      return NextResponse.json({
        message: 'No new transfers',
        synced: 0,
        pending: data.pending || 0
      });
    }

    console.log(`[SYNC] Received ${data.transfers.length} transfers from merchant-hub`);

    // 2. Insert each transfer into local DB
    const messagesToAck: string[] = [];
    let insertedCount = 0;

    for (const transfer of data.transfers) {
      try {
        // Check if already exists
        const existing = await prisma.transfers.findUnique({
          where: { id: BigInt(transfer.id) }
        });

        if (!existing) {
          // Insert new transfer
          await prisma.transfers.create({
            data: {
              id: BigInt(transfer.id),
              from_account: transfer.from_account,
              amount: transfer.amount,
              symbol: transfer.symbol,
              memo: transfer.memo,
              parsed_memo: transfer.memo, // Will be hydrated by the display layer
              fulfilled: false,
              received_at: transfer.received_at ? new Date(transfer.received_at) : new Date(),
            },
          });
          console.log(`[SYNC] Inserted transfer ${transfer.id}`);
          insertedCount++;
        } else {
          console.log(`[SYNC] Transfer ${transfer.id} already exists`);
        }

        // Mark for ACK (whether new or existing)
        messagesToAck.push(transfer.messageId);

      } catch (err: any) {
        console.error(`[SYNC] Error processing transfer ${transfer.id}:`, err.message);
        // Don't ACK this one - it will stay pending in Redis
      }
    }

    // 3. ACK successfully processed messages
    if (messagesToAck.length > 0) {
      try {
        const ackRes = await fetch(`${merchantHubUrl}/api/transfers/ack`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: 'indies',
            messageIds: messagesToAck,
          }),
        });

        if (ackRes.ok) {
          const ackData = await ackRes.json();
          console.log(`[SYNC] ACKed ${ackData.acknowledged}/${messagesToAck.length} messages`);
        } else {
          console.error(`[SYNC] ACK failed:`, await ackRes.text());
        }
      } catch (err) {
        console.error('[SYNC] Failed to ACK messages:', err);
      }
    }

    return NextResponse.json({
      message: 'Sync completed',
      received: data.transfers.length,
      inserted: insertedCount,
      acked: messagesToAck.length,
    });

  } catch (error: any) {
    console.error('[SYNC] Error:', error.message);
    return NextResponse.json(
      { error: `Sync failed: ${error.message}` },
      { status: 500 }
    );
  }
}
