// app/kid/speak-up/page.tsx — Speak Up! exercise for ArtiCue.
// SLP Basis: LSVT LOUD (Lee Silverman Voice Treatment) adapted for children with dysarthria.
// Core principle: train children to use maximum vocal effort ("SPEAK LOUD!"),
// which recalibrates their perception of loudness and improves articulation + clarity.
// Evidence: Boliek et al. (2010), Levy et al. (2012) — effective for pediatric dysarthria.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Nova from "@/components/Nova";
import CelebrationBurst from "@/components/CelebrationBurst";
import XPCounter from "@/components/XPCounter";
import StreakBadge from "@/components/StreakBadge";
import SessionSummary from "@/components/SessionSummary";
import { speakAsNova, stopCurrentAudio } from "@/lib/elevenlabs";
import { generateSessionCelebration } from "@/lib/gemini";
import { startSession, recordAttempt, endSession, AttemptData, SessionWithId } from "@/lib/sessionManager";

import { startListening, stopListening } from "@/lib/speechCapture";

// LSVT LOUD target words: short, high-frequency, with clear vowel sounds
// for maximum respiratory and phonatory effort practice
const SPEAK_UP_WORDS = [
    { word: "GO", emoji: "🏃", tip: "Push air from your belly!" },
    { word: "HI", emoji: "👋", tip: "Open your mouth wide!" },
    { word: "WOW", emoji: "🤩", tip: "Really mean it — WOW!" },
    { word: "YEAH", emoji: "✅", tip: "Stretch it out — YEAHHH!" },
    { word: "GREAT", emoji: "⭐", tip: "Use your whole voice!" },
    { word: "LOUD", emoji: "📣", tip: "Be as loud as Nova!" },
    { word: "STRONG", emoji: "💪", tip: "Strong voice, strong body!" },
    { word: "BOOM", emoji: "💥", tip: "Make the room shake!" },
];

const TOTAL_WORDS = 6;
type Phase = "intro" | "waiting" | "recording" | "analyzing" | "celebrating" | "redirecting" | "summary";
type ChildProfile = { name: string; age: number; targetSounds: string[]; streak: number; totalXP: number; };

// Volume levels for the visual intensity meter (0–4 bars)
const VOLUME_LABELS = ["Too quiet", "Louder!", "Getting there!", "Strong voice!", "PERFECT! 📣"];

export default function SpeakUpPage() {
    const [profile, setProfile] = useState<ChildProfile | null>(null);
    const [streak, setStreak] = useState(0);
    const [words] = useState(SPEAK_UP_WORDS.slice(0, TOTAL_WORDS));
    const [index, setIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>("intro");
    const [xp, setXp] = useState(0);
    const [correct, setCorrect] = useState(0);
    const [volumeLevel, setVolumeLevel] = useState(0); // 0–4
    const [showCelebration, setShowCelebration] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [finalAccuracy, setFinalAccuracy] = useState(0);
    const [summaryMessage, setSummaryMessage] = useState("Great voice power!");
    const [novaState, setNovaState] = useState<"idle" | "celebrating" | "thinking" | "encouraging" | "incorrect">("encouraging");
    const phaseRef = useRef<Phase>("intro");
    const sessionRef = useRef<SessionWithId | null>(null);
    const attemptsRef = useRef<AttemptData[]>([]);

    useEffect(() => { phaseRef.current = phase; }, [phase]);

    useEffect(() => {
        async function loadProfile() {
            try {
                const res = await fetch("/api/profile");
                if (!res.ok) throw new Error("profile fetch failed");
                const data = await res.json();
                const p = data?.profile;
                if (p) {
                    setProfile({
                        name: p.name ?? "Friend",
                        age: typeof p.age === "number" ? p.age : 7,
                        targetSounds: p.targetSounds ?? [],
                        streak: p.streak ?? 0,
                        totalXP: p.totalXP ?? p.xp ?? 0,
                    });
                    setStreak(p.streak ?? 0);
                    return;
                }
            } catch {
                const fallback = { name: "Maya", age: 7, targetSounds: [], streak: 1, totalXP: 0 };
                setProfile(fallback);
                setStreak(fallback.streak);
            }
        }
        loadProfile();
    }, []);

    useEffect(() => {
        // Brief intro — Nova explains the exercise
        async function intro() {
            setNovaState("incorrect");
            await speakAsNova("This is Speak Up! Say each word as LOUD and CLEAR as you can! Let's wake up those vocal cords!");
            setPhase("waiting");
            setNovaState("idle");
        }
        intro();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        attemptsRef.current = [];
        sessionRef.current = startSession(profile?.name ?? "kid", "voice");
        setXp(0);
        setCorrect(0);
        setVolumeLevel(0);
    }, [profile?.name]);

    useEffect(() => () => { stopListening(); stopCurrentAudio(); }, []);

    function handleMicStart() {
        if (phase !== "waiting") return;
        setVolumeLevel(0);
        setPhase("recording");

        startListening(
            async (transcript, confidence = 0) => {
                if (phaseRef.current !== "recording") return;
                setPhase("analyzing");
                setNovaState("thinking");

                const loudScore = Math.min(Math.max(confidence, 0), 1);
                const volumeBars = Math.max(1, Math.round(loudScore * 4));
                setVolumeLevel(volumeBars);

                try {
                    const res = await fetch("/api/analyze", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            word: words[index].word.toLowerCase(),
                            transcript: transcript.toLowerCase(),
                            targetSound: "voice",
                            age: profile?.age ?? 7,
                        }),
                    });
                    const result = await res.json();
                    const clarityScore = typeof result?.score === "number" ? result.score : 0;
                    const isLoudEnough = loudScore >= 0.55;
                    const isClearEnough = clarityScore >= 60;
                    const isSuccess = isLoudEnough && isClearEnough;
                    const attemptScore = Math.round((clarityScore + loudScore * 100) / 2);
                    const attempt: AttemptData = {
                        word: words[index].word.toLowerCase(),
                        transcript: transcript.toLowerCase(),
                        score: attemptScore,
                        correct: isSuccess,
                        substitution: result?.substitution ?? null,
                    };
                    attemptsRef.current = [...attemptsRef.current, attempt];
                    if (sessionRef.current) sessionRef.current = recordAttempt(sessionRef.current, attempt);

                    setVolumeLevel(isSuccess ? 4 : volumeBars);

                    if (isSuccess) {
                        setNovaState("celebrating");
                        setShowCelebration(true);
                        setXp(p => p + 10);
                        setCorrect(p => p + 1);
                        setPhase("celebrating");
                        await speakAsNova(`${VOLUME_LABELS[4]} You said "${words[index].word}" loud AND clear!`);
                        await new Promise(r => setTimeout(r, 1600));
                        setShowCelebration(false);
                    } else {
                        setNovaState("incorrect");
                        setPhase("redirecting");
                        const tip = isLoudEnough ? "Make it super clear like a news anchor!" : words[index].tip;
                        const encouragement = isClearEnough ? "Even more power from your belly!" : "Open your mouth wide and stretch the vowel!";
                        await speakAsNova(`Great effort! ${tip} ${encouragement}`);
                        await new Promise(r => setTimeout(r, 800));
                    }

                    const next = index + 1;
                    if (next >= words.length) {
                        setPhase("summary");
                        await completeSession();
                    } else {
                        setIndex(next);
                        setVolumeLevel(0);
                        setNovaState("idle");
                        setPhase("waiting");
                    }
                } catch (err) {
                    setNovaState("incorrect");
                    setPhase("waiting");
                    await speakAsNova("Let's try that one more time when you're ready!");
                }
            },
            () => { setPhase("waiting"); setNovaState("idle"); setVolumeLevel(0); }
        );
    }

    function handleMicStop() {
        if (phase === "recording") {
            stopListening();
            if (phaseRef.current === "recording") setPhase("waiting");
        }
    }

    async function completeSession() {
        const session = sessionRef.current ?? {
            sessionId: `speak-${Date.now()}`,
            userId: profile?.name ?? "kid",
            sound: "voice",
            startTime: Date.now() - 60000,
            attempts: attemptsRef.current,
        };
        const summary = await endSession(session);
        const attemptsList = session.attempts?.length ? session.attempts : attemptsRef.current;
        const acc = summary?.averageAccuracy ?? (attemptsList.length
            ? Math.round((attemptsList.filter((a) => a.correct).length / attemptsList.length) * 100)
            : Math.round((correct / TOTAL_WORDS) * 100));
        setFinalAccuracy(acc);
        setXp(summary?.xpEarned ?? xp);

        try {
            const celebRes = await fetch("/api/celebrate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sound: "Voice Power", count: attemptsList.length || TOTAL_WORDS, accuracy: acc }),
            });
            const celebData = await celebRes.json();
            if (celebData.message) setSummaryMessage(celebData.message);
        } catch {
            setSummaryMessage(correct >= 4 ? "Amazing voice work! Your vocal cords are getting so strong!" : "Great effort today! Loud practice makes your voice stronger every time!");
        }

        try {
            const resp = await fetch("/api/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(summary.sessionData),
            });
            const payload = await resp.json().catch(() => ({}));
            if (resp.ok) {
                setStreak(payload.newStreak ?? streak);
                setProfile((p) => p ? {
                    ...p,
                    totalXP: (p.totalXP ?? 0) + (payload.xpEarned ?? summary.xpEarned ?? 0),
                    streak: payload.newStreak ?? p.streak,
                } : p);
            }
        } catch { /* ignore */ }
        setShowSummary(true);
    }

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
            {showSummary && (
                <SessionSummary
                    accuracy={finalAccuracy}
                    xpEarned={xp} wordsCompleted={Math.min(correct, TOTAL_WORDS)} totalWords={TOTAL_WORDS}
                    message={summaryMessage}
                    onPlayAgain={() => {
                        setIndex(0); setXp(0); setCorrect(0); setVolumeLevel(0); setPhase("waiting"); setShowSummary(false); setNovaState("idle"); setFinalAccuracy(0); setSummaryMessage("Great voice power!");
                        attemptsRef.current = [];
                        sessionRef.current = startSession(profile?.name ?? "kid", "voice");
                    }}
                    onDone={() => { window.location.href = "/kid"; }}
                />
            )}

            <main className="min-h-screen flex flex-col items-center px-4 md:px-8 pt-6 md:pt-12 pb-24 gap-6 md:gap-12 max-w-3xl md:max-w-5xl mx-auto w-full md:px-12">
                {/* Top bar */}
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/kid" className="text-[#945F95] hover:text-[#390052] transition-colors text-2xl" aria-label="Back">←</Link>
                        <StreakBadge streak={streak} />
                    </div>
                    <XPCounter xp={xp} />
                </div>

                {/* Mode pill */}
                <div className="flex items-center gap-2 bg-white rounded-[16px] px-4 py-1.5 border-2 border-[rgba(57,0,82,0.1)] border-b-[4px] border-b-[rgba(57,0,82,0.1)]">
                    <span className="text-lg">🔊</span>
                    <span className="text-sm font-black text-[#945F95]">Speak Up!</span>
                    <span className="text-xs text-[#1CB0F6] ml-1">LSVT · Dysarthria</span>
                </div>

                {/* Nova */}
                <div className="flex-shrink-0 mt-1">
                    <Nova state={novaState} size="lg" />
                </div>

                {/* Instruction */}
                <div className="text-center px-4">
                    <p className="text-[#945F95] text-sm uppercase tracking-widest mb-1">Say it as LOUD as you can!</p>
                    {words[index] && phase !== "intro" && (
                        <p className="text-[#945F95] text-sm italic">{words[index].tip}</p>
                    )}
                </div>

                {/* Target word — BIG and bold */}
                {words[index] && phase !== "intro" && (
                    <div className="flex flex-col items-center gap-3 px-8 py-5 rounded-3xl bg-white border-2 border-[rgba(57,0,82,0.1)] border-b-[6px] border-b-[#1CB0F6] w-full max-w-sm md:max-w-lg animate-[fade-slide-in_0.4s_ease-out_forwards]">
                        <span className="text-7xl">{words[index].emoji}</span>
                        <p className="text-5xl font-black text-[#390052] tracking-widest">{words[index].word}</p>
                    </div>
                )}

                {/* Volume meter */}
                {phase !== "intro" && (
                    <div className="w-full max-w-sm md:max-w-lg flex flex-col gap-2">
                        <p className="text-center text-sm text-[#945F95]">{VOLUME_LABELS[volumeLevel]}</p>
                        <div className="flex gap-2 items-end justify-center h-14">
                            {[1, 2, 3, 4].map((level) => (
                                <div
                                    key={level}
                                    className={[
                                        "rounded-full transition-all duration-300",
                                        "w-8",
                                        volumeLevel >= level
                                            ? level === 4
                                                ? "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.5)]"
                                                : level === 3
                                                    ? "bg-yellow-400"
                                                    : "bg-orange-400"
                                            : "bg-[rgba(57,0,82,0.1)]",
                                    ].join(" ")}
                                    style={{ height: `${level * 22}%` }}
                                />
                            ))}
                        </div>
                        <p className="text-center text-xs text-[#1CB0F6] font-medium">
                            {phase === "recording" ? "🎙️ Listening…" : phase === "waiting" ? "Hold mic and speak!" : ""}
                        </p>
                    </div>
                )}

                {/* Mic button — styled blue for dysarthria theme */}
                {phase !== "intro" && (
                    <div className="flex flex-col items-center gap-3 mt-2">
                        <button
                            onPointerDown={phase === "waiting" ? handleMicStart : undefined}
                            onPointerUp={phase === "recording" ? handleMicStop : undefined}
                            onPointerLeave={phase === "recording" ? handleMicStop : undefined}
                            disabled={!["waiting", "recording"].includes(phase)}
                            className={[
                                "w-24 h-24 rounded-full flex items-center justify-center",
                                "transition-all duration-200",
                                phase === "recording"
                                    ? "bg-[#1CB0F6] scale-110 animate-[mic-ring_1.2s_ease-in-out_infinite]"
                                    : phase === "waiting"
                                        ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_0_24px_rgba(96,165,250,0.4)] active:scale-95"
                                        : "bg-blue-900/40 opacity-40 cursor-not-allowed",
                            ].join(" ")}
                            aria-label="Hold to speak loudly"
                        >
                            <span className="text-4xl">🔊</span>
                        </button>
                        <p className="text-sm text-[#945F95] select-none">
                            {phase === "recording" ? "Release when done" : phase === "waiting" ? "Hold and SPEAK!" : ""}
                        </p>
                    </div>
                )}

                <div className="flex-1" />

                {/* Progress */}
                <div className="flex flex-col items-center gap-2 pb-2">
                    <p className="text-xs text-[#945F95]">Word {Math.min(index + 1, TOTAL_WORDS)} of {TOTAL_WORDS}</p>
                    <div className="flex gap-2">
                        {Array.from({ length: TOTAL_WORDS }).map((_, i) => (
                            <div key={i} className={["w-3 h-3 rounded-full transition-all duration-500",
                                i < index ? "bg-[#1CB0F6]" : i === index ? "bg-[#1CB0F6] scale-125 " : "bg-[rgba(57,0,82,0.1)]"
                            ].join(" ")} />
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}
