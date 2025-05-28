import { NextResponse } from 'next/server';
import db from '../../../lib/db';

export async function POST(request: Request) {
  try {
    console.log('Received POST to /api/fulfill');
    const { id } = await request.json();
    console.log('Request body ID:', id, 'Type:', typeof id);

    if (!id) {
      console.log('No ID provided');
      return NextResponse.json({ error: 'Transfer ID required' }, { status: 400 });
    }

    // Verify ID exists
    const checkResult = await db.query('SELECT id FROM public.transfers WHERE id = $1', [id]);
    console.log('Database check result:', checkResult.rows);

    if (checkResult.rows.length === 0) {
      console.log(`No transfer found for ID: ${id}`);
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    const updateResult = await db.query(`
      UPDATE public.transfers
      SET fulfilled = TRUE, fulfilled_at = $1
      WHERE id = $2
      RETURNING id
    `, [new Date().toISOString(), id]);
    console.log('Update result:', updateResult.rows);

    if (updateResult.rowCount === 0) {
      console.log(`No rows updated for ID: ${id}`);
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    console.log(`Successfully fulfilled transfer ID: ${id}`);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Fulfill error:', error.message, error.stack);
    return NextResponse.json({ error: `Failed to fulfill transfer: ${error.message}` }, { status: 500 });
  }
}

/*import { NextResponse } from 'next/server';
import db from '../../../lib/db';

export async function POST(request: Request) {
  try {
    console.log('Received POST to /api/fulfill');
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'Transfer ID required' }, { status: 400 });
    }

    const updateStmt = db.prepare(`
      UPDATE transfers
      SET fulfilled = TRUE, fulfilled_at = ?
      WHERE id = ?
    `);
    const result = updateStmt.run(new Date().toISOString(), id);

    if (result.changes === 0) {
      return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Fulfill error:', error.message, error.stack);
    return NextResponse.json({ error: `Failed to fulfill transfer: ${error.message}` }, { status: 500 });
  }
}*/