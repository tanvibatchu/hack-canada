// Profile API route
// GET: Retrieves the current user's child profile
// POST: Saves or updates the current user's child profile
// Used by onboarding page and other components that need profile data
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth0';
import { getChildProfile, saveChildProfile } from '@/lib/firebase';
import type { ChildProfile } from '@/types';

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await getChildProfile(user.userId);
    if (!profile) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }
    return NextResponse.json({ profile }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    console.log('POST /api/profile - user:', user.userId);
    const body = await request.json();
    console.log('POST /api/profile - body:', body);
    const profile = body as ChildProfile;
    await saveChildProfile(user.userId, profile);
    console.log('POST /api/profile - saved successfully');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('POST /api/profile - error:', error);
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}
