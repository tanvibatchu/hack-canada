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

    const childAge = profile?.age ?? 6;
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

    // Analytics computation
    let trend = "inconsistent";
    let insight = "Keep practicing to establish a baseline!";
    let weeksToMastery = 12;

    if (sessions.length >= 2) {
      const recent = sessions[0].averageAccuracy;
      const previous = sessions[1].averageAccuracy;
      const delta = recent - previous;

      if (delta >= 5) {
        trend = "improving";
        insight = childAge <= 4
          ? "Great progress! Your toddler is picking up target sounds very well. Keep modeling those words."
          : childAge <= 6
            ? "Steady improvement! The consonant blends are becoming more natural."
            : "Excellent progress! Advanced motor planning is locking in.";
      } else if (Math.abs(delta) < 5) {
        trend = "plateau";
        insight = childAge <= 4
          ? "Scores are stabilizing. Toddlers often plateau before a sudden leap in clarity!"
          : childAge <= 6
            ? "Consistent performance. Try mixing up the time of day you practice to break the plateau."
            : "Plateau detected. Ensure they are actively focusing on lip and tongue placement during practice.";
      } else {
        trend = "inconsistent";
        insight = childAge <= 4
          ? "Fluctuating scores are very normal for this age as their mouth muscles develop."
          : "Inconsistent scores. Focus on the 'Blend It' exercise to build stronger motor planning.";
      }

      // Mastery prediction: Base weeks minus a multiplier based on recent accuracy and age.
      // Older children typically achieve mastery in fewer targeted weeks if accuracy is high.
      const ageMultiplier = childAge >= 7 ? 1.5 : childAge >= 5 ? 1.2 : 0.8;
      const distanceToMastery = Math.max(0, 80 - recent); // 80% is typical mastery

      if (distanceToMastery === 0) {
        weeksToMastery = 0;
        insight = "Mastery achieved for current targets! Consider adding new target sounds.";
      } else {
        // Assume ~2.5% improvement per week adjusted by age
        weeksToMastery = Math.max(1, Math.ceil(distanceToMastery / (2.5 * ageMultiplier)));
      }
    }

    return NextResponse.json(
      {
        profile,
        totalSessions: sessions.length,
        sessionsThisWeek: weekSessions.length,
        bestAccuracyThisWeek: Math.round(bestAccuracy),
        averageAccuracyBySound: avgBySound,
        recentSessions: last7,
        trend,
        weeksToMastery,
        insight,
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
