// API endpoint to sync transfers from merchant-hub Redis to local database
// This is the ONLY place that reads from Redis and ACKs
// Called periodically by cron or by the admin page

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getMerchantHubUrl(): string {
  return process.env.NEXT_PUBLIC_MERCHANT_HUB_URL || 'https://merchant-hub-theta.vercel.app';
}

// Determine which account to filter by (prod vs dev environment)
function getEnvironmentAccount(): string {
  // Use HIVE_ACCOUNT environment variable if set, otherwise default to production
  const hiveAccount = process.env.HIVE_ACCOUNT || process.env.NEXT_PUBLIC_HIVE_ACCOUNT;

  if (hiveAccount) {
    console.warn(`[SYNC] Using HIVE_ACCOUNT from env: ${hiveAccount}`);
    return hiveAccount;
  }

  // Fallback: Check DATABASE_URL to determine if we're in dev or prod
  const databaseUrl = process.env.DATABASE_URL || '';
  const isDev = databaseUrl.includes('localhost') || databaseUrl.includes('innopaydb');

  const account = isDev ? 'indies-test' : 'indies.cafe';
  console.warn(`[SYNC] Using DATABASE_URL detection: ${account}`);
  return account;
}

// Determine environment label for consumer group separation
function getEnvLabel(account: string): 'prod' | 'dev' {
  return account === 'indies.cafe' ? 'prod' : 'dev';
}

export async function POST() {
  const merchantHubUrl = getMerchantHubUrl().replace(/\/$/, '');
  const environmentAccount = getEnvironmentAccount();
  const env = getEnvLabel(environmentAccount);
  const consumerId = `sync-${env}`; // stable ID per environment (avoids orphan consumers)

  console.warn(`[SYNC] Environment account: ${environmentAccount}, env: ${env}`);

  try {
    // 1. Consume transfers from merchant-hub Redis Stream
    // NOTE: Polling is handled separately by the page via /api/poll (only if this page is the elected poller)
    const consumeRes = await fetch(
      `${merchantHubUrl}/api/transfers/consume?restaurantId=indies&consumerId=${consumerId}&count=50&env=${env}`
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

    console.warn(`[SYNC] Received ${data.transfers.length} transfers from merchant-hub`);

    // 2. Insert each transfer into local DB (filtered by environment)
    const messagesToAck: string[] = [];
    let insertedCount = 0;
    let filteredCount = 0;

    for (const transfer of data.transfers) {
      try {
        // Filter by environment: only process transfers for our environment's account
        if (transfer.to_account !== environmentAccount) {
          filteredCount++;
          // ACK anyway — each env has its own consumer group, so this message
          // will never be relevant to us and would otherwise loop via XAUTOCLAIM
          messagesToAck.push(transfer.messageId);
          continue;
        }

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
              to_account: transfer.to_account,
              amount: transfer.amount,
              symbol: transfer.symbol,
              memo: transfer.memo,
              parsed_memo: transfer.memo, // Will be hydrated by the display layer
              fulfilled: false,
              received_at: transfer.received_at ? new Date(transfer.received_at) : new Date(),
            },
          });
          console.warn(`[SYNC] Inserted transfer ${transfer.id} for ${transfer.to_account}`);
          insertedCount++;
        } else {
          console.warn(`[SYNC] Transfer ${transfer.id} already exists`);
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
            env,
          }),
        });

        if (ackRes.ok) {
          const ackData = await ackRes.json();
          console.warn(`[SYNC] ACKed ${ackData.acknowledged}/${messagesToAck.length} messages`);
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
      filtered: filteredCount,
      acked: messagesToAck.length,
      environment: environmentAccount,
    });

  } catch (error: any) {
    console.error('[SYNC] Error:', error.message);
    return NextResponse.json(
      { error: `Sync failed: ${error.message}` },
      { status: 500 }
    );
  }
}
