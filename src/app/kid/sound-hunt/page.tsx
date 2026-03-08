// app/kid/sound-hunt/page.tsx — Sound Hunt exercise for ArtiCue.
// SLP Skill: Sound Isolation + Semantic Feature Analysis (SFA, Boyle & Coelho 1995)
// Where is the target sound? Start, Middle, or End?
// SFA hint button reveals word features progressively — gold-standard aphasia technique.

"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Nova from "@/components/Nova";
import ChoiceButton from "@/components/ChoiceButton";
import CelebrationBurst from "@/components/CelebrationBurst";
import XPCounter from "@/components/XPCounter";
import StreakBadge from "@/components/StreakBadge";
import SessionSummary from "@/components/SessionSummary";
<<<<<<< HEAD
import { speakAsNova, stopCurrentAudio } from "@/lib/elevenlabs";
import { generateSessionCelebration } from "@/lib/gemini";
=======
import { speakAsNova } from "@/lib/elevenlabs";

>>>>>>> 78b9e62c8d615ffbb55dfc709d1c4c7dcd5be608
import { TargetSound } from "@/lib/wordBanks";
import { semanticData } from "@/lib/semanticData";
import { startSession, recordAttempt, endSession, AttemptData, SessionWithId } from "@/lib/sessionManager";

type WordEntry = { word: string; emoji: string; position: "start" | "middle" | "end" };
type Phase = "loading" | "showing" | "answered" | "celebrating" | "redirecting" | "summary";
type Choice = "start" | "middle" | "end" | null;
type ChildProfile = { name: string; age: number; targetSounds: TargetSound[]; streak: number; totalXP: number; };

const TOTAL_ROUNDS = 8;

// Words with known sound positions per target sound
const SOUND_HUNT_WORDS: Record<TargetSound, WordEntry[]> = {
    r: [
        { word: "rabbit", emoji: "🐰", position: "start" },
        { word: "rainbow", emoji: "🌈", position: "start" },
        { word: "carrot", emoji: "🥕", position: "middle" },
        { word: "parrot", emoji: "🦜", position: "middle" },
        { word: "star", emoji: "⭐", position: "end" },
        { word: "bear", emoji: "🐻", position: "end" },
        { word: "rocket", emoji: "🚀", position: "start" },
        { word: "berry", emoji: "🍓", position: "start" },
    ],
    s: [
        { word: "sun", emoji: "☀️", position: "start" },
        { word: "sock", emoji: "🧦", position: "start" },
        { word: "pencil", emoji: "✏️", position: "middle" },
        { word: "basket", emoji: "🧺", position: "middle" },
        { word: "bus", emoji: "🚌", position: "end" },
        { word: "grass", emoji: "🌿", position: "end" },
        { word: "soap", emoji: "🧼", position: "start" },
        { word: "mouse", emoji: "🐭", position: "end" },
    ],
    th: [
        { word: "thumb", emoji: "👍", position: "start" },
        { word: "three", emoji: "3️⃣", position: "start" },
        { word: "feather", emoji: "🪶", position: "middle" },
        { word: "mother", emoji: "👩", position: "middle" },
        { word: "bath", emoji: "🛁", position: "end" },
        { word: "teeth", emoji: "🦷", position: "end" },
        { word: "thunder", emoji: "⛈️", position: "start" },
        { word: "mouth", emoji: "👄", position: "end" },
    ],
    l: [
        { word: "lion", emoji: "🦁", position: "start" },
        { word: "lemon", emoji: "🍋", position: "start" },
        { word: "balloon", emoji: "🎈", position: "middle" },
        { word: "jelly", emoji: "🍮", position: "middle" },
        { word: "ball", emoji: "⚽", position: "end" },
        { word: "bell", emoji: "🔔", position: "end" },
        { word: "leaf", emoji: "🍃", position: "start" },
        { word: "owl", emoji: "🦉", position: "end" },
    ],
    fluency: [
        { word: "cat", emoji: "🐱", position: "end" },
        { word: "sun", emoji: "☀️", position: "start" },
        { word: "ship", emoji: "🚢", position: "start" },
        { word: "fish", emoji: "🐟", position: "end" },
        { word: "chair", emoji: "🪑", position: "start" },
        { word: "peach", emoji: "🍑", position: "end" },
        { word: "brush", emoji: "🪥", position: "end" },
        { word: "sheet", emoji: "📄", position: "start" },
    ],
};

const POSITION_LABELS = { start: "Start 🟢", middle: "Middle 🟡", end: "End 🔴" };

export default function SoundHuntPage() {
    const [profile, setProfile] = useState<ChildProfile | null>(null);
    const [activeSound, setActiveSound] = useState<TargetSound>("r");
    const [streak, setStreak] = useState(0);
    const [words, setWords] = useState<WordEntry[]>([]);
    const [index, setIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>("loading");
    const [choice, setChoice] = useState<Choice>(null);
    const [xp, setXp] = useState(0);
    const [correct, setCorrect] = useState(0);
    const [showCelebration, setShowCelebration] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [finalAccuracy, setFinalAccuracy] = useState(0);
    const [summaryMessage, setSummaryMessage] = useState("Great listening practice! You're getting better every time!");
    const [novaState, setNovaState] = useState<"idle" | "celebrating" | "thinking" | "encouraging">("idle");
    // SFA hint state — reveals category → function → attribute progressively
    const [hintLevel, setHintLevel] = useState(0); // 0=none, 1=category, 2=function, 3=attribute
    const sessionRef = useRef<SessionWithId | null>(null);
    const attemptsRef = useRef<AttemptData[]>([]);

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
                        age: typeof p.age === "number" ? p.age : 7,
                        targetSounds: targets,
                        streak: p.streak ?? 0,
                        totalXP: p.totalXP ?? p.xp ?? 0,
                    });
                    setActiveSound((targets[0] ?? "r") as TargetSound);
                    setStreak(p.streak ?? 0);
                    return;
                }
            } catch {
                const fallback = { name: "Maya", age: 7, targetSounds: ["r"] as TargetSound[], streak: 1, totalXP: 0 };
                setProfile(fallback);
                setActiveSound("r");
                setStreak(fallback.streak);
            }
        }
        loadProfile();
    }, []);

    useEffect(() => {
        const w = SOUND_HUNT_WORDS[activeSound].slice(0, TOTAL_ROUNDS);
        setWords(w);
        setPhase("showing");
        setHintLevel(0);
        setNovaState("idle");
        setXp(0);
        setCorrect(0);
        attemptsRef.current = [];
        sessionRef.current = startSession(profile?.name ?? "kid", activeSound);
    }, [activeSound, profile?.name]);

    async function handleChoice(picked: "start" | "middle" | "end") {
        if (phase !== "showing") return;
        setChoice(picked);
        const isCorrect = picked === words[index].position;
        const attempt: AttemptData = {
            word: words[index].word,
            transcript: picked,
            score: isCorrect ? 100 : 60,
            correct: isCorrect,
            substitution: null,
        };
        attemptsRef.current = [...attemptsRef.current, attempt];
        if (sessionRef.current) sessionRef.current = recordAttempt(sessionRef.current, attempt);

        if (isCorrect) {
            setPhase("celebrating");
            setNovaState("celebrating");
            setShowCelebration(true);
            setXp(p => p + 10);
            setCorrect(p => p + 1);
            await speakAsNova("Yes! You found it! Great listening!");
            await new Promise(r => setTimeout(r, 1500));
            setShowCelebration(false);
        } else {
            setPhase("redirecting");
            setNovaState("encouraging");
            await speakAsNova(`Ooh, so close! The ${activeSound.toUpperCase()} sound is at the ${words[index].position}. Let's try the next one!`);
            await new Promise(r => setTimeout(r, 1000));
        }

        setChoice(null);
        setHintLevel(0); // reset hint for next word
        const next = index + 1;
        if (next >= words.length) {
            setPhase("summary");
            await completeSession();
        } else {
            setIndex(next);
            setNovaState("idle");
            setPhase("showing");
        }
    }

    async function completeSession() {
        const session = sessionRef.current ?? {
            sessionId: `hunt-${Date.now()}`,
            userId: profile?.name ?? "kid",
            sound: activeSound,
            startTime: Date.now() - 60000,
            attempts: attemptsRef.current,
        };
        const summary = await endSession(session);
        const attemptsList = session.attempts?.length ? session.attempts : attemptsRef.current;
        const acc = summary?.averageAccuracy ?? (attemptsList.length
            ? Math.round((attemptsList.filter((a) => a.correct).length / attemptsList.length) * 100)
            : Math.round((correct / TOTAL_ROUNDS) * 100));
        setFinalAccuracy(acc);
        setXp(summary?.xpEarned ?? xp);

        try {
            const celebRes = await fetch("/api/celebrate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sound: activeSound.toUpperCase(), count: attemptsList.length || TOTAL_ROUNDS, accuracy: acc }),
            });
            const celebData = await celebRes.json();
            if (celebData.message) setSummaryMessage(celebData.message);
        } catch {
            setSummaryMessage(correct >= 6 ? "You're a sound detective! Amazing ears!" : "Great listening practice! You're getting better every time!");
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

    useEffect(() => {
        if (phase !== "showing" || !words[index]) return;
        (async () => {
            setNovaState("thinking");
            await speakAsNova(`Where is the ${activeSound.toUpperCase()} sound in ${words[index].word}? Start, middle, or end?`);
            setNovaState("idle");
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index, phase]);

    useEffect(() => () => { stopCurrentAudio(); }, []);

    if (!words.length) return (
        <main className="min-h-screen flex items-center justify-center">
            <div className="text-6xl animate-[nova-idle_3s_ease-in-out_infinite]">🌟</div>
        </main>
    );

    return (
        <>
            <CelebrationBurst active={showCelebration} />
            {showSummary && (
                <SessionSummary
                    accuracy={finalAccuracy}
                    xpEarned={xp} wordsCompleted={correct} totalWords={TOTAL_ROUNDS}
                    message={summaryMessage}
                    onPlayAgain={() => {
                        setIndex(0); setXp(0); setCorrect(0); setPhase("showing"); setShowSummary(false); setNovaState("idle"); setHintLevel(0); setFinalAccuracy(0); setSummaryMessage("Great listening practice! You're getting better every time!");
                        attemptsRef.current = [];
                        sessionRef.current = startSession(profile?.name ?? "kid", activeSound);
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

                {/* Mode pill — with SFA label for practitioners */}
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 border border-white/10">
                    <span className="text-lg">📍</span>
                    <span className="text-sm font-semibold text-purple-200">Sound Hunt</span>
                    <span className="text-xs text-blue-400 ml-1">SFA · Aphasia</span>
                </div>

                {/* Nova */}
                <div className="flex-shrink-0 mt-1">
                    <Nova state={novaState} size="lg" />
                </div>

                {/* Instruction */}
                <div className="text-center px-4">
                    <p className="text-purple-300 text-sm uppercase tracking-widest mb-1">Where is the sound?</p>
                    <p className="text-white text-xl font-semibold">
                        Where is the <span className="text-purple-300 font-black">{activeSound.toUpperCase()}</span> sound in…
                    </p>
                </div>

                {/* Word display */}
                {words[index] && (
                    <div className="flex flex-col items-center gap-3 px-8 py-5 rounded-3xl bg-white/5 backdrop-blur-md border border-purple-400/30 shadow-[0_0_24px_rgba(124,58,237,0.2)] w-full max-w-xs animate-[fade-slide-in_0.4s_ease-out_forwards]">
                        <span className="text-7xl">{words[index].emoji}</span>
                        <p className="text-3xl font-bold text-white tracking-wide">{words[index].word}</p>
                    </div>
                )}

                {/* SFA Hint system — Semantic Feature Analysis for Aphasia word retrieval */}
                {words[index] && (
                    <div className="w-full max-w-xs flex flex-col gap-2">
                        {/* Hint reveals: category → function → attribute */}
                        {hintLevel > 0 && (
                            <div className="bg-blue-900/30 border border-blue-400/30 rounded-2xl px-4 py-2 animate-[fade-in_0.3s_ease-out]">
                                {hintLevel >= 1 && semanticData[words[index].word] && (
                                    <p className="text-blue-200 text-sm">📦 {semanticData[words[index].word].category}</p>
                                )}
                                {hintLevel >= 2 && semanticData[words[index].word] && (
                                    <p className="text-blue-200 text-sm mt-1">⚙️ {semanticData[words[index].word].function}</p>
                                )}
                                {hintLevel >= 3 && semanticData[words[index].word] && (
                                    <p className="text-blue-200 text-sm mt-1">✨ {semanticData[words[index].word].attribute}</p>
                                )}
                            </div>
                        )}
                        {hintLevel < 3 && phase === "showing" && (
                            <button
                                onClick={() => setHintLevel(h => h + 1)}
                                className="text-xs text-blue-400 hover:text-blue-200 flex items-center gap-1 justify-center py-1 transition-colors"
                            >
                                💡 {hintLevel === 0 ? "Give me a hint" : "More hint"}
                            </button>
                        )}
                    </div>
                )}

                {/* Answer buttons */}
                <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
                    {(["start", "middle", "end"] as const).map((pos) => (
                        <ChoiceButton
                            key={pos}
                            label={POSITION_LABELS[pos]}
                            state={
                                choice === null ? "default"
                                    : choice === pos && pos === words[index]?.position ? "correct"
                                        : choice === pos ? "wrong"
                                            : "default"
                            }
                            onClick={() => handleChoice(pos)}
                            disabled={phase !== "showing"}
                        />
                    ))}
                </div>

                <div className="flex-1" />

                {/* Progress dots */}
                <div className="flex flex-col items-center gap-2 pb-2">
                    <p className="text-xs text-purple-400">Round {Math.min(index + 1, TOTAL_ROUNDS)} of {TOTAL_ROUNDS}</p>
                    <div className="flex gap-2">
                        {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
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
