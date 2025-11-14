import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const hafPool = new Pool({
  connectionString: process.env.PG_CONNECTION_STRING,
  query_timeout: 60000,
});

/**
 * One-time baseline insertion of existing EURO transfers as fulfilled
 * This establishes the starting point for EURO transfer polling
 * Call this endpoint once: GET /api/baseline-euro?count=10
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '10');

    const hiveAccount = process.env.HIVE_ACCOUNT || 'indies.cafe';

    // Get a dedicated client from the pool for this long-running operation
    const client = await hafPool.connect();

    try {
      // Set statement timeout at the session level (PostgreSQL server-side setting)
      await client.query('SET statement_timeout = 60000'); // 60 seconds

      // Query the latest block number
      const blockQuery = await client.query(`
        SELECT block_num
        FROM hafsql.haf_blocks
        ORDER BY block_num DESC
        LIMIT 1
      `);
      const currentBlock = blockQuery.rows[0]?.block_num || 101140000; // Fallback if query fails
      const startBlock = currentBlock - 100000; // Search last 100k blocks (≈ 3.5 days)

      console.log(`Searching EURO transfers from block ${startBlock} to ${currentBlock}`);

      // Fetch custom_json operations from HAF in the specific block range
      // ORDER BY ASC to get OLDEST first (where our EURO transfers are)
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
         ORDER BY block_num ASC
         LIMIT 100000`,
        [startBlock, currentBlock]
      );

    console.log(`Found ${result.rows.length} potential EURO operations`);
    console.log(`Searching for transfers TO account: ${hiveAccount}`);

    const insertedTransfers = [];
    let processedCount = 0;
    let tokenContractCount = 0;
    let transferActionCount = 0;
    let euroCount = 0;
    let toAccountCount = 0;
    let withTableCount = 0;

    for (const row of result.rows) {
      // Parse the JSON in JavaScript
      let jsonData;
      try {
        jsonData = typeof row.json === 'string' ? JSON.parse(row.json) : row.json;
      } catch (e) {
        console.error('Error parsing JSON:', e);
        continue;
      }

      // Count matching criteria
      if (jsonData.contractName === 'tokens') {
        tokenContractCount++;
        if (jsonData.contractAction === 'transfer') {
          transferActionCount++;
        }
      }

      if (jsonData.contractPayload?.symbol === 'EURO') euroCount++;
      if (jsonData.contractPayload?.to === hiveAccount) toAccountCount++;

      // Check if memo contains TABLE - handle both string and non-string memos
      const memo = jsonData.contractPayload?.memo;
      const memoString = typeof memo === 'string' ? memo : (memo ? JSON.stringify(memo) : '');
      if (memoString.includes('TABLE ')) withTableCount++;

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
      const memoRaw = jsonData.contractPayload?.memo;
      const memoFinal = typeof memoRaw === 'string' ? memoRaw : (memoRaw ? JSON.stringify(memoRaw) : '');

      // Check if transfer already exists
      const exists = await prisma.transfers.findUnique({ where: { id: BigInt(row.id) } });
      if (!exists) {
        console.log('Inserting baseline EURO transfer:', row.id, 'memo:', memoFinal.substring(0, 50));
        await prisma.transfers.create({
          data: {
            id: BigInt(row.id),
            from_account: fromAccount,
            amount: quantity,
            symbol: 'EURO',
            memo: memoFinal,
            parsed_memo: memoFinal,
            fulfilled: true, // Mark as fulfilled for baseline
            received_at: new Date(row.timestamp),
            fulfilled_at: new Date(row.timestamp), // Set fulfilled_at to same time
          },
        });
        insertedTransfers.push({
          id: row.id.toString(),
          from_account: fromAccount,
          amount: quantity,
          timestamp: row.timestamp,
        });
        processedCount++;

        // Stop when we've inserted enough
        if (processedCount >= count) {
          break;
        }
      } else {
        console.log('Transfer already exists, skipping:', row.id);
      }
    }

    console.log(`Filter results:`);
    console.log(`  - ${tokenContractCount} token operations`);
    console.log(`  - ${transferActionCount} token transfers`);
    console.log(`  - ${euroCount} EURO transfers`);
    console.log(`  - ${toAccountCount} to ${hiveAccount}`);
    console.log(`  - ${withTableCount} with TABLE in memo`);
    console.log(`Matched and inserted: ${insertedTransfers.length} transfers`);

      return NextResponse.json({
        message: `Baseline insertion complete`,
        inserted: insertedTransfers.length,
        transfers: insertedTransfers,
      });
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error: any) {
    console.error('Baseline EURO insertion error:', error.message, error.stack);
    return NextResponse.json(
      { error: `Failed to insert baseline EURO transfers: ${error.message}` },
      { status: 500 }
    );
  }
}
