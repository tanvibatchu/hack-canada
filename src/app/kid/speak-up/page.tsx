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
import { speakAsNova } from "@/lib/elevenlabs";
import { analyzePhoneme } from "@/lib/gemini";
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

// Volume levels for the visual intensity meter (0–4 bars)
const VOLUME_LABELS = ["Too quiet", "Louder!", "Getting there!", "Strong voice!", "PERFECT! 📣"];

export default function SpeakUpPage() {
    const [streak] = useState(3);
    const [words] = useState(SPEAK_UP_WORDS.slice(0, TOTAL_WORDS));
    const [index, setIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>("intro");
    const [xp, setXp] = useState(0);
    const [correct, setCorrect] = useState(0);
    const [volumeLevel, setVolumeLevel] = useState(0); // 0–4
    const [showCelebration, setShowCelebration] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [novaState, setNovaState] = useState<"idle" | "celebrating" | "thinking" | "encouraging">("encouraging");
    const phaseRef = useRef<Phase>("intro");

    useEffect(() => { phaseRef.current = phase; }, [phase]);

    useEffect(() => {
        // Brief intro — Nova explains the exercise
        async function intro() {
            setNovaState("encouraging");
            await speakAsNova("This is Speak Up! Say each word as LOUD and CLEAR as you can! Let's wake up those vocal cords!");
            setPhase("waiting");
            setNovaState("idle");
        }
        intro();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleMicStart() {
        if (phase !== "waiting") return;
        setVolumeLevel(0);
        setPhase("recording");

        // Simulate ramping volume animation while recording
        let v = 0;
        const ramp = setInterval(() => {
            v = Math.min(v + 1, 3);
            setVolumeLevel(v);
        }, 400);

        startListening(
            async (transcript) => {
                clearInterval(ramp);
                if (phaseRef.current !== "recording") return;
                setPhase("analyzing");
                setNovaState("thinking");

                const result = await analyzePhoneme({
                    word: words[index].word.toLowerCase(),
                    transcript: transcript.toLowerCase(),
                    targetSound: "r", // placeholder — backend scores loudness/clarity
                    age: 7,
                });

                // In the real app, the backend scores voice intensity (dB) and clarity
                // For UI stub: score >= 50 = good enough loudness
                const loudEnough = result.score >= 50;
                const finalVolume = loudEnough ? 4 : Math.floor(Math.random() * 2) + 1;
                setVolumeLevel(finalVolume);

                if (loudEnough) {
                    setNovaState("celebrating");
                    setShowCelebration(true);
                    setXp(p => p + 10);
                    setCorrect(p => p + 1);
                    setPhase("celebrating");
                    await speakAsNova(`${VOLUME_LABELS[4]} You said "${words[index].word}" with a powerful voice!`);
                    await new Promise(r => setTimeout(r, 1600));
                    setShowCelebration(false);
                } else {
                    setNovaState("encouraging");
                    setPhase("redirecting");
                    await speakAsNova(`Good try! ${words[index].tip} Say "${words[index].word}" even LOUDER!`);
                    await new Promise(r => setTimeout(r, 800));
                }

                const next = index + 1;
                if (next >= words.length) {
                    setShowSummary(true);
                    setPhase("summary");
                } else {
                    setIndex(next);
                    setVolumeLevel(0);
                    setNovaState("idle");
                    setPhase("waiting");
                }
            },
            () => { setPhase("waiting"); setNovaState("idle"); },
            words[index]?.word.toLowerCase()
        );
    }

    function handleMicStop() {
        if (phase === "recording") {
            stopListening();
            if (phaseRef.current === "recording") setPhase("waiting");
        }
    }

    return (
        <>
            <CelebrationBurst active={showCelebration} />
            {showSummary && (
                <SessionSummary
                    accuracy={Math.round((correct / TOTAL_WORDS) * 100)}
                    xpEarned={xp} wordsCompleted={correct} totalWords={TOTAL_WORDS}
                    message={correct >= 4 ? "Amazing voice work! Your vocal cords are getting so strong!" : "Great effort today! Loud practice makes your voice stronger every time!"}
                    onPlayAgain={() => { setIndex(0); setXp(0); setCorrect(0); setVolumeLevel(0); setPhase("waiting"); setShowSummary(false); setNovaState("idle"); }}
                    onDone={() => { window.location.href = "/kid"; }}
                />
            )}

            <main className="min-h-screen flex flex-col items-center px-4 pt-4 pb-8 gap-4 max-w-sm mx-auto">
                {/* Top bar */}
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/kid" className="text-purple-400 hover:text-white transition-colors text-2xl" aria-label="Back">←</Link>
                        <StreakBadge streak={streak} />
                    </div>
                    <XPCounter xp={xp} />
                </div>

                {/* Mode pill */}
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 border border-white/10">
                    <span className="text-lg">🔊</span>
                    <span className="text-sm font-semibold text-purple-200">Speak Up!</span>
                    <span className="text-xs text-blue-400 ml-1">LSVT · Dysarthria</span>
                </div>

                {/* Nova */}
                <div className="flex-shrink-0 mt-1">
                    <Nova state={novaState} size="lg" />
                </div>

                {/* Instruction */}
                <div className="text-center px-4">
                    <p className="text-purple-300 text-sm uppercase tracking-widest mb-1">Say it as LOUD as you can!</p>
                    {words[index] && phase !== "intro" && (
                        <p className="text-purple-200 text-sm italic">{words[index].tip}</p>
                    )}
                </div>

                {/* Target word — BIG and bold */}
                {words[index] && phase !== "intro" && (
                    <div className="flex flex-col items-center gap-3 px-8 py-5 rounded-3xl bg-white/5 backdrop-blur-md border border-blue-400/30 shadow-[0_0_24px_rgba(96,165,250,0.2)] w-full max-w-xs animate-[fade-slide-in_0.4s_ease-out_forwards]">
                        <span className="text-7xl">{words[index].emoji}</span>
                        <p className="text-5xl font-black text-white tracking-widest">{words[index].word}</p>
                    </div>
                )}

                {/* Volume meter */}
                {phase !== "intro" && (
                    <div className="w-full max-w-xs flex flex-col gap-2">
                        <p className="text-center text-sm text-purple-300">{VOLUME_LABELS[volumeLevel]}</p>
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
                                            : "bg-white/10",
                                    ].join(" ")}
                                    style={{ height: `${level * 22}%` }}
                                />
                            ))}
                        </div>
                        <p className="text-center text-xs text-blue-400 font-medium">
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
                                    ? "bg-blue-400 scale-110 animate-[mic-ring_1.2s_ease-in-out_infinite]"
                                    : phase === "waiting"
                                        ? "bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_0_24px_rgba(96,165,250,0.4)] active:scale-95"
                                        : "bg-blue-900/40 opacity-40 cursor-not-allowed",
                            ].join(" ")}
                            aria-label="Hold to speak loudly"
                        >
                            <span className="text-4xl">🔊</span>
                        </button>
                        <p className="text-sm text-blue-300 select-none">
                            {phase === "recording" ? "Release when done" : phase === "waiting" ? "Hold and SPEAK!" : ""}
                        </p>
                    </div>
                )}

                <div className="flex-1" />

                {/* Progress */}
                <div className="flex flex-col items-center gap-2 pb-2">
                    <p className="text-xs text-purple-400">Word {Math.min(index + 1, TOTAL_WORDS)} of {TOTAL_WORDS}</p>
                    <div className="flex gap-2">
                        {Array.from({ length: TOTAL_WORDS }).map((_, i) => (
                            <div key={i} className={["w-3 h-3 rounded-full transition-all duration-500",
                                i < index ? "bg-blue-400" : i === index ? "bg-blue-600 ring-2 ring-blue-400/50" : "bg-white/10"
                            ].join(" ")} />
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}
