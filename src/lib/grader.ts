/**
 * grader.ts — Centralized attempt grading and mastery tracking.
 * Used by all exercises to compute per-attempt grades, session mastery,
 * and difficulty recommendations for auto-scaling.
 */

import type { Attempt, SessionData } from "@/types";

// ─── Per-attempt grade ───────────────────────────────────────────────────────

export type Grade = "A" | "B" | "C" | "D" | "F";
export type Stars = 1 | 2 | 3;

export interface AttemptGrade {
    grade: Grade;
    stars: Stars;
    label: string;       // short, child-friendly: "Amazing!", "Nice try!", "Keep going!"
    score: number;       // 0–100
}

/**
 * Grade a single attempt.
 * @param score       0–100 score from Gemini or game logic
 * @param correct     whether the attempt was marked correct
 * @param attemptNum  1-indexed attempt number for the current word (penalises retries)
 */
export function gradeAttempt(
    score: number,
    correct: boolean,
    attemptNum: number = 1
): AttemptGrade {
    // Penalise repeated attempts (each retry docks up to 15 pts)
    const penalty = Math.min((attemptNum - 1) * 15, 30);
    const adjusted = Math.max(0, score - penalty);

    if (correct && adjusted >= 85) return { grade: "A", stars: 3, label: "Amazing!", score: adjusted };
    if (correct && adjusted >= 65) return { grade: "B", stars: 2, label: "Great job!", score: adjusted };
    if (correct) return { grade: "C", stars: 2, label: "Nice work!", score: adjusted };
    if (adjusted >= 55) return { grade: "D", stars: 1, label: "So close!", score: adjusted };
    return { grade: "F", stars: 1, label: "Keep going!", score: adjusted };
}

// ─── Mastery level ────────────────────────────────────────────────────────────

export type MasteryLevel = 0 | 1 | 2 | 3 | 4;

export interface SoundMastery {
    level: MasteryLevel;
    label: string;
    nextThreshold: number | null;
    rollingAccuracy: number;
}

const MASTERY_LABELS: Record<MasteryLevel, string> = {
    0: "Novice",
    1: "Developing",
    2: "Emerging",
    3: "Proficient",
    4: "Mastered",
};

const MASTERY_THRESHOLDS: Record<MasteryLevel, number | null> = {
    0: 50,
    1: 65,
    2: 78,
    3: 90,
    4: null,
};

export function getMasteryLevel(sessions: SessionData[]): SoundMastery {
    const recent = [...sessions]
        .sort((a, b) => (b.date > a.date ? 1 : -1))
        .slice(0, 5);

    const rollingAccuracy =
        recent.length > 0
            ? Math.round(recent.reduce((sum, s) => sum + s.averageAccuracy, 0) / recent.length)
            : 0;

    let level: MasteryLevel = 0;
    if (rollingAccuracy >= 90) level = 4;
    else if (rollingAccuracy >= 78) level = 3;
    else if (rollingAccuracy >= 65) level = 2;
    else if (rollingAccuracy >= 50) level = 1;

    return {
        level,
        label: MASTERY_LABELS[level],
        nextThreshold: MASTERY_THRESHOLDS[level],
        rollingAccuracy,
    };
}

// ─── Difficulty recommendation ────────────────────────────────────────────────

export type DifficultyRecommendation = "easier" | "same" | "harder";

export function getDifficultyRecommendation(
    mastery: SoundMastery,
    latestSessionAccuracy: number
): DifficultyRecommendation {
    if (latestSessionAccuracy < 45) return "easier";
    if (mastery.level === 4 && latestSessionAccuracy >= 90) return "harder";
    if (latestSessionAccuracy >= (mastery.nextThreshold ?? 90) + 5) return "harder";
    if (latestSessionAccuracy < (mastery.nextThreshold ?? 90) - 20) return "easier";
    return "same";
}

export function getSessionGrade(attempts: Attempt[]): { grade: Grade; stars: Stars } {
    if (attempts.length === 0) return { grade: "F", stars: 1 };
    const avgScore = attempts.reduce((s, a) => s + a.score, 0) / attempts.length;
    const pctCorrect = attempts.filter((a) => a.correct).length / attempts.length;

    if (pctCorrect >= 0.9 && avgScore >= 85) return { grade: "A", stars: 3 };
    if (pctCorrect >= 0.75 && avgScore >= 70) return { grade: "B", stars: 2 };
    if (pctCorrect >= 0.6) return { grade: "C", stars: 2 };
    if (pctCorrect >= 0.4) return { grade: "D", stars: 1 };
    return { grade: "F", stars: 1 };
}
