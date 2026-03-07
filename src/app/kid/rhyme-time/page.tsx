// app/kid/rhyme-time/page.tsx — Rhyme Time exercise for ArtiCue.
// SLP Skill: Phonological Awareness — Tap the word that rhymes with Nova's word.
// Tap-only interaction, no mic needed. 8 rounds per session.

"use client";

import { useEffect, useState } from "react";
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

type Phase = "showing" | "answered" | "celebrating" | "redirecting" | "summary";

const TOTAL_ROUNDS = 8;

function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

export default function RhymeTimePage() {
    const [activeSound] = useState<TargetSound>("r");
    const [streak] = useState(3);
    const [rounds, setRounds] = useState<RhymeChallenge[]>([]);
    const [index, setIndex] = useState(0);
    const [phase, setPhase] = useState<Phase>("showing");
    const [choices, setChoices] = useState<string[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [xp, setXp] = useState(0);
    const [correct, setCorrect] = useState(0);
    const [showCelebration, setShowCelebration] = useState(false);
    const [showSummary, setShowSummary] = useState(false);
    const [novaState, setNovaState] = useState<"idle" | "celebrating" | "thinking" | "encouraging">("idle");

    function buildRound(challenge: RhymeChallenge): string[] {
        return shuffle([challenge.correct, ...challenge.distractors]);
    }

    useEffect(() => {
        const r = rhymeData[activeSound].slice(0, TOTAL_ROUNDS);
        setRounds(r);
        setChoices(buildRound(r[0]));
        setPhase("showing");
        setNovaState("idle");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSound]);

    async function handleChoice(word: string) {
        if (phase !== "showing" || !rounds[index]) return;
        setSelected(word);
        const isCorrect = word === rounds[index].correct;

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
            setShowSummary(true);
            setPhase("summary");
        } else {
            setIndex(next);
            setChoices(buildRound(rounds[next]));
            setNovaState("idle");
            setPhase("showing");
        }
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
                    accuracy={Math.round((correct / TOTAL_ROUNDS) * 100)}
                    xpEarned={xp} wordsCompleted={correct} totalWords={TOTAL_ROUNDS}
                    message={correct >= 6 ? "You're a rhyming superstar! Your ears are amazing!" : "Wonderful rhyming practice! Every round makes your brain stronger!"}
                    onPlayAgain={() => {
                        setIndex(0); setXp(0); setCorrect(0); setSelected(null); setShowSummary(false);
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
