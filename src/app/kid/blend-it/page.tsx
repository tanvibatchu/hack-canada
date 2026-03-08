// app/kid/blend-it/page.tsx — Blend It! exercise for ArtiCue.
// SLP Basis: Phoneme Blending + DTTC (Dynamic Temporal & Tactile Cueing) + ReST (Rapid Syllable Transition).
// DTTC: multisensory cueing + hierarchical support. ReST: rate control (slow → fast).
// Best evidence-based exercise for Childhood Apraxia of Speech (CAS).

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Nova from "@/components/Nova";
import MicButton from "@/components/MicButton";
import AudioControls from "@/components/AudioControls";
import CelebrationBurst from "@/components/CelebrationBurst";
import XPCounter from "@/components/XPCounter";
import StreakBadge from "@/components/StreakBadge";
import SessionSummary from "@/components/SessionSummary";
import { speakAsNova, stopCurrentAudio } from "@/lib/elevenlabs";
import type { PhonemeResult } from "@/lib/gemini";
import { startListening, stopListening } from "@/lib/speechCapture";
import { blendData, BlendWord, segmentToSpeech } from "@/lib/blendData";
import { TargetSound } from "@/lib/wordBanks";
import { startSession, recordAttempt, endSession, AttemptData, SessionWithId } from "@/lib/sessionManager";

type Phase = "loading" | "ready" | "revealing" | "waiting" | "recording" | "analyzing" | "celebrating" | "redirecting" | "summary";
type ChildProfile = { name: string; age: number; targetSounds: TargetSound[]; streak: number; totalXP: number; };

const TOTAL_WORDS = 6;
const MAX_ATTEMPTS = 2;
const SCORE_THRESHOLD = 65;
const INTER_SEGMENT_PAUSE_MS = { slow: 220, fast: 120 } as const;
const SEGMENT_RENDER_BUFFER_MS = 60;

export default function BlendItPage() {
    const [profile, setProfile] = useState<ChildProfile | null>(null);
    const [activeSound, setActiveSound] = useState<TargetSound>("r");
    const [streak, setStreak] = useState(0);
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
    const [finalAccuracy, setFinalAccuracy] = useState(0);
    const [summaryMessage, setSummaryMessage] = useState("Great blending practice!");
    const [novaState, setNovaState] = useState<"idle" | "celebrating" | "thinking" | "encouraging">("idle");
    // ReST rate control — slow (DTTC level 1) vs fast (DTTC level 3)
    const [rateMode, setRateMode] = useState<"slow" | "fast">("slow");
    const phaseRef = useRef<Phase>("loading");
    const rateModeRef = useRef<"slow" | "fast">("slow");
    // Cancellation token: each revealWord call gets a unique ID; stale runs abort themselves
    const runIdRef = useRef(0);
    // Store current word list for revealWord to access without stale closure
    const wordsRef = useRef<BlendWord[]>([]);
    const indexRef = useRef(0);
    const sessionRef = useRef<SessionWithId | null>(null);
    const attemptsRef = useRef<AttemptData[]>([]);

    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { rateModeRef.current = rateMode; }, [rateMode]);

    useEffect(() => {
        async function loadProfile() {
            try {
                const res = await fetch("/api/profile");
                if (!res.ok) throw new Error("profile fetch failed");
                const data = await res.json();
                const p = data?.profile;
                if (p) {
                    const targets = Array.isArray(p.targetSounds) && p.targetSounds.length
                        ? (p.targetSounds as TargetSound[])
                        : ["r" as TargetSound];
                    setProfile({
                        name: p.name ?? "Friend",
                        age: typeof p.age === "number" ? p.age : 6,
                        targetSounds: targets,
                        streak: p.streak ?? 0,
                        totalXP: p.totalXP ?? p.xp ?? 0,
                    });
                    setActiveSound((targets[0] ?? "r") as TargetSound);
                    setStreak(p.streak ?? 0);
                    return;
                }
            } catch {
                const fallback = { name: "Maya", age: 6, targetSounds: ["r", "s"] as TargetSound[], streak: 1, totalXP: 0 };
                setProfile(fallback);
                setActiveSound("r");
                setStreak(fallback.streak);
            }
        }
        loadProfile();
    }, []);

    useEffect(() => {
        const w = blendData[activeSound].slice(0, TOTAL_WORDS);
        setWords(w);
        wordsRef.current = w;
        loadWord(0);
        attemptsRef.current = [];
        setXp(0);
        setCorrect(0);
        sessionRef.current = startSession(profile?.name ?? "kid", activeSound);
        return () => { runIdRef.current += 1; stopCurrentAudio(); stopListening(); }; // cancel on unmount / Strict Mode remount
    }, [activeSound, profile?.name]);

    /** Prepare a word for display and show the Start button — does NOT play audio. */
    function loadWord(i: number) {
        runIdRef.current++; // invalidate any in-flight reveal
        stopCurrentAudio();
        indexRef.current = i;
        setRevealedSegments(0);
        setAttempts(0);
        setLastResult(null);
        setNovaState("idle");
        setPhase("ready");
    }

    /** Play the sounding-out sequence. Called by Start button and Replay button. */
    async function revealWord() {
        const runId = ++runIdRef.current;
        const word = wordsRef.current[indexRef.current];
        if (!word) return;

        setRevealedSegments(0);
        setPhase("revealing");
        setNovaState("thinking");

        const pauseMs = INTER_SEGMENT_PAUSE_MS[rateModeRef.current];
        // Small warmup so first phoneme never clips
        await new Promise(r => setTimeout(r, 120));

        for (const [segmentIndex, segment] of word.segments.entries()) {
            if (runIdRef.current !== runId) { stopCurrentAudio(); return; }
            setRevealedSegments(segmentIndex + 1);
            await new Promise(r => setTimeout(r, SEGMENT_RENDER_BUFFER_MS));
            if (runIdRef.current !== runId) { stopCurrentAudio(); return; }
            await speakAsNova(segmentToSpeech(segment, segmentIndex === 0), 0.82);
            if (runIdRef.current !== runId) { stopCurrentAudio(); return; }
            if (segmentIndex < word.segments.length - 1) {
                await new Promise(r => setTimeout(r, pauseMs));
            }
        }

        if (runIdRef.current !== runId) { stopCurrentAudio(); return; }
        // Say the full word after all segments so the child hears the blend target
        await speakAsNova(word.word);
        if (runIdRef.current !== runId) { stopCurrentAudio(); return; }
        await speakAsNova("Now you blend it!");
        if (runIdRef.current !== runId) { stopCurrentAudio(); return; }
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
            () => setPhase("waiting")
        );
    }

    function handleMicStop() {
        if (phase === "recording") {
            stopListening();
            if (phaseRef.current === "recording") setPhase("waiting");
        }
    }

    async function handleTranscript(transcript: string) {
        // Stop mic before any TTS plays to prevent echo feedback loop
        stopListening();
        setNovaState("thinking");
        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    word: wordsRef.current[indexRef.current].word,
                    transcript,
                    targetSound: activeSound,
                    age: profile?.age ?? 6,
                }),
            });
            const raw = await res.json();
            if (!res.ok || raw.error) { setPhase("waiting"); setNovaState("idle"); return; }
            const result: PhonemeResult = {
                ...raw,
                feedback: raw.feedback || "Good try! Let's keep going!",
                mouthCue: raw.mouthCue || "",
            };
            const isCorrect = result.correct || result.score >= SCORE_THRESHOLD;
            const normalized: PhonemeResult = { ...result, correct: isCorrect };
            setLastResult(normalized);
            const attempt: AttemptData = {
                word: wordsRef.current[indexRef.current].word,
                transcript,
                score: result.score,
                correct: isCorrect,
                substitution: result.substitution,
            };
            attemptsRef.current = [...attemptsRef.current, attempt];
            if (sessionRef.current) sessionRef.current = recordAttempt(sessionRef.current, attempt);

            if (isCorrect) {
                setNovaState("celebrating");
                setShowCelebration(true);
                setXp(p => p + 10);
                setCorrect(p => p + 1);
                setPhase("celebrating");
                await speakAsNova(`You blended it! ${normalized.feedback || "Amazing!"}`);
                await new Promise(r => setTimeout(r, 1600));
                setShowCelebration(false);
                advanceWord();
            } else {
                setNovaState("encouraging");
                setPhase("redirecting");
                const nextAttempts = attempts + 1;
                setAttempts(nextAttempts);
                if (result.feedback) await speakAsNova(result.feedback);

                if (nextAttempts >= MAX_ATTEMPTS) {
                    await speakAsNova(`The word was ${wordsRef.current[indexRef.current].word}! Let's try the next one!`);
                    advanceWord();
                } else {
                    await speakAsNova("Let's hear the sounds again…");
                    await new Promise(r => setTimeout(r, 300));
                    await revealWord();
                }
            }
        } catch {
            setNovaState("encouraging");
            setPhase("waiting");
            await speakAsNova("Let's try that word again in a moment!");
        }
    }

    function advanceWord() {
        const next = indexRef.current + 1;
        if (next >= wordsRef.current.length) {
            setPhase("summary");
            completeSession();
        } else {
            setIndex(next);
            indexRef.current = next;
            loadWord(next);
        }
    }

    async function completeSession() {
        const session = sessionRef.current ?? {
            sessionId: `blend-${Date.now()}`,
            userId: profile?.name ?? "kid",
            sound: activeSound,
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
                body: JSON.stringify({ sound: activeSound.toUpperCase(), count: attemptsList.length || TOTAL_WORDS, accuracy: acc }),
            });
            const celebData = await celebRes.json();
            if (celebData.message) setSummaryMessage(celebData.message);
        } catch {
            setSummaryMessage(correct >= 4 ? "You're a blending champion! Your brain is amazing!" : "Great blending practice! Every try makes you stronger!");
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

    if (!words.length) return (
        <main className="min-h-screen flex items-center justify-center">
            <div className="text-6xl animate-[nova-idle_3s_ease-in-out_infinite]">🌟</div>
        </main>
    );

    const currentWord = words[index];

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
                        setIndex(0); setXp(0); setCorrect(0); setShowSummary(false); setFinalAccuracy(0); setSummaryMessage("Great blending practice!");
                        attemptsRef.current = [];
                        sessionRef.current = startSession(profile?.name ?? "kid", activeSound);
                        const w = blendData[activeSound].slice(0, TOTAL_WORDS);
                        setWords(w); wordsRef.current = w; loadWord(0);
                        setPhase("ready");
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

                {/* Mode pill — with DTTC label for practitioners */}
                <div className="flex items-center gap-2 bg-white rounded-[16px] px-4 py-1.5 border-2 border-[rgba(57,0,82,0.1)] border-b-[4px] border-b-[rgba(57,0,82,0.1)]">
                    <span className="text-lg">🔤</span>
                    <span className="text-sm font-black text-[#945F95]">Blend It!</span>
                    <span className="text-xs text-emerald-400 ml-1">DTTC · Apraxia</span>
                </div>

                {/* ReST Rate Control — slow/fast toggle (Rapid Syllable Transition Training) */}
                <div className="flex items-center gap-2 bg-white/5 rounded-2xl p-1 border border-white/10 self-center">
                    <button
                        onClick={() => setRateMode("slow")}
                        className={["flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-black transition-all duration-200",
                            rateMode === "slow" ? "bg-[#58CC02] scale-125 text-[#390052] shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "text-[#945F95] hover:text-[#390052]"
                        ].join(" ")}
                        title="Slow: longer pauses between sounds (DTTC Level 1)"
                    >
                        🐢 Slow
                    </button>
                    <button
                        onClick={() => setRateMode("fast")}
                        className={["flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-black transition-all duration-200",
                            rateMode === "fast" ? "bg-[#58CC02] scale-125 text-[#390052] shadow-[0_0_10px_rgba(52,211,153,0.4)]" : "text-[#945F95] hover:text-[#390052]"
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
                    <p className="text-[#945F95] text-sm uppercase tracking-widest mb-1">
                        {phase === "ready" ? "Ready to listen?" : phase === "revealing" ? "Listen to each sound…" : phase === "waiting" ? "Now blend them!" : phase === "recording" ? "I'm listening…" : phase === "celebrating" ? (lastResult?.feedback ?? "Amazing!") : ""}
                    </p>
                    <p className="text-[#390052] text-xl font-black">
                        {phase === "ready" && "Tap Start to hear the sounds 🔊"}
                        {phase === "waiting" && "Say the whole word! 🎤"}
                        {phase === "analyzing" && "Nova is thinking… 💭"}
                        {phase === "redirecting" && (lastResult?.feedback ?? "So close! Try again!")}
                    </p>
                </div>

                {/* Segment tiles */}
                {currentWord && (
                    <div className="flex flex-col items-center gap-4 px-6 py-5 rounded-3xl bg-white/5 backdrop-blur-md border border-purple-400/30 w-full max-w-sm md:max-w-lg">
                        <span className="text-6xl">{currentWord.emoji}</span>

                        {/* Segment display */}
                        <div className="flex flex-wrap justify-center gap-2">
                            {currentWord.segments.map((seg, i) => (
                                <div key={i} className={[
                                    "px-4 py-2 rounded-xl text-xl font-black transition-all duration-500",
                                    i < revealedSegments
                                        ? "bg-[#CE7DA5] scale-125/60 text-[#390052] border border-purple-400/60 shadow-[0_0_12px_rgba(124,58,237,0.4)]"
                                        : "bg-white/5 text-[#390052]/20 border border-white/10",
                                ].join(" ")}>
                                    {i < revealedSegments ? seg : "·"}
                                </div>
                            ))}
                        </div>

                        {/* Full display string (shown after all revealed) */}
                        {revealedSegments >= currentWord.segments.length && (
                            <p className="text-[#945F95] text-lg font-mono tracking-widest animate-[fade-in_0.4s_ease-out]">
                                {currentWord.display}
                            </p>
                        )}
                    </div>
                )}

                {/* Start button (ready phase) */}
                {phase === "ready" && (
                    <button
                        onClick={revealWord}
                        className="mt-2 px-8 py-4 bg-[#CE7DA5] scale-125 hover:bg-purple-500 active:scale-95 text-[#390052] text-lg font-black rounded-2xl shadow-lg shadow-purple-500/40 transition-all duration-200 flex items-center gap-2"
                    >
                        🔊 Start
                    </button>
                )}

                {/* Mic + Replay buttons (waiting phase) */}
                {(phase === "waiting" || phase === "recording") && (
                    <div className="flex flex-col items-center gap-4 mt-2">
                        <MicButton
                            onStart={handleMicStart}
                            onStop={handleMicStop}
                            isRecording={phase === "recording"}
                            disabled={phase !== "waiting"}
                        />
                        <AudioControls disabled={phase === "recording"} />
                    </div>
                )}

                {/* Mic button for non-waiting/ready phases (disabled) */}
                {phase !== "waiting" && phase !== "recording" && phase !== "ready" && (
                    <div className="flex flex-col items-center mt-2">
                        <MicButton
                            onStart={handleMicStart}
                            onStop={handleMicStop}
                            isRecording={false}
                            disabled={true}
                        />
                    </div>
                )}

                <div className="flex-1" />

                {/* Progress dots */}
                <div className="flex flex-col items-center gap-2 pb-2">
                    <p className="text-xs text-[#945F95]">Word {Math.min(index + 1, TOTAL_WORDS)} of {TOTAL_WORDS}</p>
                    <div className="flex gap-2">
                        {Array.from({ length: TOTAL_WORDS }).map((_, i) => (
                            <div key={i} className={["w-3 h-3 rounded-full transition-all duration-500",
                                i < index ? "bg-[#CE7DA5]" : i === index ? "bg-[#CE7DA5] scale-125 " : "bg-[rgba(57,0,82,0.1)]"
                            ].join(" ")} />
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}
