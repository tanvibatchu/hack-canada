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

type Phase =
  | "loading"
  | "greeting"
  | "demonstrating"
  | "waiting"
  | "recording"
  | "analyzing"
  | "celebrating"
  | "redirecting"
  | "summary";

type SpeakUpWord = {
  emoji: string;
  tip: string;
  word: string;
};

const CORRECT_VOICE_LINE = "Amazing! You nailed it!";
const RETRY_VOICE_LINE = "Ooh so close! Let's try together";
const FALLBACK_PROFILE: ChildProfile = {
  age: 7,
  name: "Maya",
  streak: 2,
  targetSounds: ["r"],
  totalXP: 120,
};
const MAX_ATTEMPTS = 2;
const SCORE_THRESHOLD = 65;
const TOTAL_WORDS = 6;
const SPEAK_UP_WORDS: SpeakUpWord[] = [
  { emoji: "🏃", tip: "Push your voice forward.", word: "go" },
  { emoji: "👋", tip: "Open your mouth wide.", word: "hi" },
  { emoji: "🤩", tip: "Stretch the vowel warmly.", word: "wow" },
  { emoji: "📣", tip: "Use your strongest clear voice.", word: "loud" },
  { emoji: "💪", tip: "Keep your voice steady and bold.", word: "strong" },
  { emoji: "💥", tip: "Say it with big energy.", word: "boom" },
];

function getFallbackSummaryMessage(accuracy: number): string {
  if (accuracy >= 85) return "Your strong voice was shining today!";
  if (accuracy >= 65) return "You used brave, powerful speech all session!";
  return "Every big voice try helps your words grow stronger!";
}

export default function SpeakUpPage() {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [words] = useState<SpeakUpWord[]>(SPEAK_UP_WORDS.slice(0, TOTAL_WORDS));
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [xp, setXp] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [attemptsForWord, setAttemptsForWord] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [lastResult, setLastResult] = useState<PhonemeResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [summaryMessage, setSummaryMessage] = useState("");
  const [finalAccuracy, setFinalAccuracy] = useState(0);
  const [novaState, setNovaState] = useState<"idle" | "celebrating" | "thinking" | "encouraging">("idle");

  const attemptsForWordRef = useRef(0);
  const flowIdRef = useRef(0);
  const isMountedRef = useRef(false);
  const phaseRef = useRef<Phase>("loading");
  const profileRef = useRef<ChildProfile | null>(null);
  const sessionRef = useRef<SessionWithId | null>(null);
  const streakRef = useRef(0);
  const wordIndexRef = useRef(0);

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
    streakRef.current = streak;
  }, [streak]);

  useEffect(() => {
    wordIndexRef.current = wordIndex;
  }, [wordIndex]);

  const isFlowActive = useCallback((flowId: number) => {
    return isMountedRef.current && flowId === flowIdRef.current;
  }, []);

  const presentWord = useCallback(
    async (
      flowId: number,
      nextIndex: number,
      options: { resetAttempts: boolean }
    ) => {
      const nextWord = words[nextIndex];
      if (!nextWord) return;

      if (options.resetAttempts) {
        attemptsForWordRef.current = 0;
        setAttemptsForWord(0);
      }

      setWordIndex(nextIndex);
      setLastResult(null);
      setNovaState("thinking");
      setPhase("demonstrating");
      setFeedbackMessage(`Listen first. Say ${nextWord.word} with a strong voice.`);

      await speakAsNova(`Use your strong voice. ${nextWord.word}.`);
      if (!isFlowActive(flowId)) return;

      setNovaState("idle");
      setPhase("waiting");
      setFeedbackMessage(`Your turn. Say ${nextWord.word}. ${nextWord.tip}`);
    },
    [isFlowActive, words]
  );

  const finishSession = useCallback(
    async (flowId: number) => {
      if (phaseRef.current === "summary") {
        return;
      }

      setPhase("summary");
      setNovaState("celebrating");

      const session = sessionRef.current ?? startSession(profileRef.current?.name ?? "kid", "voice");
      const summary = await endSession(session);
      const accuracy = summary.averageAccuracy;
      const fallbackMessage = getFallbackSummaryMessage(accuracy);
      const celebrationMessage = await fetchCelebrationMessage({
        accuracy,
        count: summary.sessionData.attempts.length || words.length,
        fallback: fallbackMessage,
        sound: "voice power",
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
    [isFlowActive, words.length]
  );

  const analyzeCapture = useCallback(
    async (capture: SpeechCaptureResult) => {
      const currentProfile = profileRef.current;
      const currentWord = words[wordIndexRef.current];
      const flowId = flowIdRef.current;

      if (!currentProfile || !currentWord) {
        setPhase("waiting");
        return;
      }

      setNovaState("thinking");
      setFeedbackMessage("Nova is checking your voice...");

      try {
        const rawResult = await submitAudioForAnalysis({
          age: currentProfile.age,
          audio: capture.blob,
          targetSound: "voice",
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
        sessionRef.current = recordAttempt(sessionRef.current ?? startSession(currentProfile.name, "voice"), attempt);

        if (normalizedResult.correct) {
          setPhase("celebrating");
          setFeedbackMessage(normalizedResult.feedback);
          setShowCelebration(true);
          setNovaState("celebrating");
          await speakAsNova(CORRECT_VOICE_LINE);
          if (!isFlowActive(flowId)) return;

          setShowCelebration(false);
          const nextIndex = wordIndexRef.current + 1;
          if (nextIndex >= words.length) {
            await finishSession(flowId);
            return;
          }

          await presentWord(flowId, nextIndex, { resetAttempts: true });
          return;
        }

        const nextAttempts = attemptsForWordRef.current + 1;
        attemptsForWordRef.current = nextAttempts;
        setAttemptsForWord(nextAttempts);
        setPhase("redirecting");
        setNovaState("encouraging");
        setFeedbackMessage(normalizedResult.feedback || currentWord.tip);

        await speakAsNova(RETRY_VOICE_LINE);
        if (!isFlowActive(flowId)) return;

        await speakAsNova(currentWord.tip);
        if (!isFlowActive(flowId)) return;

        if (nextAttempts >= MAX_ATTEMPTS) {
          const nextIndex = wordIndexRef.current + 1;
          if (nextIndex >= words.length) {
            await finishSession(flowId);
            return;
          }

          await presentWord(flowId, nextIndex, { resetAttempts: true });
          return;
        }

        await presentWord(flowId, wordIndexRef.current, { resetAttempts: false });
      } catch {
        if (!isFlowActive(flowId)) return;
        setNovaState("encouraging");
        setPhase("waiting");
        setFeedbackMessage("Take a big breath and try again.");
      }
    },
    [finishSession, isFlowActive, presentWord, words]
  );

  const beginSession = useCallback(
    async (nextProfile: ChildProfile) => {
      stopListening({ cancel: true });
      stopCurrentAudio();

      const flowId = ++flowIdRef.current;

      sessionRef.current = startSession(nextProfile.name, "voice");
      wordIndexRef.current = 0;
      attemptsForWordRef.current = 0;

      setWordIndex(0);
      setAttemptsForWord(0);
      setFeedbackMessage("");
      setLastResult(null);
      setShowCelebration(false);
      setShowSummary(false);
      setSessionXp(0);
      setSummaryMessage("");
      setFinalAccuracy(0);
      setNovaState("encouraging");
      setPhase("greeting");

      await speakAsNova(`Hi ${nextProfile.name}, let's use a strong and clear voice together.`);
      if (!isFlowActive(flowId)) return;

      await presentWord(flowId, 0, { resetAttempts: true });
    },
    [isFlowActive, presentWord]
  );

  useEffect(() => {
    isMountedRef.current = true;

    void (async () => {
      const nextProfile = await fetchChildProfile(FALLBACK_PROFILE);
      if (!isMountedRef.current) return;

      setProfile(nextProfile);
      setXp(nextProfile.totalXP);
      setStreak(nextProfile.streak);

      await beginSession(nextProfile);
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
    setFeedbackMessage("Hold the mic while you use your strong voice.");

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
            void beginSession(profileRef.current);
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
          Speak Up
        </div>

        <Nova size="lg" state={novaState} />

        <div className="min-h-24 text-center">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#945F95]">
            {phase === "greeting" && "Nova is cheering you on"}
            {phase === "demonstrating" && "Listen first"}
            {phase === "waiting" && "Your turn"}
            {phase === "recording" && "Recording"}
            {phase === "analyzing" && "Listening back"}
            {phase === "celebrating" && "Big strong voice"}
            {phase === "redirecting" && "Try with Nova"}
          </p>
          <p className="mt-3 text-2xl font-black text-[#390052]">
            {feedbackMessage || (currentWord ? `Say ${currentWord.word}.` : "Loading your words...")}
          </p>
          {lastResult?.mouthCue ? (
            <p className="mt-2 text-base font-bold text-[#945F95]">{lastResult.mouthCue}</p>
          ) : null}
        </div>

        {currentWord ? (
          <div className="w-full max-w-lg rounded-[28px] border-2 border-[rgba(57,0,82,0.1)] bg-white p-8 text-center">
            <div className="text-7xl">{currentWord.emoji}</div>
            <p className="mt-6 text-5xl font-black uppercase tracking-[0.2em] text-[#390052]">
              {currentWord.word}
            </p>
            <p className="mt-4 text-lg font-bold text-[#945F95]">{currentWord.tip}</p>
          </div>
        ) : null}

        <MicButton
          disabled={!["waiting", "recording"].includes(phase)}
          isRecording={phase === "recording"}
          onStart={handleMicStart}
          onStop={handleMicStop}
        />

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
