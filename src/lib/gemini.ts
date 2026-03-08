import type {
  FluencyResult,
  PhonemeResult,
  PredictionResult,
  SessionData,
} from "@/types";

export type { PhonemeResult };

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-2.5-flash";

type GeminiTextPart = { text: string };
type GeminiInlineDataPart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};

type GeminiPart = GeminiTextPart | GeminiInlineDataPart;

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return apiKey;
}

function parseGeminiJson<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const objectText = cleaned.match(/\{[\s\S]*\}/)?.[0] ?? cleaned;
  return JSON.parse(objectText) as T;
}

function extractTextResponse(response: unknown): string {
  const candidate = (response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  }).candidates?.[0];

  const text = candidate?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned no text.");
  }

  return text;
}

async function callGemini(parts: GeminiPart[]): Promise<string> {
  const apiKey = getApiKey();
  const response = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const payload = (await response.json()) as unknown;
  return extractTextResponse(payload);
}

function normalizePhonemeResult(result: Partial<PhonemeResult>): PhonemeResult {
  return {
    correct: Boolean(result.correct),
    score: typeof result.score === "number" ? result.score : 0,
    substitution: result.substitution ?? null,
    feedback: typeof result.feedback === "string" && result.feedback.trim()
      ? result.feedback.trim()
      : "Great try!",
    mouthCue: typeof result.mouthCue === "string" ? result.mouthCue.trim() : "",
    tryAgain: Boolean(result.tryAgain),
  };
}

export async function analyzePronunciationAudio(input: {
  age: number;
  audioBase64: string;
  mimeType: string;
  targetSound: string;
  word: string;
}): Promise<PhonemeResult> {
  const prompt = [
    "You are a pediatric speech-language pathologist assistant.",
    `Child age: ${input.age}`,
    `Target sound: ${input.targetSound}`,
    `Target word: ${input.word}`,
    "Listen to the audio and analyze the child's pronunciation.",
    "Respond in JSON only, no other text:",
    "{",
    '  "correct": boolean,',
    '  "score": number (0-100),',
    '  "substitution": string or null,',
    '  "feedback": string (max 12 words, child-friendly, encouraging),',
    '  "mouthCue": string (one sentence about tongue/lip placement),',
    '  "tryAgain": boolean',
    "}",
  ].join("\n");

  const raw = await callGemini([
    { text: prompt },
    {
      inlineData: {
        mimeType: input.mimeType || "audio/webm",
        data: input.audioBase64,
      },
    },
  ]);

  return normalizePhonemeResult(parseGeminiJson<PhonemeResult>(raw));
}

export async function analyzePhoneme(
  wordOrOptions:
    | string
    | {
        age: number;
        targetSound: string;
        transcript: string;
        word: string;
      },
  transcript?: string,
  targetSound?: string,
  age?: number
): Promise<PhonemeResult> {
  const payload =
    typeof wordOrOptions === "string"
      ? {
          age: age ?? 6,
          targetSound: targetSound ?? "",
          transcript: transcript ?? "",
          word: wordOrOptions,
        }
      : wordOrOptions;

  const prompt = [
    "You are a pediatric speech-language pathologist (SLP) scoring a child's pronunciation attempt.",
    `Child age: ${payload.age} years old`,
    `Target sound: /${payload.targetSound}/`,
    `Target word: "${payload.word}"`,
    `What the child said (speech-to-text transcript): "${payload.transcript}"`,
    "",
    "SCORING GUIDELINES for pediatric SLP:",
    "- Children's pronunciation is naturally imprecise. Grade on a curve appropriate for the child's age.",
    `- A ${payload.age}-year-old is held to a lower standard than a 10-year-old. Ages 4-6 should pass with any recognizable approximation of the target sound.`,
    "- 'correct' should be true if a real SLP would consider this a reasonable attempt for the child's age — not just perfect adult pronunciation.",
    "- Near-correct approximations (e.g. slight distortions, reduced precision) count as correct.",
    "- For the /th/ sound specifically: dental approximations like 'd', 'f', or 'v' substitutions are very common developmentally and should NOT cause failure for children under 8. Accept 'th' attempts where the child clearly tried even if imperfect.",
    "- For /r/ sound: do not require a perfect retroflex 'r'. A clear attempt at the /r/ sound even if slightly distorted counts as correct for ages under 9.",
    "- If the transcript shows the correct word was said even imperfectly, lean toward correct=true.",
    "- Only return correct=false if the target sound is clearly missing or heavily substituted with a very different sound in a way that would concern a real SLP.",
    "- Do NOT be so lenient that any random word passes. The target word must be at least approximately recognizable.",
    "",
    "Respond in JSON only, no other text:",
    "{",
    '  "correct": boolean,',
    '  "score": number (0-100, where 70+ means passing for this child\'s age),',
    '  "substitution": string or null (what sound the child used instead, e.g. "w for r"),',
    '  "feedback": string (max 12 words, warm and encouraging, no negativity, no "wrong"),',
    '  "mouthCue": string (one short sentence about tongue or lip placement, child-friendly),',
    '  "tryAgain": boolean (true only if clearly needs another attempt)',
    "}",
  ].join("\n");

  const raw = await callGemini([{ text: prompt }]);
  return normalizePhonemeResult(parseGeminiJson<PhonemeResult>(raw));
}

// Stricter analysis for Speak Up mode — requires the target word to be recognizable
export async function analyzeVoiceAttempt(input: {
  age: number;
  targetSound: string;
  transcript: string;
  word: string;
}): Promise<PhonemeResult> {
  const prompt = [
    "You are a pediatric speech-language pathologist scoring a child's voice clarity exercise.",
    `Child age: ${input.age} years old`,
    `Target word to say: "${input.word}"`,
    `What the child said (speech-to-text transcript): "${input.transcript}"`,
    "",
    "SCORING RULES for this voice exercise:",
    `- The child MUST have attempted to say the target word "${input.word}". If the transcript shows a completely different word, unrelated sounds, or is blank/unclear, return correct=false.`,
    "- Filler words (e.g. 'um', 'uh', 'hi', 'okay'), single syllables that don't match, or whispered/inaudible attempts must not pass.",
    "- The target word must be recognizable in the transcript — it does not need to be perfect but must be at least approximately the right word.",
    "- If the word is present and reasonably clear, return correct=true. Age-appropriate pronunciation variations are fine.",
    "- The goal is voice clarity and volume, not phoneme perfection.",
    "",
    "Respond in JSON only, no other text:",
    "{",
    '  "correct": boolean,',
    '  "score": number (0-100),',
    '  "substitution": string or null,',
    '  "feedback": string (max 12 words, warm and encouraging),',
    '  "mouthCue": string (one short child-friendly sentence about using a strong clear voice),',
    '  "tryAgain": boolean',
    "}",
  ].join("\n");

  const raw = await callGemini([{ text: prompt }]);
  return normalizePhonemeResult(parseGeminiJson<PhonemeResult>(raw));
}


export async function generateSessionCelebration(
  sound: string,
  count: number,
  accuracy: number
): Promise<string> {
  const prompt = [
    "Child just completed a speech practice session.",
    `Sound: ${sound}`,
    `Words attempted: ${count}`,
    `Accuracy: ${accuracy}%`,
    'Respond in JSON only: { "message": string }',
  ].join("\n");

  try {
    const raw = await callGemini([{ text: prompt }]);
    const parsed = parseGeminiJson<{ message?: string }>(raw);
    return typeof parsed.message === "string" && parsed.message.trim()
      ? parsed.message.trim()
      : "You did amazing today! I am so proud of you!";
  } catch {
    return "You did amazing today! I am so proud of you!";
  }
}

function normalizeFluencyResult(result: Partial<FluencyResult>): FluencyResult {
  const rhythm = result.rhythm;
  const safeRhythm =
    rhythm === "good" || rhythm === "rushed" || rhythm === "hesitant"
      ? rhythm
      : "hesitant";

  return {
    encouragement: typeof result.encouragement === "string" ? result.encouragement : "",
    feedback: typeof result.feedback === "string" ? result.feedback : "",
    rhythm: safeRhythm,
    score: typeof result.score === "number" ? result.score : 0,
  };
}

export async function analyzeFluency(
  phrase: string,
  transcript: string,
  age: number
): Promise<FluencyResult> {
  const prompt = [
    "You are a pediatric speech-language pathologist assistant.",
    `Child age: ${age}`,
    `Target phrase: ${phrase}`,
    `What the child said: ${transcript}`,
    'Respond in JSON only: { "score": number, "rhythm": "good" | "rushed" | "hesitant", "feedback": string, "encouragement": string }',
  ].join("\n");

  const raw = await callGemini([{ text: prompt }]);
  return normalizeFluencyResult(parseGeminiJson<FluencyResult>(raw));
}

function normalizePredictionResult(result: Partial<PredictionResult>): PredictionResult {
  const trend = result.trend;
  const safeTrend =
    trend === "improving" || trend === "plateau" || trend === "inconsistent"
      ? trend
      : "inconsistent";

  return {
    currentAccuracy:
      typeof result.currentAccuracy === "number" ? result.currentAccuracy : 0,
    parentInsight:
      typeof result.parentInsight === "string" ? result.parentInsight : "",
    trend: safeTrend,
    weeklyImprovementRate:
      typeof result.weeklyImprovementRate === "number"
        ? result.weeklyImprovementRate
        : 0,
    weeksToMastery:
      typeof result.weeksToMastery === "number" ? result.weeksToMastery : 0,
  };
}

export async function predictImprovement(
  sessions: SessionData[],
  targetSound: string,
  age: number
): Promise<PredictionResult> {
  const summarizedSessions = JSON.stringify(
    sessions.map((session) => ({
      attemptCount: session.attempts.length,
      averageAccuracy: session.averageAccuracy,
      date: session.date,
      durationSeconds: session.durationSeconds,
      targetSound: session.targetSound,
    }))
  );

  const prompt = [
    "You are a pediatric speech-language pathologist assistant.",
    `Child age: ${age}`,
    `Target sound: ${targetSound}`,
    `Past sessions summary: ${summarizedSessions}`,
    'Respond in JSON only: { "currentAccuracy": number, "weeklyImprovementRate": number, "weeksToMastery": number, "parentInsight": string, "trend": "improving" | "plateau" | "inconsistent" }',
  ].join("\n");

  const raw = await callGemini([{ text: prompt }]);
  return normalizePredictionResult(parseGeminiJson<PredictionResult>(raw));
}
