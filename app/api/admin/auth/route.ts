import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE, ADMIN_SESSION_TTL_SECONDS, adminSecret, constantTimeEqual, createAdminSession,
} from '@/lib/admin/session';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // No fallback password: without ADMIN_PASSWORD the admin stays closed.
    const secret = adminSecret();
    if (!secret) {
      console.error('[ADMIN AUTH] ADMIN_PASSWORD is not set; admin login disabled');
      return NextResponse.json({ error: 'Admin login is not configured' }, { status: 503 });
    }

    if (typeof password === 'string' && constantTimeEqual(password, secret)) {
      const response = NextResponse.json({ success: true });
      // Signed, expiring session (lib/admin/session.ts) checked by proxy.ts.
      response.cookies.set(ADMIN_COOKIE, await createAdminSession(secret), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: ADMIN_SESSION_TTL_SECONDS,
        path: '/',
      });
      return response;
    }

    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

// Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
