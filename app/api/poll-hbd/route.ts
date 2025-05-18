import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import db from '../../../lib/db';

export async function GET(request: Request) {
  const pool = new Pool({
    connectionString: process.env.PG_CONNECTION_STRING,
  });

  try {
    const { searchParams } = new URL(request.url);
    const lastId = BigInt(searchParams.get('lastId') || '0');
    console.log('route.ts parsed Last ID:', lastId);
    // Check if lastId is a valid number
    // Query the operation_transfer table
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

    // Check existing IDs in SQLite
    const existingIdsStmt = db.prepare('SELECT id FROM transfers WHERE id = ?');
    const insertStmt = db.prepare(`
      INSERT INTO transfers (id, from_account, amount, symbol, memo, parsed_memo, fulfilled)
      VALUES (?, ?, ?, ?, ?, ?, FALSE)
    `);

    const transfers = result.rows.map(row => {
        let parsedMemo;
        try {
          parsedMemo = JSON.parse(row.memo);
          parsedMemo = JSON.stringify(parsedMemo); // Store as string
        } catch {
          parsedMemo = row.memo;
        }
  
        const transfer = {
          id: row.id.toString(), // Convert BigInt to string
          from_account: row.from_account,
          amount: row.amount.toString(), // Convert numeric to string
          symbol: row.symbol,
          memo: row.memo,
          parsedMemo,
        };

      // Save new transfers to SQLite
      const exists = existingIdsStmt.get(transfer.id.toString());
      if (!exists) {
        insertStmt.run(
          transfer.id.toString(), // Convert to string for SQLite query 
          transfer.from_account,
          transfer.amount,
          transfer.symbol,
          transfer.memo,
          transfer.parsedMemo
        );
        // Log the inserted transfer
        console.log('Inserted transfer into SQLite:', transfer);
        }
        return transfer;
      });
    console.log('route.ts transfers:', transfers);
    // Check if the result is empty

// Fetch unfulfilled transfers from SQLite
const unfulfilledStmt = db.prepare(`
    SELECT id, from_account, amount, symbol, memo, parsed_memo
    FROM transfers
    WHERE fulfilled = FALSE
    ORDER BY id DESC
    LIMIT 50
  `);

  const unfulfilledTransfers = unfulfilledStmt.all() as Array<{
    id: string;
    from_account: string;
    amount: string;
    symbol: string;
    memo: string;
    parsed_memo: string;
  }>;

  const unfulfilledTransfersMapped = unfulfilledTransfers.map(t => ({
    id: t.id, // Convert back to BigInt
    from_account: t.from_account,
    amount: t.amount,
    symbol: t.symbol,
    memo: t.memo,
    parsedMemo: t.parsed_memo,
  }));

    const latestId = result.rows.length
    ? String(Math.max(...result.rows.map(r => Number(r.id)))) // Convert to string
    : lastId.toString();

    return NextResponse.json({ transfers: unfulfilledTransfersMapped, latestId });
  } catch (error: any) {
    console.error('HAF poll error:', error.message, error.stack);
    return NextResponse.json(
      { error: `Failed to fetch HBD transfers: ${error.message}` },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}