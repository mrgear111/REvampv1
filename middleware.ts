import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  const { pathname } = request.nextUrl;

  const authRoutes = ['/login', '/register'];
  const protectedRoutes = ['/dashboard', '/admin'];

  // Handle CORS
  const response = NextResponse.next();
  
  // Add CORS headers to all responses
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return response;
  }

  // If user is logged in, redirect from auth pages to dashboard
  if (sessionCookie && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user is not logged in, redirect from protected pages to login
  if (!sessionCookie && protectedRoutes.some(path => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * 
     * Note: We're including API routes to apply CORS headers
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/:path*',
  ],
}
