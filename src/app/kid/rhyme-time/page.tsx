// app/kid/rhyme-time/page.tsx — Rhyme Time exercise for ArtiCue.
// SLP Skill: Phonological Awareness — Tap the word that rhymes with Nova's word.
// Tap-only interaction, no mic needed. 8 rounds per session.

"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Nova from "@/components/Nova";
import ChoiceButton from "@/components/ChoiceButton";
import CelebrationBurst from "@/components/CelebrationBurst";
import XPCounter from "@/components/XPCounter";
import StreakBadge from "@/components/StreakBadge";
import SessionSummary from "@/components/SessionSummary";
import { speakAsNova } from "@/lib/elevenlabs";
import { rhymeData, RhymeChallenge } from "@/lib/rhymeData";
import { TargetSound } from "@/lib/wordBanks";
import { generateSessionCelebration } from "@/lib/gemini";
import { startSession, recordAttempt, endSession, AttemptData, SessionWithId } from "@/lib/sessionManager";

type Phase = "showing" | "answered" | "celebrating" | "redirecting" | "summary";
type ChildProfile = { name: string; age: number; targetSounds: TargetSound[]; streak: number; totalXP: number; };

const TOTAL_ROUNDS = 8;

function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

export default function RhymeTimePage() {
    const [profile, setProfile] = useState<ChildProfile | null>(null);
    const [activeSound, setActiveSound] = useState<TargetSound>("r");
    const [streak, setStreak] = useState(0);
    const [rounds, setRounds] = useState<RhymeChallenge[]>([]);
    const [index, setIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>("showing");
    const [choices, setChoices] = useState<string[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [xp, setXp] = useState(0);
    const [correct, setCorrect] = useState(0);
    const [showCelebration, setShowCelebration] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [finalAccuracy, setFinalAccuracy] = useState(0);
    const [summaryMessage, setSummaryMessage] = useState("Wonderful rhyming practice! Every round makes your brain stronger!");
    const [novaState, setNovaState] = useState<"idle" | "celebrating" | "thinking" | "encouraging">("idle");
    const sessionRef = useRef<SessionWithId | null>(null);
    const attemptsRef = useRef<AttemptData[]>([]);

    function buildRound(challenge: RhymeChallenge): string[] {
        return shuffle([challenge.correct, ...challenge.distractors]);
    }

    useEffect(() => {
        if (phase !== "showing" || !rounds[index]) return;
        (async () => {
            setNovaState("thinking");
            await speakAsNova(`Which word rhymes with ${rounds[index].word}?`);
            setNovaState("idle");
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [index, phase]);

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
                        : ["r"];
                    setProfile({
                        name: p.name ?? "Friend",
                        age: typeof p.age === "number" ? p.age : 7,
                        targetSounds: targets,
                        streak: p.streak ?? 0,
                        totalXP: p.totalXP ?? p.xp ?? 0,
                    });
                    setActiveSound(targets[0] ?? "r");
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
        const r = rhymeData[activeSound].slice(0, TOTAL_ROUNDS);
        setRounds(r);
        setChoices(buildRound(r[0]));
        setPhase("showing");
        setNovaState("idle");
        setXp(0);
        setCorrect(0);
        setSelected(null);
        attemptsRef.current = [];
        sessionRef.current = startSession(profile?.name ?? "kid", activeSound);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSound, profile?.name]);

    async function handleChoice(word: string) {
        if (phase !== "showing" || !rounds[index]) return;
        setSelected(word);
        const isCorrect = word === rounds[index].correct;
        const attempt: AttemptData = {
            word: rounds[index].word,
            transcript: word,
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
            await speakAsNova(`Yes! "${word}" rhymes with "${rounds[index].word}"! Great job!`);
            await new Promise(r => setTimeout(r, 1600));
            setShowCelebration(false);
        } else {
            setPhase("redirecting");
            setNovaState("encouraging");
            await speakAsNova(`Good try! The rhyme was "${rounds[index].correct}". It sounds like "${rounds[index].word}". Let's keep going!`);
            await new Promise(r => setTimeout(r, 1000));
        }

        setSelected(null);
        const next = index + 1;
        if (next >= rounds.length) {
            setPhase("summary");
            await completeSession();
        } else {
            setIndex(next);
            setChoices(buildRound(rounds[next]));
            setNovaState("idle");
            setPhase("showing");
        }
    }

    async function completeSession() {
        const session = sessionRef.current ?? {
            sessionId: `rhyme-${Date.now()}`,
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
            const msg = await generateSessionCelebration(activeSound.toUpperCase(), attemptsList.length || TOTAL_ROUNDS, acc);
            setSummaryMessage(msg);
        } catch {
            setSummaryMessage(correct >= 6 ? "You're a rhyming superstar! Your ears are amazing!" : "Wonderful rhyming practice! Every round makes your brain stronger!");
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

    if (!rounds.length) return (
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
                        setIndex(0); setXp(0); setCorrect(0); setSelected(null); setShowSummary(false); setFinalAccuracy(0); setSummaryMessage("Wonderful rhyming practice! Every round makes your brain stronger!");
                        attemptsRef.current = [];
                        sessionRef.current = startSession(profile?.name ?? "kid", activeSound);
                        const r = rhymeData[activeSound].slice(0, TOTAL_ROUNDS);
                        setRounds(r); setChoices(buildRound(r[0])); setPhase("showing"); setNovaState("idle");
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

                {/* Mode pill */}
                <div className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5 border border-white/10">
                    <span className="text-lg">🎵</span>
                    <span className="text-sm font-semibold text-purple-200">Rhyme Time</span>
                </div>

                {/* Nova */}
                <div className="flex-shrink-0 mt-1">
                    <Nova state={novaState} size="lg" />
                </div>

                {/* Instruction */}
                <div className="text-center px-4">
                    <p className="text-purple-300 text-sm uppercase tracking-widest mb-1">Find the rhyme!</p>
                    <p className="text-white text-xl font-semibold">
                        Which word rhymes with…
                    </p>
                </div>

                {/* Target word card */}
                {rounds[index] && (
                    <div className="flex flex-col items-center gap-3 px-8 py-5 rounded-3xl bg-white/5 backdrop-blur-md border border-purple-400/30 shadow-[0_0_24px_rgba(124,58,237,0.2)] w-full max-w-xs animate-[fade-slide-in_0.4s_ease-out_forwards]">
                        <span className="text-7xl">{rounds[index].emoji}</span>
                        <p className="text-3xl font-bold text-white tracking-wide">{rounds[index].word}</p>
                    </div>
                )}

                {/* Choice buttons */}
                <div className="flex flex-col gap-3 w-full max-w-xs mt-2">
                    {choices.map((word) => (
                        <ChoiceButton
                            key={word}
                            label={word}
                            state={
                                selected === null ? "default"
                                    : selected === word && word === rounds[index]?.correct ? "correct"
                                        : selected === word ? "wrong"
                                            : "default"
                            }
                            onClick={() => handleChoice(word)}
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
