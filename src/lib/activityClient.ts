"use client";

import type { PhonemeResult } from "@/lib/gemini";
import type { SessionData } from "@/types";
import type { TargetSound } from "@/lib/wordBanks";

export type ChildProfile = {
  age: number;
  name: string;
  streak: number;
  targetSounds: TargetSound[];
  totalXP: number;
};

const DEFAULT_ANALYSIS: PhonemeResult = {
  correct: false,
  feedback: "Great try!",
  mouthCue: "",
  score: 0,
  substitution: null,
  tryAgain: true,
};

function normalizeProfile(rawProfile: unknown, fallback: ChildProfile): ChildProfile {
  const profile = (rawProfile ?? {}) as Partial<ChildProfile> & { xp?: number };
  const targetSounds =
    Array.isArray(profile.targetSounds) && profile.targetSounds.length > 0
      ? (profile.targetSounds as TargetSound[])
      : fallback.targetSounds;

  return {
    age: typeof profile.age === "number" ? profile.age : fallback.age,
    name: typeof profile.name === "string" && profile.name.trim() ? profile.name : fallback.name,
    streak: typeof profile.streak === "number" ? profile.streak : fallback.streak,
    targetSounds,
    totalXP:
      typeof profile.totalXP === "number"
        ? profile.totalXP
        : typeof profile.xp === "number"
          ? profile.xp
          : fallback.totalXP,
  };
}

export async function fetchChildProfile(fallback: ChildProfile): Promise<ChildProfile> {
  try {
    const response = await fetch("/api/profile");
    if (!response.ok) {
      throw new Error(`Profile request failed with ${response.status}.`);
    }

    const payload = (await response.json()) as { profile?: unknown };
    return normalizeProfile(payload.profile, fallback);
  } catch {
    return fallback;
  }
}

export async function submitAudioForAnalysis(input: {
  age: number;
  audio: Blob;
  targetSound: string;
  transcript?: string;
  word: string;
}): Promise<PhonemeResult> {
  const formData = new FormData();
  const fallbackMimeType = input.audio.type || "audio/webm";
  const extension = fallbackMimeType.includes("ogg")
    ? "ogg"
    : fallbackMimeType.includes("mp4")
      ? "mp4"
      : "webm";

  formData.append("audio", input.audio, `capture.${extension}`);
  formData.append("age", String(input.age));
  formData.append("targetSound", input.targetSound);
  formData.append("word", input.word);

  // Forward transcript when available so the server can prefer text analysis
  if (input.transcript) {
    formData.append("transcript", input.transcript);
  }

  const response = await fetch("/api/analyze", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as Partial<PhonemeResult> & {
    error?: string;
  };

  if (!response.ok || payload.error) {
    throw new Error(payload.error || "Analysis failed.");
  }

  return {
    ...DEFAULT_ANALYSIS,
    ...payload,
    feedback:
      typeof payload.feedback === "string" && payload.feedback.trim()
        ? payload.feedback.trim()
        : DEFAULT_ANALYSIS.feedback,
    mouthCue:
      typeof payload.mouthCue === "string" ? payload.mouthCue.trim() : DEFAULT_ANALYSIS.mouthCue,
    score: typeof payload.score === "number" ? payload.score : DEFAULT_ANALYSIS.score,
    substitution: payload.substitution ?? DEFAULT_ANALYSIS.substitution,
  };
}

export async function fetchCelebrationMessage(input: {
  accuracy: number;
  count: number;
  fallback: string;
  sound: string;
}): Promise<string> {
  try {
    const response = await fetch("/api/celebrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accuracy: input.accuracy,
        count: input.count,
        sound: input.sound,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    return typeof payload.message === "string" && payload.message.trim()
      ? payload.message.trim()
      : input.fallback;
  } catch {
    return input.fallback;
  }
}

export async function saveCompletedSession(sessionData: SessionData): Promise<{
  newStreak: number | null;
  xpEarned: number;
}> {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...sessionData,
      completed: true,
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    newStreak?: number | null;
    xpEarned?: number;
  };

  if (!response.ok || payload.error) {
    throw new Error(payload.error || "Session save failed.");
  }

  return {
    newStreak: typeof payload.newStreak === "number" ? payload.newStreak : null,
    xpEarned: typeof payload.xpEarned === "number" ? payload.xpEarned : 0,
  };
}
