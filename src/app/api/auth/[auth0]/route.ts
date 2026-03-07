import { auth0 } from '@/lib/auth0';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  if (pathname.includes('/login')) {
    return auth0.startInteractiveLogin({ authorizationParameters: { connection: 'google-oauth2' } });
  }

  if (pathname.includes('/logout')) {
    return auth0.middleware(req);
  }

  if (pathname.includes('/callback')) {
    return auth0.middleware(req);
  }

  return auth0.middleware(req);
}
