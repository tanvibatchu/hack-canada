"use client";

const SPEAK_API = "/api/tts";

type QueueItem = {
  id: number;
  speed: number;
  text: string;
  resolve: () => void;
  reject: (error: Error) => void;
};

let nextQueueId = 0;
let queue: QueueItem[] = [];
let isProcessing = false;
let currentAbortController: AbortController | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;
let _muted = false;
let _lastText = "";
let _lastSpeed = 1;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === "AbortError"
    : error instanceof Error && error.name === "AbortError";
}

async function fetchAudioBlob(
  text: string,
  speed: number,
  signal: AbortSignal
): Promise<Blob> {
  const response = await fetch(SPEAK_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speed }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Speak API error (${response.status}): ${errorText}`);
  }

  return response.blob();
}

async function playAudioBlob(blob: Blob, signal: AbortSignal): Promise<void> {
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);

  currentAudio = audio;
  currentAudioUrl = audioUrl;

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;

      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      signal.removeEventListener("abort", handleAbort);
      audio.pause();
      audio.currentTime = 0;

      if (currentAudio === audio) {
        currentAudio = null;
      }

      if (currentAudioUrl === audioUrl) {
        currentAudioUrl = null;
      }

      URL.revokeObjectURL(audioUrl);

      if (error) {
        reject(error);
        return;
      }

      resolve();
    };

    const handleEnded = () => finish();
    const handleError = () => finish(new Error("Nova's audio could not be played."));
    const handleAbort = () => finish(new DOMException("Audio playback aborted.", "AbortError"));

    audio.addEventListener("ended", handleEnded, { once: true });
    audio.addEventListener("error", handleError, { once: true });
    signal.addEventListener("abort", handleAbort, { once: true });

    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch((error) => {
        finish(error instanceof Error ? error : new Error(String(error)));
      });
    }
  });
}

async function processQueue(): Promise<void> {
  if (isProcessing) return;

  isProcessing = true;

  try {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const controller = new AbortController();
      currentAbortController = controller;

      try {
        const blob = await fetchAudioBlob(item.text, item.speed, controller.signal);
        await playAudioBlob(blob, controller.signal);
        item.resolve();
      } catch (error) {
        if (isAbortError(error)) {
          item.resolve();
        } else {
          item.reject(error instanceof Error ? error : new Error(String(error)));
        }
      } finally {
        if (currentAbortController === controller) {
          currentAbortController = null;
        }
      }
    }
  } finally {
    isProcessing = false;

    if (queue.length > 0) {
      void processQueue();
    }
  }
}

export function stopCurrentAudio(): void {
  const pendingItems = queue;
  queue = [];

  pendingItems.forEach((item) => item.resolve());

  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }

  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  if (currentAudioUrl) {
    URL.revokeObjectURL(currentAudioUrl);
    currentAudioUrl = null;
  }
}

export async function speakAsNova(text: string, speed = 1): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("speakAsNova must run in the browser.");
  }

  const normalizedText = text.trim();
  if (!normalizedText) return;
  _lastText = normalizedText;
  _lastSpeed = speed;

  await new Promise<void>((resolve, reject) => {
    queue.push({
      id: ++nextQueueId,
      speed,
      text: normalizedText,
      resolve,
      reject,
    });

    void processQueue();
  });
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildSlowPhrase(word: string, targetSound: string): string {
  const upper = targetSound.toUpperCase();
  const lower = targetSound.toLowerCase();
  const letters = upper === lower ? [targetSound] : [lower, upper];
  const repeated = letters.map((letter) => `${letter} ...`).join(" ");
  return `${repeated} ${word}`.trim();
}

export async function demonstrateWord(word: string, targetSound: string): Promise<void> {
  const slowPhrase = buildSlowPhrase(word, targetSound);
  await speakAsNova(slowPhrase, 0.7);
  await delay(800);
  await speakAsNova(word, 1);
}

// ── AudioControls compatibility exports ──────────────────────────────────────

export function isMuted(): boolean {
  return _muted;
}

export function setMuted(muted: boolean): void {
  _muted = muted;
  if (currentAudio) {
    currentAudio.volume = muted ? 0 : 1;
  }
}

export async function repeatLastAudio(): Promise<void> {
  if (!_lastText) return;
  await speakAsNova(_lastText, _lastSpeed);
}
