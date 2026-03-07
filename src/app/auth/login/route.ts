import { auth0 } from '@/lib/auth0';
import type { NextRequest } from 'next/server';

// Starts the Auth0 login/signup flow.
// Pass ?screen_hint=signup to show signup on the hosted page and ?returnTo=/path to control post-login redirect.
export async function GET(req: NextRequest) {
  return auth0.handleLogin(req);
}
