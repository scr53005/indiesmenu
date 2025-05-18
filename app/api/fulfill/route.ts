import { NextResponse } from 'next/server';
import db from '../../../lib/db';

export async function POST(request: Request) {
    try {
      const { id } = await request.json();
      if (!id) {
        return NextResponse.json({ error: 'Transfer ID required' }, { status: 400 });
      }
  
      const updateStmt = db.prepare(`
        UPDATE transfers
        SET fulfilled = TRUE, fulfilled_at = ?
        WHERE id = ?
      `);
      const result = updateStmt.run(new Date().toISOString(), id.toString());
  
      if (result.changes === 0) {
        return NextResponse.json({ error: 'Transfer not found' }, { status: 404 });
      }
  
      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error('Fulfill error:', error.message, error.stack);
      return NextResponse.json({ error: `Failed to fulfill transfer: ${error.message}` }, { status: 500 });
    }
  }
  
  