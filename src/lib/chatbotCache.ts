import { db } from "@/lib/firebase";
import type { AcademicSource } from "./academicSearch";

export interface CachedAnswer {
  question: string;
  answer: string;
  sources: AcademicSource[];
  createdAt: Date;
  expiresAt: Date;
  hitCount: number;
}

const CACHE_TTL_DAYS = 7;
const SIMILARITY_THRESHOLD = 0.82;

function similarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  for (const w of wordsA) { if (wordsB.has(w)) overlap++; }
  return overlap / Math.max(wordsA.size, wordsB.size);
}

export async function getCachedAnswer(question: string): Promise<CachedAnswer | null> {
  try {
    const now = new Date();
    const snap = await db.collection("chatbotCache")
      .where("expiresAt", ">", now)
      .orderBy("expiresAt", "desc")
      .limit(50)
      .get();

    let bestMatch: CachedAnswer | null = null;
    let bestScore = 0;

    for (const doc of snap.docs) {
      const data = doc.data() as CachedAnswer;
      const score = similarity(question, data.question);
      if (score > bestScore && score >= SIMILARITY_THRESHOLD) {
        bestScore = score;
        bestMatch = data;
        await doc.ref.update({ hitCount: (data.hitCount ?? 0) + 1 });
      }
    }
    return bestMatch;
  } catch (e) {
    console.error("Cache read error:", e);
    return null;
  }
}

export async function setCachedAnswer(question: string, answer: string, sources: AcademicSource[]): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_DAYS * 24 * 60 * 60 * 1000);
    await db.collection("chatbotCache").add({
      question, answer, sources,
      createdAt: new Date(),
      expiresAt,
      hitCount: 0,
    });
  } catch (e) {
    console.error("Cache write error:", e);
  }
}
