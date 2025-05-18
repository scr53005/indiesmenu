import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(request: Request) {
  const pool = new Pool({
    connectionString: process.env.PG_CONNECTION_STRING,
  });

  try {
    const { searchParams } = new URL(request.url);
    const lastId = parseInt(searchParams.get('lastId') || '0');
    console.log('route.ts parsed Last ID:', lastId);
    // Check if lastId is a valid number
    // Query the operation_transfer table
    const query = `
      SELECT id, amount, symbol, memo 
      FROM hafsql.operation_transfer_table
      WHERE to_account = 'indies-test'
      AND symbol = 'HBD'
      AND id > $1
      ORDER BY id DESC
      LIMIT 10;
    `;
    const result = await pool.query(query, [lastId]);
    const transfers = result.rows.map(row => {
        let parsedMemo;
        try {
          parsedMemo = JSON.parse(row.memo);
        } catch {
          parsedMemo = row.memo;
        }
  
        return {
          id: row.id.toString(), // Convert bigint to string
          amount: row.amount.toString(), // Convert numeric to string
          symbol: row.symbol,
          memo: row.memo,
          parsedMemo,
        };
      });
    console.log('route.ts transfers:', transfers);
    // Check if the result is empty

    const latestId = result.rows.length
    ? Math.max(...result.rows.map(r => r.id))
    : lastId;

    return NextResponse.json({ transfers, latestId });
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