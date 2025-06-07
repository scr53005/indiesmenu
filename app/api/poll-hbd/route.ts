import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import db from '../../../lib/db';

export async function GET(request: Request) {
  const hafPool = new Pool({
    connectionString: process.env.PG_CONNECTION_STRING,
  });

  try {
    const { searchParams } = new URL(request.url);
    const lastId = searchParams.get('lastId') || '411975049738723586';

    console.log('Polling HAF with lastId:', lastId);

    // Poll HAF
    const query = `
      SELECT id, from_account, amount, symbol, memo
      FROM hafsql.operation_transfer_table
      WHERE to_account = 'indies.cafe'
      AND symbol = 'HBD'
      AND id > $1
      ORDER BY id DESC
      LIMIT 10;
    `;
    const result = await hafPool.query(query, [lastId]);
    console.log('HAF query result:', result.rows.length, 'rows');

    const transfers = [];
    for (const row of result.rows) {
      let parsedMemo;
      try {
        parsedMemo = JSON.parse(row.memo);
        parsedMemo = JSON.stringify(parsedMemo);
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
      const exists = await db.query('SELECT id FROM public.transfers WHERE id = $1', [transfer.id]);
      if (exists.rows.length === 0) {
        console.log('Inserting transfer:', transfer.id);
        await db.query(`
          INSERT INTO public.transfers (id, from_account, amount, symbol, memo, parsed_memo, fulfilled, received_at)
          VALUES ($1, $2, $3, $4, $5, $6, FALSE, CURRENT_TIMESTAMP)
        `, [
          transfer.id,
          transfer.from_account,
          transfer.amount,
          transfer.symbol,
          transfer.memo,
          transfer.parsedMemo,
        ]);
        console.log('Inserted transfer to Neon:', transfer.id);
      }

      transfers.push(transfer);
    }

    // Fetch unfulfilled transfers
    const unfulfilledResult = await db.query(`
      SELECT id, from_account, amount, symbol, memo, parsed_memo, received_at
      FROM public.transfers
      WHERE fulfilled = FALSE
      ORDER BY id DESC
      LIMIT 50
    `);
    console.log('Unfulfilled transfers from Neon:', unfulfilledResult.rows.length, 'rows');
    const unfulfilledTransfers = unfulfilledResult.rows.map(t => ({
      id: t.id.toString(),
      from_account: t.from_account,
      amount: t.amount,
      symbol: t.symbol,
      memo: t.memo,
      parsedMemo: t.parsed_memo,
      received_at: t.received_at.toISOString(), // Convert to ISO string
    }));

    const latestId = result.rows.length
      ? result.rows[0].id.toString()
      : lastId;

    return NextResponse.json({ transfers: unfulfilledTransfers, latestId });
  } catch (error: any) {
    console.error('HAF poll error:', error.message, error.stack);
    return NextResponse.json(
      { error: `Failed to fetch HBD transfers: ${error.message}` },
      { status: 500 }
    );
  } finally {
    await hafPool.end();
  }
}


/*// Define interface for SQLite transfer row
interface TransferRow {
  id: string;
  from_account: string;
  amount: string;
  symbol: string;
  memo: string;
  parsed_memo: string;
}

export async function GET(request: Request) {
  const pool = new Pool({
    connectionString: process.env.PG_CONNECTION_STRING,
  });

  try {
    const { searchParams } = new URL(request.url);
    const lastId = BigInt(searchParams.get('lastId') || '0');

    const query = `
      SELECT id, from_account, amount, symbol, memo
      FROM hafsql.operation_transfer_table
      WHERE to_account = 'indies-test'
      AND symbol = 'HBD'
      AND id > $1
      ORDER BY id DESC
      LIMIT 10;
    `;
    const result = await pool.query(query, [lastId]);

    const existingIdsStmt = db.prepare('SELECT id FROM transfers WHERE id = ?');
    const insertStmt = db.prepare(`
      INSERT INTO transfers (id, from_account, amount, symbol, memo, parsed_memo, fulfilled)
      VALUES (?, ?, ?, ?, ?, ?, FALSE)
    `);

    const transfers = result.rows.map(row => {
      let parsedMemo;
      try {
        parsedMemo = JSON.parse(row.memo);
        parsedMemo = JSON.stringify(parsedMemo);
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

      const exists = existingIdsStmt.get(transfer.id);
      if (!exists) {
        console.log('Inserting transfer:', transfer.id);
        insertStmt.run(
          transfer.id,
          transfer.from_account,
          transfer.amount,
          transfer.symbol,
          transfer.memo,
          transfer.parsedMemo
        );
        console.log('Inserted transfer:', transfer.id);
      }

      return transfer;
    });

    const unfulfilledStmt = db.prepare(`
      SELECT id, from_account, amount, symbol, memo, parsed_memo
      FROM transfers
      WHERE fulfilled = FALSE
      ORDER BY id DESC
      LIMIT 50
    `);
    const unfulfilledTransfers = (unfulfilledStmt.all() as TransferRow[]).map((t) => ({
      id: t.id,
      from_account: t.from_account,
      amount: t.amount,
      symbol: t.symbol,
      memo: t.memo,
      parsedMemo: t.parsed_memo,
    }));

    const latestId = result.rows.length
      ? String(Math.max(...result.rows.map(r => Number(r.id.toString()))))
      : lastId.toString();

    return NextResponse.json({ transfers: unfulfilledTransfers, latestId });
  } catch (error: any) {
    console.error('HAF poll error:', error.message, error.stack);
    return NextResponse.json(
      { error: `Failed to fetch HBD transfers: ${error.message}` },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}*/