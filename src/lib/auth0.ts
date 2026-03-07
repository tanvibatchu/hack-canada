// Auth0 utility functions
// Provides getCurrentUser() and requireUser() for authentication checks
// Used by API routes and server components
import { Auth0Client } from '@auth0/nextjs-auth0/server';

const auth0 = new Auth0Client();

export async function getCurrentUser() {
  const session = await auth0.getSession();
  if (!session?.user) return null;
  return {
    userId: session.user.sub as string,
    email: session.user.email as string,
    name: session.user.name as string,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}
