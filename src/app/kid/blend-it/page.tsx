"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import CelebrationBurst from "@/components/CelebrationBurst";
import MicButton from "@/components/MicButton";
import Nova from "@/components/Nova";
import SessionSummary from "@/components/SessionSummary";
import StreakBadge from "@/components/StreakBadge";
import XPCounter from "@/components/XPCounter";
import {
  ChildProfile,
  fetchCelebrationMessage,
  fetchChildProfile,
  saveCompletedSession,
  submitAudioForAnalysis,
} from "@/lib/activityClient";
import { blendData, segmentToSpeech, type BlendWord } from "@/lib/blendData";
import { speakAsNova, stopCurrentAudio } from "@/lib/elevenlabs";
import type { PhonemeResult } from "@/lib/gemini";
import { startListening, stopListening, type SpeechCaptureResult } from "@/lib/speechCapture";
import {
  endSession,
  recordAttempt,
  startSession,
  type AttemptData,
  type SessionWithId,
} from "@/lib/sessionManager";
import type { TargetSound } from "@/lib/wordBanks";

type Phase =
  | "loading"
  | "greeting"
  | "blending"
  | "waiting"
  | "recording"
  | "analyzing"
  | "celebrating"
  | "redirecting"
  | "summary";

const CORRECT_VOICE_LINE = "Amazing! You nailed it!";
const RETRY_VOICE_LINE = "Ooh so close! Let's try together";
const FALLBACK_PROFILE: ChildProfile = {
  age: 6,
  name: "Maya",
  streak: 2,
  targetSounds: ["r"],
  totalXP: 120,
};
const MAX_ATTEMPTS = 2;
const SCORE_THRESHOLD = 70;
const TOTAL_WORDS = 6;

const SOUND_LABELS: Record<TargetSound, string> = {
  fluency: "smooth speech",
  l: "L",
  r: "arr",
  s: "S",
  th: "TH",
};

const RATE_SETTINGS = {
  fast: { interSyllablePause: 120, speed: 1 },
  slow: { interSyllablePause: 260, speed: 0.82 },
} as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getFallbackSummaryMessage(accuracy: number): string {
  if (accuracy >= 85) return "You blended every sound like a champion!";
  if (accuracy >= 65) return "Your ears and mouth teamed up beautifully today!";
  return "Each blend made your speech muscles stronger!";
}

export default function BlendItPage() {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [activeSound, setActiveSound] = useState<TargetSound>("r");
  const [words, setWords] = useState<BlendWord[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [xp, setXp] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [revealedSegments, setRevealedSegments] = useState(0);
  const [attemptsForWord, setAttemptsForWord] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [lastResult, setLastResult] = useState<PhonemeResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [summaryMessage, setSummaryMessage] = useState("");
  const [finalAccuracy, setFinalAccuracy] = useState(0);
  const [novaState, setNovaState] = useState<"idle" | "celebrating" | "thinking" | "encouraging">("idle");
  const [rateMode, setRateMode] = useState<"slow" | "fast">("slow");

  const activeSoundRef = useRef<TargetSound>("r");
  const attemptsForWordRef = useRef(0);
  const flowIdRef = useRef(0);
  const isMountedRef = useRef(false);
  const phaseRef = useRef<Phase>("loading");
  const profileRef = useRef<ChildProfile | null>(null);
  const rateModeRef = useRef<"slow" | "fast">("slow");
  const sessionRef = useRef<SessionWithId | null>(null);
  const streakRef = useRef(0);
  const wordsRef = useRef<BlendWord[]>([]);
  const wordIndexRef = useRef(0);

  useEffect(() => {
    activeSoundRef.current = activeSound;
  }, [activeSound]);

  useEffect(() => {
    attemptsForWordRef.current = attemptsForWord;
  }, [attemptsForWord]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    rateModeRef.current = rateMode;
  }, [rateMode]);

  useEffect(() => {
    streakRef.current = streak;
  }, [streak]);

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  useEffect(() => {
    wordIndexRef.current = wordIndex;
  }, [wordIndex]);

  const isFlowActive = useCallback((flowId: number) => {
    return isMountedRef.current && flowId === flowIdRef.current;
  }, []);

  const playBlendSequence = useCallback(
    async (
      flowId: number,
      nextIndex: number,
      options: { resetAttempts: boolean }
    ) => {
      const currentWord = wordsRef.current[nextIndex];
      if (!currentWord) return;

      if (options.resetAttempts) {
        attemptsForWordRef.current = 0;
        setAttemptsForWord(0);
      }

      setWordIndex(nextIndex);
      setLastResult(null);
      setRevealedSegments(0);
      setFeedbackMessage(`Listen to the sounds in ${currentWord.word}.`);
      setNovaState("thinking");
      setPhase("blending");

      const settings = RATE_SETTINGS[rateModeRef.current];

      for (const [segmentIndex, segment] of currentWord.segments.entries()) {
        if (!isFlowActive(flowId)) return;

        setRevealedSegments(segmentIndex + 1);
        await wait(100);
        if (!isFlowActive(flowId)) return;

        await speakAsNova(segmentToSpeech(segment, segmentIndex === 0), settings.speed);
        if (!isFlowActive(flowId)) return;

        if (segmentIndex < currentWord.segments.length - 1) {
          await wait(settings.interSyllablePause);
        }
      }

      if (!isFlowActive(flowId)) return;

      await speakAsNova(currentWord.word, 1);
      if (!isFlowActive(flowId)) return;

      await speakAsNova("Now blend it!");
      if (!isFlowActive(flowId)) return;

      setNovaState("idle");
      setPhase("waiting");
      setFeedbackMessage(`Your turn. Say ${currentWord.word}.`);
    },
    [isFlowActive]
  );

  const finishSession = useCallback(
    async (flowId: number) => {
      if (phaseRef.current === "summary") {
        return;
      }

      setPhase("summary");
      setNovaState("celebrating");

      const session = sessionRef.current ?? startSession(profileRef.current?.name ?? "kid", activeSoundRef.current);
      const summary = await endSession(session);
      const accuracy = summary.averageAccuracy;
      const fallbackMessage = getFallbackSummaryMessage(accuracy);
      const celebrationMessage = await fetchCelebrationMessage({
        accuracy,
        count: summary.sessionData.attempts.length || wordsRef.current.length,
        fallback: fallbackMessage,
        sound: SOUND_LABELS[activeSoundRef.current],
      });

      let earnedXp = summary.xpEarned;
      let updatedStreak = streakRef.current;

      try {
        const saved = await saveCompletedSession(summary.sessionData);
        earnedXp = saved.xpEarned;
        updatedStreak = saved.newStreak ?? updatedStreak;
      } catch {
        /* keep local summary if persistence fails */
      }

      if (!isFlowActive(flowId)) return;

      setFinalAccuracy(accuracy);
      setSessionXp(earnedXp);
      setSummaryMessage(celebrationMessage);
      setShowSummary(true);

      if (earnedXp > 0) {
        setXp((currentXp) => (currentXp ?? profileRef.current?.totalXP ?? 0) + earnedXp);
      }

      setStreak(updatedStreak);
      setProfile((currentProfile) =>
        currentProfile
          ? {
              ...currentProfile,
              streak: updatedStreak,
              totalXP: currentProfile.totalXP + earnedXp,
            }
          : currentProfile
      );
    },
    [isFlowActive]
  );

  const analyzeCapture = useCallback(
    async (capture: SpeechCaptureResult) => {
      const currentProfile = profileRef.current;
      const currentWord = wordsRef.current[wordIndexRef.current];
      const flowId = flowIdRef.current;

      if (!currentProfile || !currentWord) {
        setPhase("waiting");
        return;
      }

      setNovaState("thinking");
      setFeedbackMessage("Nova is checking your blend...");

      try {
        const rawResult = await submitAudioForAnalysis({
          age: currentProfile.age,
          audio: capture.blob,
          targetSound: activeSoundRef.current,
          transcript: capture.transcript,
          word: currentWord.word,
        });

        if (!isFlowActive(flowId)) return;

        const normalizedResult: PhonemeResult = {
          ...rawResult,
          correct: rawResult.correct || rawResult.score >= SCORE_THRESHOLD,
        };
        const attempt: AttemptData = {
          correct: normalizedResult.correct,
          score: normalizedResult.score,
          substitution: normalizedResult.substitution,
          transcript: capture.transcript || "[audio capture]",
          word: currentWord.word,
        };

        setLastResult(normalizedResult);
        sessionRef.current = recordAttempt(sessionRef.current ?? startSession(currentProfile.name, activeSoundRef.current), attempt);

        if (normalizedResult.correct) {
          setPhase("celebrating");
          setFeedbackMessage(normalizedResult.feedback);
          setShowCelebration(true);
          setNovaState("celebrating");
          await speakAsNova(CORRECT_VOICE_LINE);
          if (!isFlowActive(flowId)) return;

          setShowCelebration(false);
          const nextIndex = wordIndexRef.current + 1;
          if (nextIndex >= wordsRef.current.length) {
            await finishSession(flowId);
            return;
          }

          await playBlendSequence(flowId, nextIndex, { resetAttempts: true });
          return;
        }

        const nextAttempts = attemptsForWordRef.current + 1;
        attemptsForWordRef.current = nextAttempts;
        setAttemptsForWord(nextAttempts);
        setPhase("redirecting");
        setNovaState("encouraging");
        setFeedbackMessage(normalizedResult.feedback || RETRY_VOICE_LINE);

        await speakAsNova(RETRY_VOICE_LINE);
        if (!isFlowActive(flowId)) return;

        if (normalizedResult.mouthCue) {
          await speakAsNova(normalizedResult.mouthCue);
          if (!isFlowActive(flowId)) return;
        }

        if (nextAttempts >= MAX_ATTEMPTS) {
          const nextIndex = wordIndexRef.current + 1;
          if (nextIndex >= wordsRef.current.length) {
            await finishSession(flowId);
            return;
          }

          await playBlendSequence(flowId, nextIndex, { resetAttempts: true });
          return;
        }

        await playBlendSequence(flowId, wordIndexRef.current, { resetAttempts: false });
      } catch {
        if (!isFlowActive(flowId)) return;
        setNovaState("encouraging");
        setPhase("waiting");
        setFeedbackMessage("Let's try that blend again.");
      }
    },
    [finishSession, isFlowActive, playBlendSequence]
  );

  const beginSession = useCallback(
    async (nextProfile: ChildProfile, nextSound: TargetSound) => {
      stopListening({ cancel: true });
      stopCurrentAudio();

      const flowId = ++flowIdRef.current;
      const sessionWords = blendData[nextSound].slice(0, TOTAL_WORDS);

      sessionRef.current = startSession(nextProfile.name, nextSound);
      wordsRef.current = sessionWords;
      wordIndexRef.current = 0;
      attemptsForWordRef.current = 0;
      activeSoundRef.current = nextSound;

      setActiveSound(nextSound);
      setWords(sessionWords);
      setWordIndex(0);
      setAttemptsForWord(0);
      setRevealedSegments(0);
      setFeedbackMessage("");
      setLastResult(null);
      setShowCelebration(false);
      setShowSummary(false);
      setSessionXp(0);
      setSummaryMessage("");
      setFinalAccuracy(0);
      setNovaState("encouraging");
      setPhase("greeting");

      await speakAsNova(`Hi ${nextProfile.name}, let's blend your ${SOUND_LABELS[nextSound]} sounds together.`);
      if (!isFlowActive(flowId)) return;

      await playBlendSequence(flowId, 0, { resetAttempts: true });
    },
    [isFlowActive, playBlendSequence]
  );

  useEffect(() => {
    isMountedRef.current = true;

    void (async () => {
      const nextProfile = await fetchChildProfile(FALLBACK_PROFILE);
      if (!isMountedRef.current) return;

      const nextSound = nextProfile.targetSounds[0] ?? "r";
      setProfile(nextProfile);
      setXp(nextProfile.totalXP);
      setStreak(nextProfile.streak);
      setActiveSound(nextSound);

      await beginSession(nextProfile, nextSound);
    })();

    return () => {
      isMountedRef.current = false;
      flowIdRef.current += 1;
      stopListening({ cancel: true });
      stopCurrentAudio();
    };
  }, [beginSession]);

  const handleMicStart = useCallback(() => {
    if (phaseRef.current !== "waiting") {
      return;
    }

    setPhase("recording");
    setFeedbackMessage("Hold the mic while you blend the whole word.");

    void startListening(
      (capture) => {
        if (!isMountedRef.current || phaseRef.current !== "recording") return;
        setPhase("analyzing");
        void analyzeCapture(capture);
      },
      (message) => {
        if (!isMountedRef.current) return;
        setFeedbackMessage(message);
        setPhase("waiting");
      }
    );
  }, [analyzeCapture]);

  const handleMicStop = useCallback(() => {
    if (phaseRef.current === "recording") {
      stopListening();
    }
  }, []);

  if (!profile || xp === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F9F4F1]">
        <div className="text-5xl">⭐</div>
      </main>
    );
  }

  const currentWord = words[wordIndex];
  const completedWords = showSummary ? words.length : wordIndex;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');
        body {
          background: #F9F4F1;
          font-family: 'Nunito', sans-serif;
        }
      `}</style>

      <CelebrationBurst active={showCelebration} />

      {showSummary ? (
        <SessionSummary
          accuracy={finalAccuracy}
          message={summaryMessage}
          onDone={() => {
            window.location.href = "/kid";
          }}
          onPlayAgain={() => {
            if (!profileRef.current) return;
            void beginSession(profileRef.current, activeSoundRef.current);
          }}
          totalWords={words.length}
          wordsCompleted={words.length}
          xpEarned={sessionXp}
        />
      ) : null}

      <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center gap-8 px-4 pb-24 pt-8 md:px-10">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              aria-label="Back to kid activities"
              className="text-xl font-black text-[#945F95] transition-colors hover:text-[#390052]"
              href="/kid"
            >
              Back
            </Link>
            <StreakBadge streak={streak} />
          </div>
          <XPCounter xp={xp} />
        </div>

        <div className="rounded-full border-2 border-[rgba(57,0,82,0.1)] bg-white px-5 py-2 text-sm font-black uppercase tracking-[0.28em] text-[#945F95]">
          Blend It
        </div>

        <div className="flex items-center gap-2 rounded-full bg-white px-2 py-2">
          {(["slow", "fast"] as const).map((mode) => (
            <button
              key={mode}
              className="rounded-full px-4 py-2 text-sm font-black uppercase tracking-[0.2em] transition-colors"
              onClick={() => setRateMode(mode)}
              style={{
                background: rateMode === mode ? "#CE7DA5" : "transparent",
                color: rateMode === mode ? "#FFFFFF" : "#945F95",
              }}
              type="button"
            >
              {mode}
            </button>
          ))}
        </div>

        <Nova size="lg" state={novaState} />

        <div className="min-h-24 text-center">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#945F95]">
            {phase === "greeting" && "Nova is getting ready"}
            {phase === "blending" && "Listen to each sound"}
            {phase === "waiting" && "Your turn"}
            {phase === "recording" && "Recording"}
            {phase === "analyzing" && "Listening back"}
            {phase === "celebrating" && "Beautiful blending"}
            {phase === "redirecting" && "Try it together"}
          </p>
          <p className="mt-3 text-2xl font-black text-[#390052]">
            {feedbackMessage || (currentWord ? `Blend ${currentWord.word}.` : "Loading your blend...")}
          </p>
          {lastResult?.mouthCue ? (
            <p className="mt-2 text-base font-bold text-[#945F95]">{lastResult.mouthCue}</p>
          ) : null}
        </div>

        {currentWord ? (
          <div className="w-full max-w-xl rounded-[28px] border-2 border-[rgba(57,0,82,0.1)] bg-white p-8 text-center">
            <div className="text-6xl">{currentWord.emoji}</div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {currentWord.segments.map((segment, index) => (
                <div
                  key={`${segment}-${index}`}
                  className="rounded-2xl px-4 py-3 text-2xl font-black transition-all duration-200"
                  style={{
                    background:
                      index < revealedSegments ? "#CE7DA5" : "rgba(57, 0, 82, 0.08)",
                    color: index < revealedSegments ? "#FFFFFF" : "#945F95",
                    transform: index < revealedSegments ? "scale(1.08)" : "scale(1)",
                  }}
                >
                  {index < revealedSegments ? segment : "·"}
                </div>
              ))}
            </div>
            <p className="mt-5 text-3xl font-black tracking-[0.2em] text-[#390052]">
              {currentWord.word}
            </p>
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-4">
          <MicButton
            disabled={!["waiting", "recording"].includes(phase)}
            isRecording={phase === "recording"}
            onStart={handleMicStart}
            onStop={handleMicStop}
          />

          <button
            className="rounded-full border-2 border-[rgba(57,0,82,0.1)] bg-white px-5 py-2 text-sm font-black uppercase tracking-[0.24em] text-[#945F95]"
            disabled={!["waiting", "recording"].includes(phase)}
            onClick={() => {
              if (phase === "recording") {
                stopListening({ cancel: true });
              }

              stopCurrentAudio();
              void playBlendSequence(flowIdRef.current, wordIndexRef.current, {
                resetAttempts: false,
              });
            }}
            style={{
              opacity: ["waiting", "recording"].includes(phase) ? 1 : 0.5,
            }}
            type="button"
          >
            Replay Sounds
          </button>
        </div>

        {attemptsForWord > 0 ? (
          <div className="flex items-center gap-2">
            {Array.from({ length: MAX_ATTEMPTS }).map((_, index) => (
              <div
                key={index}
                className="h-3 w-3 rounded-full"
                style={{
                  background:
                    index < attemptsForWord ? "#CE7DA5" : "rgba(57, 0, 82, 0.12)",
                }}
              />
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex flex-col items-center gap-3">
          <p className="text-sm font-bold text-[#945F95]">
            Word {Math.min(wordIndex + 1, words.length || TOTAL_WORDS)} of {words.length || TOTAL_WORDS}
          </p>
          <div className="flex gap-2">
            {Array.from({ length: words.length || TOTAL_WORDS }).map((_, index) => (
              <div
                key={index}
                className="h-3 w-3 rounded-full transition-all duration-200"
                style={{
                  background:
                    index < completedWords
                      ? "#CE7DA5"
                      : index === wordIndex
                        ? "#945F95"
                        : "rgba(57, 0, 82, 0.12)",
                }}
              />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
