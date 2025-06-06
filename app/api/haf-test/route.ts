import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function GET(request: Request) {
  const pool = new Pool({
    connectionString: process.env.PG_CONNECTION_STRING,
  });

  try {
    const { searchParams } = new URL(request.url);
    const lastId = parseInt(searchParams.get('lastId') || '0');
    /*// Query the latest block number
    const blockQuery = `
      SELECT block_num
      FROM hafsql.haf_blocks
      ORDER BY block_num DESC
      LIMIT 1;
    `;
    const blockResult = await pool.query(blockQuery);
    const latestBlock = blockResult.rows[0]?.block_num || 0;

    // Count transactions in the latest block
    const txQuery = `
      SELECT COUNT(*) as tx_count
      FROM hafsql.haf_transactions
      WHERE block_num = $1;
    `;
    const txResult = await pool.query(txQuery, [latestBlock]);
    const txCount = parseInt(txResult.rows[0].tx_count) || 0;

    return NextResponse.json({
      latestBlock,
      txCount,
    }); */
    // Query the operation_transfer table
    const query = `
      SELECT id, amount, symbol, memo 
      FROM hafsql.operation_transfer_table
      WHERE to_account = 'indies.cafe'
      AND symbol = 'HBD'
      AND id > $1
      ORDER BY id DESC
      LIMIT 10;
    `;
    const result = await pool.query(query, [lastId]);
    const transfers = result.rows.map((row) => ({
      // Map the result to a more readable format
      id: row.id.toString(),
      amount: row.amount,
      symbol: row.symbol,
      memo: row.memo,
      parsedMemo: row.memo ? JSON.parse(row.memo) : null,
    }));
    const latestId = result.rows.length
    ? Math.max(...result.rows.map(r => r.id))
    : lastId;
    return NextResponse.json({
      transfers, latestId
    });
  } catch (error: any) {
    console.error('HAF poll error:', error.message, error.stack);
    // Handle the error and return a response
    return NextResponse.json(
      { error: `Failed to fetch HBD transfers: ${error.message}` },
      { status: 500 }
    );
  } finally {
    await pool.end();
  }
}