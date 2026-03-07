import { auth0 } from '@/lib/auth0';
import type { NextRequest } from 'next/server';

// Handles the Auth0 OAuth callback and restores the session.
export async function GET(req: NextRequest) {
  return auth0.handleCallback(req);
}
