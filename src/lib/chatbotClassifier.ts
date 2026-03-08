import { db } from "@/lib/firebase";

const SLP_KEYWORDS = [
  "speech", "articulation", "apraxia", "dysarthria", "stutter", "stammer",
  "fluency", "phoneme", "phonology", "phonological", "language delay",
  "language disorder", "therapy", "slp", "slps", "pronunciation", "sound",
  "lisp", "voice", "swallowing", "aac", "augmentative", "communication",
  "word", "sentence", "grammar", "vocabulary", "reading", "dyslexia",
  "autism", "asd", "developmental", "delay", "milestone", "tongue",
  "mouth", "lips", "breath", "vocal", "hearing", "auditory", "blend",
  "rhyme", "syllable", "consonant", "vowel", "motor", "oral", "verbal",
  "nonverbal", "sign", "gesture", "expressive", "receptive", "pragmatic",
  "dttc", "lsvt", "prompt", "nuffield", "asha", "rcslt", "casana",
  "childhood apraxia", "developmental language disorder", "dld", "sli", "cas",
  "pathologist", "pathology", "intervention", "sources", "research", "studies",
];

export interface ClassificationResult {
  relevant: boolean;
  rejection?: string;
  confidence: number;
}

export function classifyQuery(question: string): ClassificationResult {
  const lower = question.toLowerCase();
  let matches = 0;
  for (const kw of SLP_KEYWORDS) { if (lower.includes(kw)) matches++; }
  if (matches === 0) {
    return { relevant: false, rejection: "I specialise in speech and language therapy for children. Please ask me about your child's communication development, therapy techniques, or speech milestones.", confidence: 0 };
  }
  return { relevant: true, confidence: Math.min(matches / 3, 1) };
}

const DAILY_LIMIT = 20;

export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const ref = db.collection("chatbotLimits").doc(`${userId}_${today}`);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({ count: 1, userId, date: today, createdAt: new Date() });
      return { allowed: true, remaining: DAILY_LIMIT - 1 };
    }
    const count = snap.data()?.count ?? 0;
    if (count >= DAILY_LIMIT) return { allowed: false, remaining: 0 };
    await ref.update({ count: count + 1 });
    return { allowed: true, remaining: DAILY_LIMIT - count - 1 };
  } catch (e) {
    console.error("Rate limit error:", e);
    return { allowed: true, remaining: DAILY_LIMIT };
  }
}
