import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const hafPool = new Pool({ connectionString: process.env.PG_CONNECTION_STRING });

// NOTE: operation_transfer_table does NOT have a timestamp column
// We use new Date() which gives server time, not actual blockchain transfer time
// This is a known limitation - if server is down, transfers retrieved later will show
// the retrieval time, not the actual transfer time.
// TODO: Future improvement - join with haf_blocks or operation_view to get real timestamp
// For now, EURO transfers (operation_custom_json_view) DO have timestamps and work correctly.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lastId = searchParams.get('lastId') || '411975049738723586';
    // console.log('Polling HAF with lastId:', lastId);

    const hiveAccount = process.env.HIVE_ACCOUNT || 'indies.cafe';
    // Poll HAF
    const result = await hafPool.query(
      'SELECT id, from_account, amount, symbol, memo FROM hafsql.operation_transfer_table WHERE to_account = $1 AND symbol = \'HBD\' AND memo LIKE \'%TABLE %\' AND id > $2 ORDER BY id DESC LIMIT 10',
      [hiveAccount, lastId]
    );
    // console.log('HAF query result:', result.rows.length, 'rows');

    const transfers = [];
    for (const row of result.rows) {
      let parsedMemo;
      try {
        parsedMemo = JSON.stringify(JSON.parse(row.memo));
      } catch {
        parsedMemo = row.memo;
      }

      const transfer = {
        id: row.id.toString(),
        from_account: row.from_account,
        amount: row.amount.toString(),
        symbol: row.symbol,
        memo: row.memo,
        parsedMemo,
      };

      // Check if transfer exists
      const exists = await prisma.transfers.findUnique({ where: { id: BigInt(transfer.id) } });
      if (!exists) {
        console.log('Inserting transfer:', transfer.id);
        await prisma.transfers.create({
          data: {
            id: BigInt(transfer.id),
            from_account: transfer.from_account,
            amount: transfer.amount,
            symbol: transfer.symbol,
            memo: transfer.memo,
            parsed_memo: transfer.parsedMemo,
            fulfilled: false,
            received_at: new Date(), // Server time, not blockchain time (see NOTE above)
          },
        });
        console.log('Inserted transfer to back-end DB:', transfer.id);
      }
      transfers.push(transfer);
    }

    // Fetch unfulfilled transfers
    const unfulfilledTransfers = await prisma.transfers.findMany({
      where: { fulfilled: false },
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
    console.log('Unfulfilled transfers from back-end DB:', unfulfilledTransfers.length, 'rows');

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
  } catch (error: any) {
    console.error('HAF poll error:', error.message, error.stack);
    return NextResponse.json(
      { error: `Failed to fetch HBD transfers: ${error.message}` },
      { status: 500 }
    );
  } 
}
// This code polls the HAF for HBD transfers, checks for new transfers, and stores them in a back-end database using Prisma.
// It also retrieves unfulfilled transfers from the back-end database and returns them in the response.