/**
 * Client-side ElevenLabs TTS: speaks text via Nova voice and plays in browser using AudioContext.
 * Calls the /api/speak route (server-side) to avoid exposing API keys.
 * Import: speakAsNova, demonstrateWord
 */

const SPEAK_API = "/api/speak";

function getAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    throw new Error("speakAsNova and demonstrateWord must run in the browser");
  }
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
}

/**
 * Fetches audio from /api/speak and plays it in the browser via AudioContext.
 * Voice settings (stability 0.7, similarity_boost 0.8, style 0.3) are applied server-side.
 */
export async function speakAsNova(text: string, speed = 1): Promise<void> {
  try {
    const res = await fetch(SPEAK_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speed }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Speak API error (${res.status}): ${errText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const ctx = getAudioContext();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(ctx.destination);
    source.start(0);
    await new Promise<void>((resolve) => {
      source.onended = () => resolve();
      const timeout = setTimeout(resolve, (decoded.duration + 0.5) * 1000);
      source.addEventListener("ended", () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
    });
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Builds a slow pronunciation hint: repeats target sound letters with pauses, then the word.
 * E.g. for "rabbit" and "r" -> "r ... r ... rabbit".
 */
function buildSlowPhrase(word: string, targetSound: string): string {
  const upper = targetSound.toUpperCase();
  const lower = targetSound.toLowerCase();
  const letters = upper === lower ? [targetSound] : [lower, upper];
  const repeated = letters.map((l) => `${l} ...`).join(" ");
  return `${repeated} ${word}`.trim();
}

/**
 * Speaks the word slowly first (repeating target sound with pauses), waits 800ms, then speaks normally.
 */
export async function demonstrateWord(
  word: string,
  targetSound: string
): Promise<void> {
  try {
    const slowPhrase = buildSlowPhrase(word, targetSound);
    await speakAsNova(slowPhrase, 0.7);
    await delay(800);
    await speakAsNova(word, 1);
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}
