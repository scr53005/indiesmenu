// Next 16 convention: this file is `proxy.ts` (the renamed `middleware.ts`).
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, adminSecret, verifyAdminSession } from './lib/admin/session';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith('/admin') && !pathname.startsWith('/admin/login');
  const isAdminApi = pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/auth');
  if (!isAdminPage && !isAdminApi) return NextResponse.next();

  // The cookie must be a session signed with ADMIN_PASSWORD (lib/admin/session.ts),
  // not just present: the old fixed value "authenticated" could be set by anyone.
  const authorised = await verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value, adminSecret());
  if (authorised) return NextResponse.next();

  if (isAdminApi) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('returnUrl', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
