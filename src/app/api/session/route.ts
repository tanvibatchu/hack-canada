// Session API route
// GET: Retrieves sessions for a specific sound (query param: ?sound=...)
// POST: Saves a new session and updates XP and streak
// Used by session components to save and retrieve practice sessions
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth0';
import {
  saveSession,
  getSessions,
  updateStreak,
  updateXP,
} from '@/lib/firebase';
import type { SessionData } from '@/types';

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const sound = searchParams.get('sound') ?? '';
    const sessions = await getSessions(user.userId, sound);
    return NextResponse.json({ sessions }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { completed, ...session } = body as SessionData & { completed?: boolean };
    console.log("[Session API] POST", {
      completed,
      targetSound: session.targetSound,
      attemptCount: Array.isArray(session.attempts) ? session.attempts.length : 0,
    });
    if (completed !== true) {
      return NextResponse.json(
        { error: 'Session must include completed: true', skipped: true, xpEarned: 0, newStreak: null },
        { status: 400 }
      );
    }
    await saveSession(user.userId, session);
    const xpEarned = session.attempts.filter((a) => a.correct).length * 10;
    await updateXP(user.userId, xpEarned);
    const newStreak = await updateStreak(user.userId);
    return NextResponse.json(
      { success: true, xpEarned, newStreak },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to save session' },
      { status: 500 }
    );
  }
}
