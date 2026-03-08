"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import CelebrationBurst from "@/components/CelebrationBurst";
import ChoiceButton from "@/components/ChoiceButton";
import MicButton from "@/components/MicButton";
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
import type { TargetSound } from "@/lib/wordBanks";

type Position = "start" | "middle" | "end";

type HuntWord = {
  emoji: string;
  position: Position;
  word: string;
};

type Phase =
  | "loading"
  | "greeting"
  | "asking"
  | "waiting"
  | "recording"
  | "analyzing"
  | "celebrating"
  | "redirecting"
  | "summary";

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
const SCORE_THRESHOLD = 70;
const TOTAL_ROUNDS = 6;

const SOUND_HUNT_WORDS: Record<TargetSound, HuntWord[]> = {
  fluency: [
    { emoji: "🐱", position: "end", word: "cat" },
    { emoji: "☀️", position: "start", word: "sun" },
    { emoji: "🚢", position: "start", word: "ship" },
    { emoji: "🐟", position: "end", word: "fish" },
    { emoji: "🪑", position: "start", word: "chair" },
    { emoji: "🍑", position: "end", word: "peach" },
  ],
  l: [
    { emoji: "🦁", position: "start", word: "lion" },
    { emoji: "🍋", position: "start", word: "lemon" },
    { emoji: "🎈", position: "middle", word: "balloon" },
    { emoji: "🍮", position: "middle", word: "jelly" },
    { emoji: "⚽", position: "end", word: "ball" },
    { emoji: "🔔", position: "end", word: "bell" },
  ],
  r: [
    { emoji: "🐰", position: "start", word: "rabbit" },
    { emoji: "🌈", position: "start", word: "rainbow" },
    { emoji: "🥕", position: "middle", word: "carrot" },
    { emoji: "🦜", position: "middle", word: "parrot" },
    { emoji: "⭐", position: "end", word: "star" },
    { emoji: "🐻", position: "end", word: "bear" },
  ],
  s: [
    { emoji: "☀️", position: "start", word: "sun" },
    { emoji: "🧦", position: "start", word: "sock" },
    { emoji: "✏️", position: "middle", word: "pencil" },
    { emoji: "🧺", position: "middle", word: "basket" },
    { emoji: "🚌", position: "end", word: "bus" },
    { emoji: "🌿", position: "end", word: "grass" },
  ],
  th: [
    { emoji: "👍", position: "start", word: "thumb" },
    { emoji: "3️⃣", position: "start", word: "three" },
    { emoji: "🪶", position: "middle", word: "feather" },
    { emoji: "👩", position: "middle", word: "mother" },
    { emoji: "🛁", position: "end", word: "bath" },
    { emoji: "🦷", position: "end", word: "teeth" },
  ],
};

const POSITION_LABELS: Record<Position, string> = {
  end: "End",
  middle: "Middle",
  start: "Start",
};

const SPOKEN_SOUND_LABELS: Record<TargetSound, string> = {
  fluency: "target",
  l: "lll",
  r: "arr",
  s: "sss",
  th: "th",
};

function getFallbackSummaryMessage(accuracy: number): string {
  if (accuracy >= 85) return "You were a sharp sound detective today!";
  if (accuracy >= 65) return "You listened carefully and spoke bravely!";
  return "Your ears were working hard all session long!";
}

export default function SoundHuntPage() {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [activeSound, setActiveSound] = useState<TargetSound>("r");
  const [rounds, setRounds] = useState<HuntWord[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [xp, setXp] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [attemptsForWord, setAttemptsForWord] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [lastResult, setLastResult] = useState<PhonemeResult | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<Position | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
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
  const roundIndexRef = useRef(0);
  const roundsRef = useRef<HuntWord[]>([]);

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
    roundIndexRef.current = roundIndex;
  }, [roundIndex]);

  useEffect(() => {
    roundsRef.current = rounds;
  }, [rounds]);

  const isFlowActive = useCallback((flowId: number) => {
    return isMountedRef.current && flowId === flowIdRef.current;
  }, []);

  const promptRound = useCallback(
    async (
      flowId: number,
      nextIndex: number,
      options: { resetAttempts: boolean }
    ) => {
      const currentRound = roundsRef.current[nextIndex];
      if (!currentRound) return;

      if (options.resetAttempts) {
        attemptsForWordRef.current = 0;
        setAttemptsForWord(0);
      }

      setRoundIndex(nextIndex);
      setSelectedChoice(null);
      setLastResult(null);
      setNovaState("thinking");
      setPhase("asking");
      setFeedbackMessage(`Listen. Where is the ${SPOKEN_SOUND_LABELS[activeSoundRef.current]} sound?`);

      await speakAsNova(
        `Where is the ${SPOKEN_SOUND_LABELS[activeSoundRef.current]} sound in ${currentRound.word}? Start, middle, or end?`
      );
      if (!isFlowActive(flowId)) return;

      setNovaState("idle");
      setFeedbackMessage(`Tap start, middle, or end for ${currentRound.word}.`);
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
        count: summary.sessionData.attempts.length || roundsRef.current.length,
        fallback: fallbackMessage,
        sound: `${activeSoundRef.current.toUpperCase()} sound hunt`,
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
      const currentRound = roundsRef.current[roundIndexRef.current];
      const flowId = flowIdRef.current;

      if (!currentProfile || !currentRound) {
        setPhase("waiting");
        return;
      }

      setNovaState("thinking");
      setFeedbackMessage(`Nova is listening to ${currentRound.word}.`);

      try {
        const rawResult = await submitAudioForAnalysis({
          age: currentProfile.age,
          audio: capture.blob,
          targetSound: activeSoundRef.current,
          transcript: capture.transcript,
          word: currentRound.word,
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
          word: currentRound.word,
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
          const nextIndex = roundIndexRef.current + 1;
          if (nextIndex >= roundsRef.current.length) {
            await finishSession(flowId);
            return;
          }

          await promptRound(flowId, nextIndex, { resetAttempts: true });
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
          const nextIndex = roundIndexRef.current + 1;
          if (nextIndex >= roundsRef.current.length) {
            await finishSession(flowId);
            return;
          }

          await promptRound(flowId, nextIndex, { resetAttempts: true });
          return;
        }

        setPhase("waiting");
        setNovaState("idle");
        setFeedbackMessage(`Try saying ${currentRound.word} one more time.`);
      } catch {
        if (!isFlowActive(flowId)) return;
        setNovaState("encouraging");
        setPhase("waiting");
        setFeedbackMessage("Let's try that word again.");
      }
    },
    [finishSession, isFlowActive, promptRound]
  );

  const beginSession = useCallback(
    async (nextProfile: ChildProfile, nextSound: TargetSound) => {
      stopListening({ cancel: true });
      stopCurrentAudio();

      const flowId = ++flowIdRef.current;
      const nextRounds = SOUND_HUNT_WORDS[nextSound].slice(0, TOTAL_ROUNDS);

      sessionRef.current = startSession(nextProfile.name, nextSound);
      roundsRef.current = nextRounds;
      roundIndexRef.current = 0;
      attemptsForWordRef.current = 0;
      activeSoundRef.current = nextSound;

      setActiveSound(nextSound);
      setRounds(nextRounds);
      setRoundIndex(0);
      setAttemptsForWord(0);
      setFeedbackMessage("");
      setLastResult(null);
      setSelectedChoice(null);
      setShowCelebration(false);
      setShowSummary(false);
      setSessionXp(0);
      setSummaryMessage("");
      setFinalAccuracy(0);
      setNovaState("encouraging");
      setPhase("greeting");

      await speakAsNova(
        `Hi ${nextProfile.name}, let's go on a ${SPOKEN_SOUND_LABELS[nextSound]} sound hunt.`
      );
      if (!isFlowActive(flowId)) return;

      await promptRound(flowId, 0, { resetAttempts: true });
    },
    [isFlowActive, promptRound]
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

  const handleChoice = useCallback(
    async (choice: Position) => {
      if (phaseRef.current !== "asking") return;

      const currentRound = roundsRef.current[roundIndexRef.current];
      const flowId = flowIdRef.current;
      if (!currentRound) return;

      setSelectedChoice(choice);
      setNovaState("encouraging");

      if (choice === currentRound.position) {
        setFeedbackMessage(`You found it. Now say ${currentRound.word}.`);
        await speakAsNova(`You found it! Now say ${currentRound.word}.`);
      } else {
        setFeedbackMessage(`The ${POSITION_LABELS[currentRound.position].toLowerCase()} sound is right. Now say ${currentRound.word}.`);
        await speakAsNova(
          `Nice try. The sound is at the ${POSITION_LABELS[currentRound.position].toLowerCase()}. Now say ${currentRound.word}.`
        );
      }

      if (!isFlowActive(flowId)) return;

      setNovaState("idle");
      setPhase("waiting");
    },
    [isFlowActive]
  );

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

  const currentRound = rounds[roundIndex];
  const completedRounds = showSummary ? rounds.length : roundIndex;

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
          totalWords={rounds.length}
          wordsCompleted={rounds.length}
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
          Sound Hunt
        </div>

        <Nova size="lg" state={novaState} />

        <div className="min-h-24 text-center">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#945F95]">
            {phase === "greeting" && "Nova is setting up the hunt"}
            {phase === "asking" && "Listen and choose"}
            {phase === "waiting" && "Now say the word"}
            {phase === "recording" && "Recording"}
            {phase === "analyzing" && "Listening back"}
            {phase === "celebrating" && "Sound detective win"}
            {phase === "redirecting" && "Try with Nova"}
          </p>
          <p className="mt-3 text-2xl font-black text-[#390052]">
            {feedbackMessage || (currentRound ? `Find the sound in ${currentRound.word}.` : "Loading your hunt...")}
          </p>
          {lastResult?.mouthCue ? (
            <p className="mt-2 text-base font-bold text-[#945F95]">{lastResult.mouthCue}</p>
          ) : null}
        </div>

        {currentRound ? (
          <WordCard
            emoji={currentRound.emoji}
            targetSound={activeSound}
            word={currentRound.word}
          />
        ) : null}

        <div className="grid w-full max-w-3xl gap-3 md:grid-cols-3">
          {(["start", "middle", "end"] as Position[]).map((position) => {
            const state =
              selectedChoice === null
                ? "default"
                : position === currentRound?.position
                  ? "correct"
                  : position === selectedChoice
                    ? "wrong"
                    : "default";

            return (
              <ChoiceButton
                key={position}
                disabled={phase !== "asking"}
                label={POSITION_LABELS[position]}
                onClick={() => {
                  void handleChoice(position);
                }}
                state={state}
              />
            );
          })}
        </div>

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
            Round {Math.min(roundIndex + 1, rounds.length || TOTAL_ROUNDS)} of {rounds.length || TOTAL_ROUNDS}
          </p>
          <div className="flex gap-2">
            {Array.from({ length: rounds.length || TOTAL_ROUNDS }).map((_, index) => (
              <div
                key={index}
                className="h-3 w-3 rounded-full transition-all duration-200"
                style={{
                  background:
                    index < completedRounds
                      ? "#CE7DA5"
                      : index === roundIndex
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
