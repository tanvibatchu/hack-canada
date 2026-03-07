// Auth0 authentication route handler
// Handles all Auth0 authentication endpoints (login, logout, callback, etc.)
import { handleAuth } from '@auth0/nextjs-auth0';

export const GET = handleAuth();
