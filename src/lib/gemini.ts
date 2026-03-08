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

// Re-export so pages can import PhonemeResult from "@/lib/gemini"
export type { PhonemeResult };

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Per product spec, use gemini-1.5-flash (flash-tier) for fast, low-latency feedback
const MODEL = "gemini-1.5-flash";

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set in .env.local");
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
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    }),
  });
  if (!res.ok) { const errText = await res.text(); throw new Error(`Gemini API error (${res.status}): ${errText}`); }
  const data = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini API returned no text");
  return text;
}

/**
 * Analyzes child's pronunciation. Accepts positional args OR an options object.
 */
export async function analyzePhoneme(
  wordOrOpts: string | { word: string; transcript: string; targetSound: string; age: number },
  transcript?: string,
  targetSound?: string,
  age?: number
): Promise<PhonemeResult> {
  let w: string, t: string, ts: string, a: number;
  if (typeof wordOrOpts === "object") {
    w = wordOrOpts.word; t = wordOrOpts.transcript;
    ts = wordOrOpts.targetSound; a = wordOrOpts.age;
  } else {
    w = wordOrOpts; t = transcript!; ts = targetSound!; a = age!;
  }
  try {
    // Prompt 1 — Phoneme analysis (kid feedback)
    const prompt = [
      "You are a pediatric speech-language pathologist assistant.",
      `Child age: ${a}`,
      `Target sound: ${ts}`,
      `Target word: ${w}`,
      `What the child said: ${t}`,
      "Respond in JSON only:",
      "{",
      '  "correct": boolean,',
      '  "score": number (0-100),',
      '  "substitution": string or null,',
      '  "feedback": string (max 12 words, child-friendly, encouraging),',
      '  "mouthCue": string (one sentence about tongue/lip placement),',
      '  "tryAgain": boolean',
      "}",
    ].join("\n");

    const raw = await callGemini(prompt);
    return normalizePhonemeResult(JSON.parse(raw) as PhonemeResult);
  } catch (err) { throw err instanceof Error ? err : new Error(String(err)); }
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
 * Prompt 2 — Session summary celebration line for the child.
 * Returns a short celebratory sentence (<=15 words).
 */
export async function generateSessionCelebration(
  sound: string,
  count: number,
  accuracy: number
): Promise<string> {
  const prompt = [
    "Child just completed a speech practice session.",
    `Sound: ${sound}, Words attempted: ${count}, Accuracy: ${accuracy}%`,
    "Write one celebratory sentence (max 15 words) for the child to hear.",
    'Respond in JSON only: { "message": string }',
  ].join("\n");

  const raw = await callGemini(prompt);
  try {
    const parsed = JSON.parse(raw) as { message?: string };
    return typeof parsed?.message === "string" && parsed.message.trim()
      ? parsed.message.trim()
      : "You did amazing today! I am so proud of you!";
  } catch {
    return "You did amazing today! I am so proud of you!";
  }
}

export async function analyzeFluency(phrase: string, transcript: string, age: number): Promise<FluencyResult> {
  try {
    const prompt = `You are a pediatric speech-language pathologist assistant.\nChild age: ${age}\nTarget phrase: ${phrase}\nWhat the child said: ${transcript}\nRespond in JSON only, no other text:\n{ "score": number 0-100, "rhythm": "good" | "rushed" | "hesitant", "feedback": string, "encouragement": string }`;
    const raw = await callGemini(prompt);
    return normalizeFluencyResult(JSON.parse(raw) as FluencyResult);
  } catch (err) { throw err instanceof Error ? err : new Error(String(err)); }
}

function normalizeFluencyResult(r: Partial<FluencyResult>): FluencyResult {
  const rhythm = r?.rhythm;
  const validRhythm = rhythm === "good" || rhythm === "rushed" || rhythm === "hesitant" ? rhythm : "hesitant";
  return { score: typeof r?.score === "number" ? r.score : 0, rhythm: validRhythm, feedback: String(r?.feedback ?? ""), encouragement: String(r?.encouragement ?? "") };
}

export async function predictImprovement(sessions: SessionData[], targetSound: string, age: number): Promise<PredictionResult> {
  try {
    const summary = JSON.stringify(sessions.map(s => ({ date: s.date, durationSeconds: s.durationSeconds, targetSound: s.targetSound, attemptCount: s.attempts.length, averageAccuracy: s.averageAccuracy })));
    const prompt = `You are a pediatric speech-language pathologist assistant.\nChild age: ${age}\nTarget sound: ${targetSound}\nPast sessions summary (JSON): ${summary}\nRespond in JSON only, no other text:\n{ "currentAccuracy": number 0-100, "weeklyImprovementRate": number, "weeksToMastery": number, "parentInsight": string, "trend": "improving" | "plateau" | "inconsistent" }`;
    const raw = await callGemini(prompt);
    return normalizePredictionResult(JSON.parse(raw) as PredictionResult);
  } catch (err) { throw err instanceof Error ? err : new Error(String(err)); }
}

function normalizePredictionResult(r: Partial<PredictionResult>): PredictionResult {
  const trend = r?.trend;
  const validTrend = trend === "improving" || trend === "plateau" || trend === "inconsistent" ? trend : "inconsistent";
  return {
    currentAccuracy: typeof r?.currentAccuracy === "number" ? r.currentAccuracy : 0,
    weeklyImprovementRate: typeof r?.weeklyImprovementRate === "number" ? r.weeklyImprovementRate : 0,
    weeksToMastery: typeof r?.weeksToMastery === "number" ? r.weeksToMastery : 0,
    parentInsight: String(r?.parentInsight ?? ""),
    trend: validTrend,
  };
}
