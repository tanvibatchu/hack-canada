/**
 * Client-side ElevenLabs TTS: speaks text via Nova voice and plays in browser using AudioContext.
 * Calls the /api/tts route (server-side) to avoid exposing API keys.
 * Import: speakAsNova, demonstrateWord
 *
 * Uses a singleton AudioContext to avoid Chrome's ~6-context limit.
 * Stops any currently-playing audio before starting new audio so concurrent
 * calls (e.g. from React Strict Mode double-mount) never overlap.
 */

const SPEAK_API = "/api/tts";

// Singleton AudioContext — reused across all calls to avoid the ~6-context browser limit.
let _ctx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (typeof window === "undefined") {
    throw new Error("speakAsNova must run in the browser");
  }
  if (!_ctx || _ctx.state === "closed") {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    _ctx = new AC();
  }
  return _ctx;
}



// Track the currently-playing source so we can stop it before starting a new one.
let _currentSource: AudioBufferSourceNode | null = null;
let _currentGain: GainNode | null = null;
let _isMuted = false;
let _lastBuffer: AudioBuffer | null = null;

export function setMuted(muted: boolean): void {
  _isMuted = muted;
  if (_currentGain) {
    _currentGain.gain.value = muted ? 0 : 1;
  }
}

export function isMuted(): boolean {
  return _isMuted;
}

/** Stop whatever is currently playing (if anything). */
export function stopCurrentAudio(): void {
  if (_currentSource) {
    try { _currentSource.stop(); } catch { /* already stopped */ }
    _currentSource = null;
  }
  _currentGain = null;
}

// Tracks whether the AudioContext has been warmed up after its first resume.
// Chrome resolves AudioContext.resume() before audio hardware is truly ready —
// playing immediately can result in silent first-clip. A brief warmup delay fixes this.
let _contextWarmedUp = false;

/**
 * Fetches audio from /api/speak and plays it in the browser via a singleton AudioContext.
 * Stops any in-progress audio first so calls never overlap.
 *
 * IMPORTANT: getAudioContext() and resume() are called SYNCHRONOUSLY before any `await`
 * so they execute while still inside the user-gesture callstack. Browsers only allow
 * AudioContext.resume() within a user gesture — calling it after an await loses that context.
 */
export async function speakAsNova(text: string, speed = 1): Promise<void> {
  // ── Must happen synchronously (before any await) to stay in user-gesture context ──
  const ctx = getAudioContext();
  const wasSupended = ctx.state === "suspended";
  const resumePromise = wasSupended ? ctx.resume() : Promise.resolve();
  stopCurrentAudio();
  // ────────────────────────────────────────────────────────────────────────────────────

  try {
    // Fetch audio and resume AudioContext in parallel
    const [res] = await Promise.all([
      fetch(SPEAK_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, speed }),
      }),
      resumePromise,
    ]);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Speak API error (${res.status}): ${errText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));

    _lastBuffer = decoded;

    // First-play hardware warmup: Chrome marks AudioContext resumed before the audio
    // hardware output is fully connected. A short delay ensures the first clip is audible.
    if (!_contextWarmedUp) {
      await new Promise(r => setTimeout(r, 150));
      _contextWarmedUp = true;
    }

    // Stop again in case something else started while we were fetching/warming up
    stopCurrentAudio();

    const source = ctx.createBufferSource();
    source.buffer = decoded;

    const gainNode = ctx.createGain();
    gainNode.gain.value = _isMuted ? 0 : 1;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    _currentSource = source;
    _currentGain = gainNode;
    source.start(0);

    // audioEndedPromise: resolves when the source finishes naturally, or safety-timeout fires
    const audioEndedPromise = new Promise<void>((resolve) => {
      const done = () => {
        if (_currentSource === source) {
          _currentSource = null;
          _currentGain = null;
        }
        resolve();
      };
      source.addEventListener("ended", done, { once: true });
      // Safety: if "ended" never fires (hardware glitch), unblock after duration + 2s
      setTimeout(done, (decoded.duration + 2) * 1000);
    });

    // minDurationPromise: ensures we wait at least 800ms so short phoneme clips are audible.
    // Without this, a 100ms clip's "ended" event fires instantly and we move on before
    // the child can hear anything.
    const minDurationPromise = new Promise<void>(r =>
      setTimeout(r, Math.max(decoded.duration * 1000, 800))
    );

    // Wait for BOTH: audio must have finished AND minimum time must have elapsed
    await Promise.all([audioEndedPromise, minDurationPromise]);
  } catch (err) {
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * Replays the last requested audio buffer through the same gain-node pipeline, bypassing the network fetch.
 * Returns a promise that resolves when the audio completes, ensuring UI animations remain synchronous.
 */
export async function repeatLastAudio(): Promise<void> {
  if (!_lastBuffer) return;
  const ctx = getAudioContext();
  if (ctx.state === "suspended") await ctx.resume();
  stopCurrentAudio();

  const source = ctx.createBufferSource();
  source.buffer = _lastBuffer;

  const gainNode = ctx.createGain();
  gainNode.gain.value = _isMuted ? 0 : 1;

  source.connect(gainNode);
  gainNode.connect(ctx.destination);

  _currentSource = source;
  _currentGain = gainNode;
  source.start(0);

  const audioEndedPromise = new Promise<void>((resolve) => {
    const done = () => {
      if (_currentSource === source) {
        _currentSource = null;
        _currentGain = null;
      }
      resolve();
    };
    source.addEventListener("ended", done, { once: true });
    setTimeout(done, (_lastBuffer!.duration + 2) * 1000);
  });

  const minDurationPromise = new Promise<void>(r =>
    setTimeout(r, Math.max(_lastBuffer!.duration * 1000, 800))
  );

  await Promise.all([audioEndedPromise, minDurationPromise]);
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
