import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const hafPool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  query_timeout: 30000,
});

// Convert UTC timestamp to Luxembourg/Paris timezone
function utcToLuxembourg(utcTimestamp: string | Date): Date {
  const date = new Date(utcTimestamp);
  // Use sv-SE locale for unambiguous YYYY-MM-DD HH:mm:ss format
  const luxString = date.toLocaleString('sv-SE', { timeZone: 'Europe/Luxembourg' });
  return new Date(luxString);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lastId = searchParams.get('lastId') || '433965720380904210';
    // console.log('Polling HAF for EURO transfers with lastId:', lastId);

    const hiveAccount = process.env.HIVE_ACCOUNT || 'indies.cafe';

    // Get a dedicated client from the pool
    const client = await hafPool.connect();

    try {
      // Set statement timeout at the session level
      await client.query('SET statement_timeout = 30000'); // 30 seconds for polling

      // Query the latest block number
      const blockQuery = await client.query(`
        SELECT block_num
        FROM hafsql.haf_blocks
        ORDER BY block_num DESC
        LIMIT 1
      `);
      const currentBlock = blockQuery.rows[0]?.block_num || 101140000; // Fallback if query fails
      const startBlock = currentBlock - 10000; // Search last ~10k blocks (≈ 8 hours)

      // Poll HAF for EURO token transfers - only use indexed columns for speed
      const result = await client.query(
        `SELECT
          id,
          timestamp,
          required_auths,
          json,
          block_num
         FROM hafsql.operation_custom_json_view
         WHERE block_num BETWEEN $1 AND $2
           AND custom_id = 'ssc-mainnet-hive'
           AND id > $3
         ORDER BY block_num DESC
         LIMIT 500`,
        [startBlock, currentBlock, lastId]
      );
      // console.log('HAF EURO query result:', result.rows.length, 'rows');

      const transfers = [];
      for (const row of result.rows) {
        // Parse the JSON in JavaScript
        let jsonData;
        try {
          jsonData = typeof row.json === 'string' ? JSON.parse(row.json) : row.json;
        } catch (e) {
          console.error('Error parsing JSON:', e);
          continue;
        }

        // Check if memo contains TABLE - handle both string and non-string memos
        const memoRaw = jsonData.contractPayload?.memo;
        const memoString = typeof memoRaw === 'string' ? memoRaw : (memoRaw ? JSON.stringify(memoRaw) : '');

        // Filter: only EURO token transfers to our account
        if (
          jsonData.contractName !== 'tokens' ||
          jsonData.contractAction !== 'transfer' ||
          jsonData.contractPayload?.symbol !== 'EURO' ||
          jsonData.contractPayload?.to !== hiveAccount ||
          !memoString.includes('TABLE ')
        ) {
          continue; // Skip this row
        }

        // Parse the from_account from required_auths array
        let fromAccount = 'unknown';
        try {
          const authsArray = typeof row.required_auths === 'string'
            ? JSON.parse(row.required_auths)
            : row.required_auths;
          if (authsArray && authsArray.length > 0) {
            fromAccount = authsArray[0];
          }
        } catch (e) {
          console.error('Error parsing required_auths:', e);
        }

        const quantity = jsonData.contractPayload?.quantity || '0';

        const transfer = {
          id: row.id.toString(),
          from_account: fromAccount,
          amount: quantity,
          symbol: 'EURO',
          memo: memoString,
          parsedMemo: memoString,
          timestamp: row.timestamp,
        };

        // Check if transfer exists
        const exists = await prisma.transfers.findUnique({ where: { id: BigInt(transfer.id) } });
        if (!exists) {
          console.log('Inserting EURO transfer:', transfer.id);
          await prisma.transfers.create({
            data: {
              id: BigInt(transfer.id),
              from_account: transfer.from_account,
              amount: transfer.amount,
              symbol: transfer.symbol,
              memo: transfer.memo,
              parsed_memo: transfer.parsedMemo,
              fulfilled: false,
              received_at: utcToLuxembourg(transfer.timestamp),
            },
          });
          console.log('Inserted EURO transfer to back-end DB:', transfer.id);
        }
        transfers.push(transfer);
      }

      // Fetch unfulfilled EURO transfers
      const unfulfilledTransfers = await prisma.transfers.findMany({
        where: {
          fulfilled: false,
          symbol: 'EURO'
        },
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
      console.log('Unfulfilled EURO transfers from back-end DB:', unfulfilledTransfers.length, 'rows');

      const formattedUnfulfilled = unfulfilledTransfers.map(t => ({
        id: t.id.toString(),
        from_account: t.from_account,
        amount: t.amount,
        symbol: t.symbol,
        memo: t.memo,
        parsedMemo: t.parsed_memo,
        received_at: t.received_at ? t.received_at.toISOString() : new Date().toISOString(),
      }));

      const latestId = result.rows.length ? result.rows[0].id.toString() : lastId;

      return NextResponse.json({ transfers: formattedUnfulfilled, latestId });
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error: any) {
    console.error('HAF EURO poll error:', error.message, error.stack);
    return NextResponse.json(
      { error: `Failed to fetch EURO transfers: ${error.message}` },
      { status: 500 }
    );
  }
}
// This code polls the HAF for EURO token transfers via custom_json operations, checks for new transfers, and stores them in the back-end database using Prisma.
// It also retrieves unfulfilled EURO transfers from the back-end database and returns them in the response.
