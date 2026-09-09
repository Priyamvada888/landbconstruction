import { NextResponse, type NextRequest } from 'next/server';
import { verifyJwt, COOKIE_NAME } from '@/lib/jwt';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const userPayload = token ? verifyJwt(token) : null;

  // Allow public auth pages and api endpoints
  const isPublicRoute =
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/api/');

  // If user is not logged in and tries to access protected page
  if (!userPayload && !isPublicRoute) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is already logged in and visits /login, redirect to /dashboard
  if (pathname === '/login' && userPayload) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image, favicon.ico, images, fonts
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
