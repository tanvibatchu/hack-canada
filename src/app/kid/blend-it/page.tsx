// app/kid/blend-it/page.tsx — Blend It! exercise for ArtiCue.
// SLP Basis: Phoneme Blending + DTTC (Dynamic Temporal & Tactile Cueing) + ReST (Rapid Syllable Transition).
// DTTC: multisensory cueing + hierarchical support. ReST: rate control (slow → fast).
// Best evidence-based exercise for Childhood Apraxia of Speech (CAS).

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Nova from "@/components/Nova";
import MicButton from "@/components/MicButton";
import CelebrationBurst from "@/components/CelebrationBurst";
import XPCounter from "@/components/XPCounter";
import StreakBadge from "@/components/StreakBadge";
import SessionSummary from "@/components/SessionSummary";
import { speakAsNova } from "@/lib/elevenlabs";
import { analyzePhoneme, PhonemeResult } from "@/lib/gemini";
import { startListening, stopListening } from "@/lib/speechCapture";
import { blendData, BlendWord } from "@/lib/blendData";
import { TargetSound } from "@/lib/wordBanks";

type Phase = "loading" | "revealing" | "waiting" | "recording" | "analyzing" | "celebrating" | "redirecting" | "summary";

const TOTAL_WORDS = 6;
const MAX_ATTEMPTS = 2;
const SCORE_THRESHOLD = 65;

export default function BlendItPage() {
    const [activeSound] = useState<TargetSound>("r");
    const [streak] = useState(3);
    const [words, setWords] = useState<BlendWord[]>([]);
    const [index, setIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>("loading");
    const [revealedSegments, setRevealedSegments] = useState(0);
    const [xp, setXp] = useState(0);
    const [correct, setCorrect] = useState(0);
    const [attempts, setAttempts] = useState(0);
    const [lastResult, setLastResult] = useState<PhonemeResult | null>(null);
    const [showCelebration, setShowCelebration] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [novaState, setNovaState] = useState<"idle" | "celebrating" | "thinking" | "encouraging">("idle");
    // ReST rate control — slow (DTTC level 1) vs fast (DTTC level 3)
    const [rateMode, setRateMode] = useState<"slow" | "fast">("slow");
    const phaseRef = useRef<Phase>("loading");
    const rateModeRef = useRef<"slow" | "fast">("slow");

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { rateModeRef.current = rateMode; }, [rateMode]);

    useEffect(() => {
        const w = blendData[activeSound].slice(0, TOTAL_WORDS);
        setWords(w);
        startWord(0, w);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSound]);

    async function startWord(i: number, wordList: BlendWord[]) {
        setRevealedSegments(0);
        setAttempts(0);
        setLastResult(null);
        setPhase("revealing");
        setNovaState("thinking");
        const word = wordList[i];
        // Pause duration controlled by rate mode (ReST therapy)
        const pauseMs = rateModeRef.current === "slow" ? 900 : 250;

        for (let s = 0; s < word.segments.length; s++) {
            await speakAsNova(word.segments[s]);
            setRevealedSegments(s + 1);
            await new Promise(r => setTimeout(r, pauseMs));
        }

        await speakAsNova("Now you blend it!");
        setNovaState("idle");
        setPhase("waiting");
    }

    function handleMicStart() {
        if (phase !== "waiting") return;
        setPhase("recording");
        startListening(
            (transcript) => {
                if (phaseRef.current !== "recording") return;
                setPhase("analyzing");
                handleTranscript(transcript);
            },
            () => setPhase("waiting"),
            words[index]?.word
        );
    }

    function handleMicStop() {
        if (phase === "recording") {
            stopListening();
            if (phaseRef.current === "recording") setPhase("waiting");
        }
    }

    async function handleTranscript(transcript: string) {
        setNovaState("thinking");
        const result = await analyzePhoneme({
            word: words[index].word, transcript, targetSound: activeSound, age: 6,
        });
        setLastResult(result);

        if (result.correct || result.score >= SCORE_THRESHOLD) {
            setNovaState("celebrating");
            setShowCelebration(true);
            setXp(p => p + 10);
            setCorrect(p => p + 1);
            setPhase("celebrating");
            await speakAsNova(`You blended it! ${result.feedback}`);
            await new Promise(r => setTimeout(r, 1600));
            setShowCelebration(false);
            advanceWord();
        } else {
            setNovaState("encouraging");
            setPhase("redirecting");
            const nextAttempts = attempts + 1;
            setAttempts(nextAttempts);
            await speakAsNova(result.feedback);

            if (nextAttempts >= MAX_ATTEMPTS) {
                await speakAsNova(`The word was ${words[index].word}! Let's try the next one!`);
                advanceWord();
            } else {
                await speakAsNova("Let's hear the sounds again…");
                startWord(index, words);
            }
        }
    }

    function advanceWord() {
        const next = index + 1;
        if (next >= words.length) {
            setShowSummary(true);
            setPhase("summary");
        } else {
            setIndex(next);
            startWord(next, words);
        }
    }

    if (!words.length) return (
        <main className="min-h-screen flex items-center justify-center">
            <div className="text-6xl animate-[nova-idle_3s_ease-in-out_infinite]">🌟</div>
        </main>
    );

    const currentWord = words[index];

    return (
        <>
            <CelebrationBurst active={showCelebration} />
            {showSummary && (
                <SessionSummary
                    accuracy={Math.round((correct / TOTAL_WORDS) * 100)}
                    xpEarned={xp} wordsCompleted={correct} totalWords={TOTAL_WORDS}
                    message={correct >= 4 ? "You're a blending champion! Your brain is amazing!" : "Great blending practice! Every try makes you stronger!"}
                    onPlayAgain={() => {
                        setIndex(0); setXp(0); setCorrect(0); setShowSummary(false);
                        const w = blendData[activeSound].slice(0, TOTAL_WORDS);
                        setWords(w); startWord(0, w);
                    }}
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

                {/* Mode pill — with DTTC label for practitioners */}
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 border border-white/10">
                    <span className="text-lg">🔤</span>
                    <span className="text-sm font-semibold text-purple-200">Blend It!</span>
                    <span className="text-xs text-emerald-400 ml-1">DTTC · Apraxia</span>
                </div>

                {/* ReST Rate Control — slow/fast toggle (Rapid Syllable Transition Training) */}
                <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-1 border border-white/10 self-center">
                    <button
                        onClick={() => setRateMode("slow")}
                        className={["flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200",
                            rateMode === "slow" ? "bg-emerald-600 text-white shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "text-purple-300 hover:text-white"
                        ].join(" ")}
                        title="Slow: longer pauses between sounds (DTTC Level 1)"
                    >
                        🐢 Slow
                    </button>
                    <button
                        onClick={() => setRateMode("fast")}
                        className={["flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200",
                            rateMode === "fast" ? "bg-emerald-600 text-white shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "text-purple-300 hover:text-white"
                        ].join(" ")}
                        title="Fast: short transitions between sounds (ReST training)"
                    >
                        🐇 Fast
                    </button>
                </div>

                {/* Nova */}
                <div className="flex-shrink-0 mt-1">
                    <Nova state={novaState} size="lg" />
                </div>

                {/* Instruction */}
                <div className="text-center px-4">
                    <p className="text-purple-300 text-sm uppercase tracking-widest mb-1">
                        {phase === "revealing" ? "Listen to each sound…" : phase === "waiting" ? "Now blend them!" : phase === "recording" ? "I'm listening…" : phase === "celebrating" ? (lastResult?.feedback ?? "Amazing!") : ""}
                    </p>
                    <p className="text-white text-xl font-semibold">
                        {phase === "waiting" && "Say the whole word! 🎤"}
                        {phase === "analyzing" && "Nova is thinking… 💭"}
                        {phase === "redirecting" && (lastResult?.feedback ?? "So close! Try again!")}
                    </p>
                </div>

                {/* Segment tiles */}
                {currentWord && (
                    <div className="flex flex-col items-center gap-4 px-6 py-5 rounded-3xl bg-white/5 backdrop-blur-md border border-purple-400/30 w-full max-w-xs">
                        <span className="text-6xl">{currentWord.emoji}</span>

                        {/* Segment display */}
                        <div className="flex flex-wrap justify-center gap-2">
                            {currentWord.segments.map((seg, i) => (
                                <div key={i} className={[
                                    "px-4 py-2 rounded-xl text-xl font-black transition-all duration-500",
                                    i < revealedSegments
                                        ? "bg-purple-600/60 text-white border border-purple-400/60 shadow-[0_0_12px_rgba(124,58,237,0.4)]"
                                        : "bg-white/5 text-white/20 border border-white/10",
                                ].join(" ")}>
                                    {i < revealedSegments ? seg : "·"}
                                </div>
                            ))}
                        </div>

                        {/* Full display string (shown after all revealed) */}
                        {revealedSegments >= currentWord.segments.length && (
                            <p className="text-purple-300 text-lg font-mono tracking-widest animate-[fade-in_0.4s_ease-out]">
                                {currentWord.display}
                            </p>
                        )}
                    </div>
                )}

                {/* Mic button */}
                <div className="flex flex-col items-center mt-2">
                    <MicButton
                        onStart={handleMicStart}
                        onStop={handleMicStop}
                        isRecording={phase === "recording"}
                        disabled={phase !== "waiting"}
                    />
                </div>

                <div className="flex-1" />

                {/* Progress dots */}
                <div className="flex flex-col items-center gap-2 pb-2">
                    <p className="text-xs text-purple-400">Word {Math.min(index + 1, TOTAL_WORDS)} of {TOTAL_WORDS}</p>
                    <div className="flex gap-2">
                        {Array.from({ length: TOTAL_WORDS }).map((_, i) => (
                            <div key={i} className={["w-3 h-3 rounded-full transition-all duration-500",
                                i < index ? "bg-purple-400" : i === index ? "bg-purple-600 ring-2 ring-purple-400/50" : "bg-white/10"
                            ].join(" ")} />
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}
