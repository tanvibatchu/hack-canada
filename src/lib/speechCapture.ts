/**
 * Web Speech API wrapper for capturing child speech (en-CA).
 * Import: startListening, stopListening
 */

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export interface SpeechRecognitionInstance {
  start(): void;
  stop(): void;
  abort(): void;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

export type SpeechRecognition = SpeechRecognitionInstance;

function getSpeechRecognition(): new () => SpeechRecognitionInstance {
  if (typeof window === "undefined") {
    throw new Error("Speech recognition is only available in the browser");
  }
  const Klass = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Klass) {
    throw new Error("SpeechRecognition is not supported in this browser");
  }
  return Klass;
}

/**
 * Starts listening for speech and invokes onResult with the best transcript and confidence.
 * Returns the recognition instance so the caller can stop it.
 * lang: en-CA, interimResults: false, maxAlternatives: 3.
 */
export function startListening(
  onResult: (transcript: string, confidence: number) => void,
  onError: (error: string) => void
): SpeechRecognition {
  try {
    const Recognition = getSpeechRecognition();
    const recognition = new Recognition();
    recognition.lang = "en-CA";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      const item = result.isFinal ? result[0] : result[result.length - 1];
      const transcript = (item?.transcript ?? "").trim();
      const confidence = typeof item?.confidence === "number" ? item.confidence : 0;
      if (transcript) {
        onResult(transcript, confidence);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const msg = event.message ?? event.error ?? "Speech recognition error";
      onError(String(msg));
    };

    recognition.start();
    return recognition;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    onError(message);
    throw err;
  }
}

/**
 * Stops the given recognition instance.
 */
export function stopListening(recognition: SpeechRecognition): void {
  try {
    recognition.stop();
  } catch {
    try {
      recognition.abort();
    } catch {
      // ignore
    }
  }
}
