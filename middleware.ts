// Middleware for protecting routes with Auth0 authentication
// Protects /kid and /parent routes, requires authentication
// Note: Since these routes aren't built yet, this is a placeholder
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default async function middleware(req: NextRequest) {
  // Check for Auth0 session cookie
  const sessionCookie = req.cookies.get('appSession');
  
  if (!sessionCookie) {
    const url = new URL('/api/auth/login', req.url);
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/kid/:path*', '/parent/:path*'],
};
