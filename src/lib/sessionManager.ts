/**
 * In-memory session management: start/record/end sessions, compute XP and streaks.
 * Import: startSession, recordAttempt, endSession, calculateStreak
 */

import type { Attempt, Session, SessionData } from "@/types";

const XP_PER_CORRECT = 10;

/**
 * Starts a new in-progress session for the given user and target sound.
 */
export function startSession(userId: string, sound: string): Session {
  return {
    userId,
    sound,
    startTime: Date.now(),
    attempts: [],
  };
}

/**
 * Records an attempt into the session and returns the updated session.
 */
export function recordAttempt(session: Session, attempt: Attempt): Session {
  return {
    ...session,
    attempts: [...session.attempts, attempt],
  };
}

/**
 * Ends the session, computes averageAccuracy and XP earned.
 * Persist sessionData and xpEarned on your backend; this layer only computes.
 */
export async function endSession(
  session: Session,
  _userId: string
): Promise<{ xpEarned: number; sessionData: SessionData }> {
  const durationMs =
    new Date().getTime() - new Date(session.startTime).getTime();
  const durationSeconds = Math.round(durationMs / 1000);
  const attempts = session.attempts;
  const averageAccuracy =
    attempts.length > 0
      ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
      : 0;
  const correctCount = attempts.filter((a) => a.correct).length;
  const xpEarned = correctCount * XP_PER_CORRECT;

  const sessionData: SessionData = {
    date: new Date().toISOString().slice(0, 10),
    durationSeconds,
    targetSound: session.sound,
    attempts,
    averageAccuracy: Math.round(averageAccuracy * 100) / 100,
  };

  return { xpEarned, sessionData };
}

/**
 * Returns the current consecutive-day streak from past sessions (by date).
 */
export function calculateStreak(sessions: SessionData[]): number {
  if (sessions.length === 0) return 0;
  const sortedDates = [...new Set(sessions.map((s) => s.date))].sort(
    (a, b) => (b > a ? 1 : -1)
  );
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let cursor = 0;
  let expected = today;
  while (cursor < sortedDates.length && sortedDates[cursor] === expected) {
    streak++;
    cursor++;
    const next = new Date(expected);
    next.setDate(next.getDate() - 1);
    expected = next.toISOString().slice(0, 10);
  }
  return streak;
}
