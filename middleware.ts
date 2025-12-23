import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if accessing admin routes (except login)
  if (request.nextUrl.pathname.startsWith('/admin') &&
      !request.nextUrl.pathname.startsWith('/admin/login')) {

    // Check for auth cookie
    const authCookie = request.cookies.get('admin_session');

    if (!authCookie || authCookie.value !== 'authenticated') {
      // Redirect to login with return URL
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('returnUrl', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Check admin API routes
  if (request.nextUrl.pathname.startsWith('/api/admin') &&
      !request.nextUrl.pathname.startsWith('/api/admin/auth')) {

    const authCookie = request.cookies.get('admin_session');

    if (!authCookie || authCookie.value !== 'authenticated') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
