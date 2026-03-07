// app/kid/practice/page.tsx — Word Practice exercise for ArtiCue.
// Child hears a word from Nova and speaks it back. AI scores phoneme accuracy.
// Moved from /kid/page.tsx to make room for the exercise menu.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Nova from "@/components/Nova";
import WordCard from "@/components/WordCard";
import MicButton from "@/components/MicButton";
import MouthDiagram from "@/components/MouthDiagram";
import CelebrationBurst from "@/components/CelebrationBurst";
import XPCounter from "@/components/XPCounter";
import StreakBadge from "@/components/StreakBadge";
import SessionSummary from "@/components/SessionSummary";
import { analyzePhoneme, PhonemeResult } from "@/lib/gemini";
import { speakAsNova, demonstrateWord } from "@/lib/elevenlabs";
import { startListening, stopListening } from "@/lib/speechCapture";
import { getSessionWords, TargetSound, WordEntry } from "@/lib/wordBanks";
import { startSession, recordAttempt, endSession, AttemptData } from "@/lib/sessionManager";

type SessionPhase =
    | "loading" | "greeting" | "demonstrating" | "waiting"
    | "recording" | "analyzing" | "celebrating" | "redirecting" | "summary";

type ChildProfile = {
    name: string; age: number; targetSounds: TargetSound[]; streak: number;
};

const TOTAL_WORDS = 8;
const MAX_ATTEMPTS = 3;
const SCORE_THRESHOLD = 70;
const MOCK_USER_ID = "demo-user";

const SOUND_LABELS: Record<TargetSound, string> = {
    r: "R", s: "S", th: "TH", l: "L", fluency: "Fluency",
};

export default function PracticePage() {
    const [profile, setProfile] = useState<ChildProfile | null>(null);
    const [activeSound, setActiveSound] = useState<TargetSound>("r");
    const [phase, setPhase] = useState<SessionPhase>("loading");
    const [words, setWords] = useState<WordEntry[]>([]);
    const [wordIndex, setWordIndex] = useState(0);
    const [attempts, setAttempts] = useState(0);
    const [xp, setXp] = useState(0);
    const [allAttempts, setAllAttempts] = useState<AttemptData[]>([]);
    const [novaState, setNovaState] = useState<"idle" | "celebrating" | "thinking" | "encouraging">("idle");
    const [showCelebration, setShowCelebration] = useState(false);
    const [showMouthDiagram, setShowMouthDiagram] = useState(false);
    const [lastResult, setLastResult] = useState<PhonemeResult | null>(null);
    const [showSummary, setShowSummary] = useState(false);
    const [summaryMessage, setSummaryMessage] = useState("");
    const [finalAccuracy, setFinalAccuracy] = useState(0);
    const sessionIdRef = useRef<string | null>(null);
    const phaseRef = useRef<SessionPhase>("loading");

    useEffect(() => { phaseRef.current = phase; }, [phase]);

    useEffect(() => {
        async function loadProfile() {
            try {
                const res = await fetch("/api/profile");
                if (res.ok) { const d = await res.json(); setProfile(d); setActiveSound(d.targetSounds?.[0] ?? "r"); }
                else throw new Error();
            } catch {
                setProfile({ name: "Maya", age: 6, targetSounds: ["r", "s", "l"], streak: 3 });
                setActiveSound("r");
            }
        }
        loadProfile();
    }, []);

    const initSession = useCallback(async (p: ChildProfile, sound: TargetSound) => {
        setPhase("loading"); setWordIndex(0); setAttempts(0); setXp(0);
        setAllAttempts([]); setShowMouthDiagram(false); setShowSummary(false); setLastResult(null);
        setWords(getSessionWords(sound, TOTAL_WORDS));
        const session = await startSession(MOCK_USER_ID, sound);
        sessionIdRef.current = session.sessionId;
        setNovaState("idle"); setPhase("greeting");
    }, []);

    useEffect(() => { if (profile) initSession(profile, activeSound); }, [profile, activeSound, initSession]);

    useEffect(() => {
        if (phase !== "greeting" || !profile || words.length === 0) return;
        async function greet() {
            setNovaState("encouraging");
            await speakAsNova(`Hi ${profile!.name}! Let's practice your ${SOUND_LABELS[activeSound]} sound! Can you say... ${words[0].word}?`);
            setNovaState("thinking"); setPhase("demonstrating");
        }
        greet();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    useEffect(() => {
        if (phase !== "demonstrating" || words.length === 0) return;
        async function demo() {
            await demonstrateWord(words[wordIndex].word, activeSound);
            setNovaState("idle"); setPhase("waiting");
        }
        demo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    function handleMicStart() {
        if (phase !== "waiting") return;
        setShowMouthDiagram(false); setPhase("recording");
        startListening(
            (transcript) => { if (phaseRef.current !== "recording") return; setPhase("analyzing"); handleTranscript(transcript); },
            () => setPhase("waiting"),
            words[wordIndex]?.word
        );
    }

    function handleMicStop() {
        if (phase === "recording") { stopListening(); if (phaseRef.current === "recording") setPhase("waiting"); }
    }

    async function handleTranscript(transcript: string) {
        const cur = words[wordIndex]; setNovaState("thinking");
        const result = await analyzePhoneme({ word: cur.word, transcript, targetSound: activeSound, age: profile?.age ?? 6 });
        setLastResult(result);
        const attempt: AttemptData = { word: cur.word, transcript, score: result.score, correct: result.correct, substitution: result.substitution };
        if (sessionIdRef.current) await recordAttempt(sessionIdRef.current, attempt);
        setAllAttempts(prev => [...prev, attempt]);
        if (result.correct || result.score >= SCORE_THRESHOLD) await handleCorrect(result);
        else await handleNeedsWork(result);
    }

    async function handleCorrect(result: PhonemeResult) {
        setNovaState("celebrating"); setShowCelebration(true); setXp(p => p + 10); setPhase("celebrating");
        await speakAsNova(result.feedback);
        await new Promise(r => setTimeout(r, 1800));
        setShowCelebration(false); setAttempts(0); advanceWord();
    }

    async function handleNeedsWork(result: PhonemeResult) {
        setNovaState("encouraging"); setPhase("redirecting");
        await speakAsNova(result.feedback); setShowMouthDiagram(true); await speakAsNova(result.mouthCue);
        const next = attempts + 1; setAttempts(next);
        if (next >= MAX_ATTEMPTS) {
            await speakAsNova("You're doing amazing — let's try the next one!"); setShowMouthDiagram(false); setAttempts(0); advanceWord();
        } else { setNovaState("idle"); setPhase("demonstrating"); }
    }

    function advanceWord() {
        const next = wordIndex + 1;
        if (next >= words.length || next >= TOTAL_WORDS) finishSession();
        else { setWordIndex(next); setNovaState("thinking"); setPhase("demonstrating"); }
    }

    async function finishSession() {
        setPhase("summary");
        const summary = sessionIdRef.current ? await endSession(sessionIdRef.current, allAttempts) : null;
        const acc = summary?.averageAccuracy ?? (allAttempts.length > 0 ? Math.round(allAttempts.filter(a => a.correct).length / allAttempts.length * 100) : 0);
        setFinalAccuracy(acc);
        setSummaryMessage(acc >= 80 ? "You're a speech superstar! I'm so proud of you!" : acc >= 60 ? "Fantastic effort today!" : "You showed up and tried your best!");
        setShowSummary(true);
    }

    const completedWords = Math.min(wordIndex + (phase === "celebrating" ? 1 : 0), TOTAL_WORDS);

    if (!profile) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center gap-4">
                <div className="text-6xl animate-[nova-idle_3s_ease-in-out_infinite]">🌟</div>
                <p className="text-purple-300 text-lg">Getting things ready…</p>
            </main>
        );
    }

    return (
        <>
            <CelebrationBurst active={showCelebration} />
            {showSummary && (
                <SessionSummary
                    accuracy={finalAccuracy} xpEarned={xp} wordsCompleted={completedWords} totalWords={TOTAL_WORDS}
                    message={summaryMessage}
                    onPlayAgain={() => { setShowSummary(false); if (profile) initSession(profile, activeSound); }}
                    onDone={() => { window.location.href = "/kid"; }}
                />
            )}

            <main className="min-h-screen flex flex-col items-center px-4 pt-4 pb-8 gap-4 max-w-sm mx-auto">
                {/* Top bar */}
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/kid" className="text-purple-400 hover:text-white transition-colors text-2xl" aria-label="Back to menu">←</Link>
                        <StreakBadge streak={profile.streak} />
                    </div>
                    <XPCounter xp={xp} />
                </div>

                {/* Mode label */}
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 border border-white/10">
                    <span className="text-lg">🎤</span>
                    <span className="text-sm font-semibold text-purple-200">Word Practice</span>
                    <span className="text-xs text-purple-400 uppercase tracking-widest ml-1">— {SOUND_LABELS[activeSound]} sound</span>
                </div>

                {/* Nova */}
                <div className="flex-shrink-0 mt-1">
                    <Nova state={novaState} size="lg" />
                </div>

                {/* Speech prompt */}
                <div className="text-center min-h-[3.5rem] flex flex-col items-center justify-center gap-1 px-4">
                    {phase === "greeting" && <p className="text-purple-200 text-lg animate-[fade-in_0.4s_ease-out]">Nova is getting ready… ✨</p>}
                    {phase === "demonstrating" && (
                        <>
                            <p className="text-purple-300 text-sm uppercase tracking-widest">Nova is saying…</p>
                            <p className="text-white text-xl font-semibold">Can you say… <span className="text-purple-300 font-bold">{words[wordIndex]?.word}</span>?</p>
                        </>
                    )}
                    {phase === "waiting" && (
                        <>
                            <p className="text-purple-300 text-sm uppercase tracking-widest">Your turn!</p>
                            <p className="text-white text-xl font-semibold">Say: <span className="text-purple-300 font-bold">{words[wordIndex]?.word}</span></p>
                        </>
                    )}
                    {phase === "recording" && <p className="text-green-300 text-lg font-medium">I&apos;m listening… 👂</p>}
                    {phase === "analyzing" && <p className="text-purple-200 text-lg animate-[nova-idle_1s_ease-in-out_infinite]">Nova is thinking… 💭</p>}
                    {phase === "celebrating" && <p className="text-yellow-300 text-xl font-bold">{lastResult?.feedback ?? "Amazing! 🎉"}</p>}
                    {phase === "redirecting" && (
                        <>
                            <p className="text-purple-200 text-lg">{lastResult?.feedback ?? "Ooh so close!"}</p>
                            <p className="text-purple-300 text-base">Try again: <span className="font-bold text-white">{words[wordIndex]?.word}</span></p>
                        </>
                    )}
                </div>

                {/* Word card */}
                {words[wordIndex] && phase !== "greeting" && (
                    <WordCard word={words[wordIndex].word} emoji={words[wordIndex].emoji} targetSound={activeSound} />
                )}

                {/* Mic button */}
                <div className="flex flex-col items-center mt-2">
                    <MicButton
                        onStart={handleMicStart} onStop={handleMicStop}
                        isRecording={phase === "recording"}
                        disabled={["loading", "greeting", "demonstrating", "analyzing", "celebrating", "redirecting", "summary"].includes(phase)}
                    />
                </div>

                {/* Attempt dots */}
                {(phase === "redirecting" || attempts > 0) && (
                    <div className="flex gap-2 items-center">
                        {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                            <div key={i} className={["w-2.5 h-2.5 rounded-full transition-all duration-300", i < attempts ? "bg-purple-400" : "bg-white/15"].join(" ")} />
                        ))}
                        <span className="text-xs text-purple-400 ml-1">attempt{attempts !== 1 ? "s" : ""}</span>
                    </div>
                )}

                {/* Mouth diagram */}
                <MouthDiagram sound={activeSound !== "fluency" ? activeSound : null} visible={showMouthDiagram} />

                <div className="flex-1" />

                {/* Progress dots */}
                <div className="flex flex-col items-center gap-2 pb-2">
                    <p className="text-xs text-purple-400">Word {Math.min(completedWords + 1, TOTAL_WORDS)} of {TOTAL_WORDS}</p>
                    <div className="flex gap-2">
                        {Array.from({ length: TOTAL_WORDS }).map((_, i) => (
                            <div key={i} className={["w-3 h-3 rounded-full transition-all duration-500",
                                i < completedWords ? "bg-purple-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]"
                                    : i === completedWords ? "bg-purple-600 ring-2 ring-purple-400/50"
                                        : "bg-white/10"].join(" ")} />
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}
