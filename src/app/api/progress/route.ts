// Progress API route
// GET: Retrieves comprehensive progress data including profile, sessions, and statistics
// Used by components that display progress, statistics, and analytics
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth0';
import { getChildProfile, getAllSessions } from '@/lib/firebase';

export async function GET() {
  try {
    const user = await requireUser();
    const [profile, sessions] = await Promise.all([
      getChildProfile(user.userId),
      getAllSessions(user.userId),
    ]);
    const last7 = sessions.slice(0, 7);
    const accuracyBySound: Record<string, number[]> = {};
    sessions.forEach((s) => {
      if (!accuracyBySound[s.targetSound]) {
        accuracyBySound[s.targetSound] = [];
      }
      accuracyBySound[s.targetSound].push(s.averageAccuracy);
    });
    const avgBySound: Record<string, number> = {};
    Object.entries(accuracyBySound).forEach(([sound, scores]) => {
      avgBySound[sound] =
        scores.reduce((a, b) => a + b, 0) / scores.length;
    });
    const weekSessions = sessions.filter((s) => {
      const sessionDate = new Date(s.date);
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      return sessionDate > weekAgo;
    });
    const bestAccuracy =
      weekSessions.length > 0
        ? Math.max(...weekSessions.map((s) => s.averageAccuracy))
        : 0;
    return NextResponse.json(
      {
        profile,
        totalSessions: sessions.length,
        sessionsThisWeek: weekSessions.length,
        bestAccuracyThisWeek: Math.round(bestAccuracy),
        averageAccuracyBySound: avgBySound,
        recentSessions: last7,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }
}
