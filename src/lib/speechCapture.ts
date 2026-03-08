"use client";

export type SpeechCaptureResult = {
  blob: Blob;
  mimeType: string;
  transcript: string;
};

type ResultHandler = (result: SpeechCaptureResult) => void;
type ErrorHandler = (message: string) => void;

// Use a plain object type to avoid referencing the SpeechRecognition global in an interface
type RecognitionInstance = {
  abort: () => void;
  start: () => void;
  stop: () => void;
};

type CaptureState = {
  chunks: BlobPart[];
  onResult: ResultHandler;
  onError: ErrorHandler;
  recorder: MediaRecorder;
  recognition: RecognitionInstance | null;
  shouldEmit: boolean;
  stream: MediaStream;
  token: number;
  transcript: string;
};

const MIME_TYPE_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

let activeCapture: CaptureState | null = null;
let pendingToken: number | null = null;
let stopRequestedToken: number | null = null;
let captureToken = 0;

function stopTracks(stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    track.stop();
  });
}

function pickMimeType(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  return MIME_TYPE_CANDIDATES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType)) ?? "";
}

function cleanupCapture(target: CaptureState): void {
  stopTracks(target.stream);

  if (target.recognition) {
    try {
      target.recognition.abort();
    } catch {
      /* ignore */
    }
  }

  if (activeCapture?.token === target.token) {
    activeCapture = null;
  }
}

function cancelActiveCapture(): void {
  const target = activeCapture;
  if (!target) return;

  target.shouldEmit = false;

  if (target.recorder.state !== "inactive") {
    try {
      target.recorder.stop();
      return;
    } catch {
      /* fall through to hard cleanup */
    }
  }

  cleanupCapture(target);
}

function getSpeechRecognitionCtor(): (new () => RecognitionInstance & {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } | undefined } | undefined } }) => void) | null;
  onerror: (() => void) | null;
}) | null {
  if (typeof window === "undefined") return null;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const w = window as any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition) as ReturnType<typeof getSpeechRecognitionCtor>;
}

function startSpeechRecognition(capture: CaptureState): void {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) return;

  try {
    const recognition = new Ctor();
    recognition.lang = "en-CA";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript;
      if (typeof text === "string" && text.trim()) {
        capture.transcript = text.trim().toLowerCase();
      }
    };

    // Silently swallow recognition errors — transcript stays as empty string
    recognition.onerror = () => { /* fall back to audio analysis */ };

    recognition.start();
    capture.recognition = recognition;
  } catch {
    /* speech recognition unavailable — fall back to audio analysis */
  }
}

export async function startListening(
  onResult: ResultHandler,
  onError: ErrorHandler
): Promise<void> {
  if (typeof window === "undefined") {
    onError("Microphone access is only available in the browser.");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    onError("This browser does not support microphone recording.");
    return;
  }

  if (typeof MediaRecorder === "undefined") {
    onError("This browser does not support audio recording.");
    return;
  }

  cancelActiveCapture();

  const token = ++captureToken;
  pendingToken = token;
  stopRequestedToken = null;

  let stream: MediaStream;

  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    if (pendingToken === token) {
      pendingToken = null;
    }

    const message = error instanceof Error ? error.message : "Microphone permission was denied.";
    onError(message);
    return;
  }

  if (pendingToken !== token) {
    stopTracks(stream);
    return;
  }

  pendingToken = null;

  try {
    const preferredMimeType = pickMimeType();
    const recorder = preferredMimeType
      ? new MediaRecorder(stream, { mimeType: preferredMimeType })
      : new MediaRecorder(stream);

    const capture: CaptureState = {
      chunks: [],
      onResult,
      onError,
      recorder,
      recognition: null,
      shouldEmit: true,
      stream,
      token,
      transcript: "",
    };

    activeCapture = capture;

    // Start Web Speech API in parallel for transcript capture
    startSpeechRecognition(capture);

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        capture.chunks.push(event.data);
      }
    });

    recorder.addEventListener("error", () => {
      capture.shouldEmit = false;
      cleanupCapture(capture);
      capture.onError("Recording stopped unexpectedly. Let's try again.");
    });

    recorder.addEventListener(
      "stop",
      () => {
        const mimeType = recorder.mimeType || preferredMimeType || "audio/webm";
        const blob = new Blob(capture.chunks, { type: mimeType });
        const shouldEmit = capture.shouldEmit;
        const transcript = capture.transcript;

        cleanupCapture(capture);

        if (!shouldEmit) return;

        if (blob.size === 0) {
          capture.onError("We didn't hear anything. Try holding the mic a little longer.");
          return;
        }

        capture.onResult({ blob, mimeType, transcript });
      },
      { once: true }
    );

    recorder.start();

    if (stopRequestedToken === token) {
      stopRequestedToken = null;
      stopListening();
    }
  } catch (error) {
    stopTracks(stream);
    const message = error instanceof Error ? error.message : "Unable to start recording.";
    onError(message);
  }
}

export function stopListening(options: { cancel?: boolean } = {}): void {
  const target = activeCapture;

  if (!target) {
    if (pendingToken !== null) {
      stopRequestedToken = pendingToken;
      if (options.cancel) {
        pendingToken = null;
      }
    }
    return;
  }

  if (options.cancel) {
    target.shouldEmit = false;
  }

  // Stop speech recognition first so it has a chance to fire onresult
  if (target.recognition) {
    try {
      target.recognition.stop();
    } catch {
      /* ignore */
    }
  }

  if (target.recorder.state === "inactive") {
    cleanupCapture(target);
    return;
  }

  try {
    target.recorder.requestData();
  } catch {
    /* requestData is not required */
  }

  try {
    target.recorder.stop();
  } catch {
    target.shouldEmit = false;
    cleanupCapture(target);
    target.onError("Recording could not be finished. Please try again.");
  }
}
