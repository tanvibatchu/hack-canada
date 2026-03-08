"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import CelebrationBurst from "@/components/CelebrationBurst";
import MicButton from "@/components/MicButton";
import MouthDiagram from "@/components/MouthDiagram";
import Nova from "@/components/Nova";
import SessionSummary from "@/components/SessionSummary";
import StreakBadge from "@/components/StreakBadge";
import WordCard from "@/components/WordCard";
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
import {
  getSessionWords,
  type TargetSound,
  type WordEntry,
} from "@/lib/wordBanks";

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

const CORRECT_VOICE_LINE = "Amazing! You nailed it!";
const RETRY_VOICE_LINE = "Ooh so close! Let's try together";
const FALLBACK_PROFILE: ChildProfile = {
  age: 6,
  name: "Maya",
  streak: 3,
  targetSounds: ["r"],
  totalXP: 120,
};
const MAX_ATTEMPTS = 3;
const SCORE_THRESHOLD = 70;
const TOTAL_WORDS = 8;

const SOUND_LABELS: Record<TargetSound, string> = {
  fluency: "smooth speech",
  l: "L",
  r: "arr",
  s: "S",
  th: "TH",
};

function getFallbackSummaryMessage(accuracy: number): string {
  if (accuracy >= 85) return "You were a speech superstar today!";
  if (accuracy >= 65) return "You worked hard and sounded stronger each turn!";
  return "You practiced with bravery and that matters a lot!";
}

export default function PracticePage() {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [activeSound, setActiveSound] = useState<TargetSound>("r");
  const [words, setWords] = useState<WordEntry[]>([]);
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [xp, setXp] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [attemptsForWord, setAttemptsForWord] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [lastResult, setLastResult] = useState<PhonemeResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showMouthDiagram, setShowMouthDiagram] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionXp, setSessionXp] = useState(0);
  const [summaryMessage, setSummaryMessage] = useState("");
  const [finalAccuracy, setFinalAccuracy] = useState(0);
  const [novaState, setNovaState] = useState<"idle" | "celebrating" | "thinking" | "encouraging">("idle");

  const activeSoundRef = useRef<TargetSound>("r");
  const attemptsForWordRef = useRef(0);
  const flowIdRef = useRef(0);
  const isMountedRef = useRef(false);
  const phaseRef = useRef<Phase>("loading");
  const profileRef = useRef<ChildProfile | null>(null);
  const sessionRef = useRef<SessionWithId | null>(null);
  const streakRef = useRef(0);
  const wordsRef = useRef<WordEntry[]>([]);
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

  const presentWord = useCallback(
    async (
      flowId: number,
      nextIndex: number,
      options: { resetAttempts: boolean }
    ) => {
      const nextWord = wordsRef.current[nextIndex];
      if (!nextWord) {
        return;
      }

      setWordIndex(nextIndex);
      setFeedbackMessage("");
      setLastResult(null);
      setNovaState("thinking");
      setPhase("demonstrating");
      setShowMouthDiagram(false);

      if (options.resetAttempts) {
        attemptsForWordRef.current = 0;
        setAttemptsForWord(0);
      }

      await speakAsNova(`Listen to me say ${nextWord.word}.`);
      if (!isFlowActive(flowId)) return;
      await new Promise((resolve) => setTimeout(resolve, 600));
      if (!isFlowActive(flowId)) return;
      await speakAsNova(nextWord.word);
      if (!isFlowActive(flowId)) return;

      setNovaState("idle");
      setPhase("waiting");
      setFeedbackMessage(`Your turn. Say ${nextWord.word}.`);
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
      setFeedbackMessage("Nova is listening closely...");

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

          await presentWord(flowId, nextIndex, { resetAttempts: true });
          return;
        }

        const nextAttempts = attemptsForWordRef.current + 1;
        attemptsForWordRef.current = nextAttempts;
        setAttemptsForWord(nextAttempts);
        setShowMouthDiagram(true);
        setNovaState("encouraging");
        setPhase("redirecting");
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

          await presentWord(flowId, nextIndex, { resetAttempts: true });
          return;
        }

        await presentWord(flowId, wordIndexRef.current, { resetAttempts: false });
      } catch {
        if (!isFlowActive(flowId)) return;
        setNovaState("encouraging");
        setPhase("waiting");
        setFeedbackMessage("Try that word one more time.");
      }
    },
    [finishSession, isFlowActive, presentWord]
  );

  const beginSession = useCallback(
    async (nextProfile: ChildProfile, nextSound: TargetSound) => {
      stopListening({ cancel: true });
      stopCurrentAudio();

      const flowId = ++flowIdRef.current;
      const sessionWords = getSessionWords(nextSound, TOTAL_WORDS);

      sessionRef.current = startSession(nextProfile.name, nextSound);
      wordsRef.current = sessionWords;
      wordIndexRef.current = 0;
      attemptsForWordRef.current = 0;
      activeSoundRef.current = nextSound;

      setActiveSound(nextSound);
      setWords(sessionWords);
      setWordIndex(0);
      setAttemptsForWord(0);
      setFeedbackMessage("");
      setLastResult(null);
      setShowCelebration(false);
      setShowMouthDiagram(false);
      setShowSummary(false);
      setSessionXp(0);
      setSummaryMessage("");
      setFinalAccuracy(0);
      setNovaState("encouraging");
      setPhase("greeting");

      await speakAsNova(`Hi ${nextProfile.name}, let's practice your ${SOUND_LABELS[nextSound]} sound.`);
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
    setFeedbackMessage("Hold the mic while you say the word.");

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
          Word Practice
        </div>

        <Nova size="lg" state={novaState} />

        <div className="min-h-24 text-center">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#945F95]">
            {phase === "greeting" && "Nova is saying hello"}
            {phase === "demonstrating" && "Listen first"}
            {phase === "waiting" && "Your turn"}
            {phase === "recording" && "Recording"}
            {phase === "analyzing" && "Listening back"}
            {phase === "celebrating" && "Amazing speaking"}
            {phase === "redirecting" && "Let’s try together"}
          </p>
          <p className="mt-3 text-2xl font-black text-[#390052]">
            {feedbackMessage || (currentWord ? `Say ${currentWord.word}.` : "Loading your words...")}
          </p>
          {lastResult?.mouthCue ? (
            <p className="mt-2 text-base font-bold text-[#945F95]">{lastResult.mouthCue}</p>
          ) : null}
        </div>

        {currentWord ? (
          <WordCard
            emoji={currentWord.emoji}
            targetSound={activeSound}
            word={currentWord.word}
          />
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

        <MouthDiagram
          sound={activeSound !== "fluency" ? activeSound : null}
          visible={showMouthDiagram}
        />

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
