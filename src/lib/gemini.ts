/**
 * Gemini AI integration for phoneme analysis, fluency analysis, and improvement prediction.
 * Import: analyzePhoneme, analyzeFluency, predictImprovement
 */

import type {
  PhonemeResult,
  FluencyResult,
  PredictionResult,
  SessionData,
} from "@/types";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-2.0-flash";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set in .env.local");
  }
  return key;
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  const url = `${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error("Gemini API returned no text");
  }
  return text;
}

/**
 * Analyzes child's pronunciation of a target phoneme in a word.
 */
export async function analyzePhoneme(
  word: string,
  transcript: string,
  targetSound: string,
  age: number
): Promise<PhonemeResult> {
  try {
    const prompt = `You are a pediatric speech-language pathologist assistant.
Child age: ${age}
Target sound: ${targetSound}
Target word: ${word}
What the child said: ${transcript}
Respond in JSON only, no other text:
{ "correct": boolean, "score": number 0-100, "substitution": string | null, "feedback": string, "mouthCue": string, "tryAgain": boolean }`;

    const raw = await callGemini(prompt);
    const parsed = JSON.parse(raw) as PhonemeResult;
    return normalizePhonemeResult(parsed);
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

function normalizePhonemeResult(r: Partial<PhonemeResult>): PhonemeResult {
  return {
    correct: Boolean(r?.correct),
    score: typeof r?.score === "number" ? r.score : 0,
    substitution: r?.substitution ?? null,
    feedback: String(r?.feedback ?? ""),
    mouthCue: String(r?.mouthCue ?? ""),
    tryAgain: Boolean(r?.tryAgain),
  };
}

/**
 * Analyzes fluency (rhythm, pacing) of a phrase.
 */
export async function analyzeFluency(
  phrase: string,
  transcript: string,
  age: number
): Promise<FluencyResult> {
  try {
    const prompt = `You are a pediatric speech-language pathologist assistant.
Child age: ${age}
Target phrase: ${phrase}
What the child said: ${transcript}
Respond in JSON only, no other text:
{ "score": number 0-100, "rhythm": "good" | "rushed" | "hesitant", "feedback": string, "encouragement": string }`;

    const raw = await callGemini(prompt);
    const parsed = JSON.parse(raw) as FluencyResult;
    return normalizeFluencyResult(parsed);
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

function normalizeFluencyResult(r: Partial<FluencyResult>): FluencyResult {
  const rhythm = r?.rhythm;
  const validRhythm =
    rhythm === "good" || rhythm === "rushed" || rhythm === "hesitant"
      ? rhythm
      : "hesitant";
  return {
    score: typeof r?.score === "number" ? r.score : 0,
    rhythm: validRhythm,
    feedback: String(r?.feedback ?? ""),
    encouragement: String(r?.encouragement ?? ""),
  };
}

/**
 * Predicts improvement trajectory from past session data.
 */
export async function predictImprovement(
  sessions: SessionData[],
  targetSound: string,
  age: number
): Promise<PredictionResult> {
  try {
    const summary = JSON.stringify(
      sessions.map((s) => ({
        date: s.date,
        durationSeconds: s.durationSeconds,
        targetSound: s.targetSound,
        attemptCount: s.attempts.length,
        averageAccuracy: s.averageAccuracy,
      }))
    );
    const prompt = `You are a pediatric speech-language pathologist assistant.
Child age: ${age}
Target sound: ${targetSound}
Past sessions summary (JSON): ${summary}
Respond in JSON only, no other text:
{ "currentAccuracy": number 0-100, "weeklyImprovementRate": number (e.g. 5 for 5% per week), "weeksToMastery": number, "parentInsight": string, "trend": "improving" | "plateau" | "inconsistent" }`;

    const raw = await callGemini(prompt);
    const parsed = JSON.parse(raw) as PredictionResult;
    return normalizePredictionResult(parsed);
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

function normalizePredictionResult(
  r: Partial<PredictionResult>
): PredictionResult {
  const trend = r?.trend;
  const validTrend =
    trend === "improving" || trend === "plateau" || trend === "inconsistent"
      ? trend
      : "inconsistent";
  return {
    currentAccuracy: typeof r?.currentAccuracy === "number" ? r.currentAccuracy : 0,
    weeklyImprovementRate:
      typeof r?.weeklyImprovementRate === "number" ? r.weeklyImprovementRate : 0,
    weeksToMastery: typeof r?.weeksToMastery === "number" ? r.weeksToMastery : 0,
    parentInsight: String(r?.parentInsight ?? ""),
    trend: validTrend,
  };
}
