// app/kid/practice/page.tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Nova from "@/components/Nova";
import WordCard from "@/components/WordCard";
import MicButton from "@/components/MicButton";
import AudioControls from "@/components/AudioControls";
import MouthDiagram from "@/components/MouthDiagram";
import CelebrationBurst from "@/components/CelebrationBurst";
import XPCounter from "@/components/XPCounter";
import StreakBadge from "@/components/StreakBadge";
import SessionSummary from "@/components/SessionSummary";
import type { PhonemeResult } from "@/lib/gemini";
import { generateSessionCelebration } from "@/lib/gemini";
import { speakAsNova, demonstrateWord, stopCurrentAudio } from "@/lib/elevenlabs";
import { startListening, stopListening } from "@/lib/speechCapture";
import { getSessionWords, TargetSound, WordEntry } from "@/lib/wordBanks";
import { startSession, recordAttempt, endSession, AttemptData, SessionWithId } from "@/lib/sessionManager";
type SessionPhase = "loading" | "greeting" | "demonstrating" | "waiting" | "recording" | "analyzing" | "celebrating" | "redirecting" | "summary";
type ChildProfile = { name: string; age: number; targetSounds: TargetSound[]; streak: number; totalXP: number; };
const TOTAL_WORDS = 8;
const MAX_ATTEMPTS = 3;
const SCORE_THRESHOLD = 70;
const MOCK_USER_ID = "demo-user";
const SOUND_LABELS: Record<TargetSound, string> = { r: "R", s: "S", th: "TH", l: "L", fluency: "Fluency" };
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
    const sessionIdRef = useRef<SessionWithId | null>(null);
    const phaseRef = useRef<SessionPhase>("loading");
    const sessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const demoRunRef = useRef(0);
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => {
        async function loadProfile() {
            try {
                const res = await fetch("/api/profile");
                if (!res.ok) throw new Error("profile fetch failed");
                const d = await res.json();
                const p = d?.profile;
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
                    return;
                }
            } catch {
                const fallback = { name: "Maya", age: 6, targetSounds: ["r", "s", "l"] as TargetSound[], streak: 3, totalXP: 0 };
                setProfile(fallback);
                setActiveSound("r");
            }
        }
        loadProfile();
    }, []);
    const initSession = useCallback((p: ChildProfile, sound: TargetSound) => {
        setPhase("loading"); setWordIndex(0); setAttempts(0); setXp(0);
        setAllAttempts([]); setShowMouthDiagram(false); setShowSummary(false); setLastResult(null);
        setWords(getSessionWords(sound, TOTAL_WORDS, p.age));
        const session = startSession(p.name || MOCK_USER_ID, sound);
        sessionIdRef.current = session;
        if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
        sessionTimerRef.current = setTimeout(() => { finishSession(true); }, 5 * 60 * 1000); // 5-minute cap
        setNovaState("idle"); setPhase("greeting");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => { if (profile) initSession(profile, activeSound); }, [profile, activeSound, initSession]);
    useEffect(() => {
        return () => {
            if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
            stopListening();
            stopCurrentAudio();
        };
    }, []);
    useEffect(() => {
        const currentProfile = profile;
        if (phase !== "greeting" || !currentProfile || words.length === 0) return;
        async function greet() {
            setNovaState("encouraging");
            await speakAsNova("Hi " + (currentProfile?.name ?? "Friend") + "! Let us practice your " + SOUND_LABELS[activeSound] + " sound!");
            setNovaState("thinking"); setPhase("demonstrating");
        }
        greet();
    }, [activeSound, phase, profile, words]);
    useEffect(() => {
        const currentWord = words[wordIndex];
        if (phase !== "demonstrating" || !currentWord) return;
        async function demo() {
            const runId = ++demoRunRef.current;
            await speakAsNova("Can you say... " + currentWord.word + "?");
            if (demoRunRef.current !== runId) return;
            setNovaState("idle"); setPhase("waiting");
        }
        demo();
    }, [phase, wordIndex, words]);
    function handleMicStart() {
        if (phase !== "waiting") return;
        setShowMouthDiagram(false); setPhase("recording");
        startListening(
            (transcript) => { if (phaseRef.current !== "recording") return; setPhase("analyzing"); handleTranscript(transcript); },
            () => setPhase("waiting")
        );
    }
    function handleMicStop() {
        if (phase === "recording") { stopListening(); if (phaseRef.current === "recording") setPhase("waiting"); }
    }
    async function handleTranscript(transcript: string) {
        stopListening();
        const cur = words[wordIndex]; setNovaState("thinking");
        try {
            const res = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ word: cur.word, transcript, targetSound: activeSound, age: profile?.age ?? 6 }),
            });
            const raw = await res.json();
            if (!res.ok || raw.error) { setPhase("waiting"); setNovaState("idle"); return; }
            const result: PhonemeResult = {
                ...raw,
                feedback: raw.feedback || "Good effort! Keep trying!",
                mouthCue: raw.mouthCue || "Shape your mouth like you're saying the sound.",
            };
            const isCorrect = result.correct || result.score >= SCORE_THRESHOLD;
            const normalized: PhonemeResult = { ...result, correct: isCorrect };
            setLastResult(normalized);
            const attempt: AttemptData = { word: cur.word, transcript, score: result.score, correct: isCorrect, substitution: result.substitution };
            if (sessionIdRef.current) sessionIdRef.current = recordAttempt(sessionIdRef.current, attempt);
            setAllAttempts(prev => [...prev, attempt]);
            if (isCorrect) await handleCorrect(normalized);
            else await handleNeedsWork(normalized);
        } catch {
            setNovaState("encouraging");
            setPhase("waiting");
            await speakAsNova("Let's try that again when you're ready!");
        }
    }
    async function handleCorrect(result: PhonemeResult) {
        setNovaState("celebrating"); setShowCelebration(true); setXp(p => p + 10); setPhase("celebrating");
        const line = result.feedback || "Amazing! You nailed it!";
        await speakAsNova(line);
        await new Promise(r => setTimeout(r, 1800));
        setShowCelebration(false); setAttempts(0); advanceWord();
    }
    async function handleNeedsWork(result: PhonemeResult) {
        setNovaState("encouraging"); setPhase("redirecting");
        const gentle = result.feedback || "Ooh so close! Watch where my tongue goes — let's try together.";
        await speakAsNova(gentle);
        setShowMouthDiagram(true);
        if (result.mouthCue) await speakAsNova(result.mouthCue);
        const next = attempts + 1; setAttempts(next);
        if (next >= MAX_ATTEMPTS) {
            await speakAsNova("You are doing amazing, let us try the next one!"); setShowMouthDiagram(false); setAttempts(0); advanceWord();
        } else { setNovaState("idle"); setPhase("demonstrating"); }
    }
    function advanceWord() {
        const next = wordIndex + 1;
        if (next >= words.length || next >= TOTAL_WORDS) finishSession();
        else { setWordIndex(next); setNovaState("thinking"); setPhase("demonstrating"); }
    }
    async function finishSession(triggeredByTimer = false) {
        if (phaseRef.current === "summary") return;
        if (sessionTimerRef.current) { clearTimeout(sessionTimerRef.current); sessionTimerRef.current = null; }
        setPhase("summary");

        const session = sessionIdRef.current ?? {
            sessionId: `${MOCK_USER_ID}-${activeSound}-${Date.now()}`,
            userId: MOCK_USER_ID,
            sound: activeSound,
            startTime: Date.now() - 60000,
            attempts: allAttempts,
        };
        const summary = await endSession(session);
        const acc = summary?.averageAccuracy ?? (allAttempts.length > 0 ? Math.round(allAttempts.filter(a => a.correct).length / allAttempts.length * 100) : 0);
        setFinalAccuracy(acc);
        setXp(summary?.xpEarned ?? xp);

        let message = acc >= 80 ? "You are a speech superstar! I am so proud of you!" : acc >= 60 ? "Fantastic effort today!" : "You showed up and tried your best!";
        try {
            const celebRes = await fetch("/api/celebrate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sound: activeSound.toUpperCase(), count: session.attempts.length || TOTAL_WORDS, accuracy: acc }),
            });
            const celebData = await celebRes.json();
            if (celebData.message) message = celebData.message;
        } catch { /* keep fallback */ }
        setSummaryMessage(message);

        try {
            const resp = await fetch("/api/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(summary.sessionData),
            });
            const payload = await resp.json().catch(() => ({}));
            if (resp.ok) {
                setProfile((p) => p ? {
                    ...p,
                    totalXP: (p.totalXP ?? 0) + (payload.xpEarned ?? summary.xpEarned ?? 0),
                    streak: payload.newStreak ?? p.streak,
                } : p);
            }
        } catch { /* best effort persist */ }

        if (triggeredByTimer && !summary.sessionData.attempts.length) {
            setSummaryMessage("Great listening today! Let's play again soon!");
        }
        setShowSummary(true);
    }
    const completedWords = Math.min(wordIndex + (phase === "celebrating" ? 1 : 0), TOTAL_WORDS);
    if (!profile) {
        return (
            <main className="min-h-screen flex flex-col items-center justify-center gap-4">
                <div className="text-6xl">Loading...</div>
            </main>
        );
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
                    accuracy={finalAccuracy} xpEarned={xp} wordsCompleted={completedWords} totalWords={TOTAL_WORDS}
                    message={summaryMessage}
                    onPlayAgain={() => { setShowSummary(false); if (profile) initSession(profile, activeSound); }}
                    onDone={() => { window.location.href = "/kid"; }}
                />
            )}
            <main className="min-h-screen flex flex-col items-center px-4 md:px-8 pt-6 md:pt-12 pb-24 gap-6 md:gap-12 max-w-3xl md:max-w-5xl mx-auto w-full md:px-12">
                <div className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/kid" className="text-[#945F95] hover:text-[#390052] transition-colors text-2xl" aria-label="Back to menu">Back</Link>
                        <StreakBadge streak={profile.streak} />
                    </div>
                    <XPCounter xp={xp} />
                </div>
                <div className="flex items-center gap-2 bg-white rounded-[16px] px-4 py-1.5 border-2 border-[rgba(57,0,82,0.1)] border-b-[4px] border-b-[rgba(57,0,82,0.1)]">
                    <span className="text-sm font-black text-[#945F95]">Word Practice</span>
                    <span className="text-xs text-[#945F95] uppercase tracking-widest ml-1">- {SOUND_LABELS[activeSound]} sound</span>
                </div>
                <div className="flex-shrink-0 mt-1">
                    <Nova state={novaState} size="lg" />
                </div>
                <div className="text-center min-h-14 flex flex-col items-center justify-center gap-1 px-4">
                    {phase === "greeting" && <p className="text-[#945F95] text-lg">Nova is getting ready...</p>}
                    {phase === "demonstrating" && (
                        <>
                            <p className="text-[#945F95] text-sm uppercase tracking-widest">Nova is saying...</p>
                            <p className="text-[#390052] text-xl font-black">Can you say... <span className="text-[#945F95] font-black">{words[wordIndex]?.word}</span>?</p>
                        </>
                    )}
                    {phase === "waiting" && (
                        <>
                            <p className="text-[#945F95] text-sm uppercase tracking-widest">Your turn!</p>
                            <p className="text-[#390052] text-xl font-black">Say: <span className="text-[#945F95] font-black">{words[wordIndex]?.word}</span></p>
                        </>
                    )}
                    {phase === "recording" && <p className="text-[#58CC02] text-lg font-medium">Listening...</p>}
                    {phase === "analyzing" && <p className="text-[#945F95] text-lg">Nova is thinking...</p>}
                    {phase === "celebrating" && <p className="text-[#FFC800] text-xl font-black">{lastResult?.feedback ?? "Amazing!"}</p>}
                    {phase === "redirecting" && (
                        <>
                            <p className="text-[#945F95] text-lg">{lastResult?.feedback ?? "Ooh so close!"}</p>
                            <p className="text-[#945F95] text-base">Try again: <span className="font-black text-[#390052]">{words[wordIndex]?.word}</span></p>
                        </>
                    )}
                </div>
                {words[wordIndex] && phase !== "greeting" && (
                    <WordCard word={words[wordIndex].word} emoji={words[wordIndex].emoji} targetSound={activeSound} />
                )}
                <div className="flex flex-col items-center mt-2 gap-4">
                    <MicButton
                        onStart={handleMicStart} onStop={handleMicStop}
                        isRecording={phase === "recording"}
                        disabled={["loading", "greeting", "demonstrating", "analyzing", "celebrating", "redirecting", "summary"].includes(phase)}
                    />
                    <AudioControls disabled={["loading", "greeting", "demonstrating", "analyzing", "celebrating", "redirecting", "summary", "recording"].includes(phase)} />
                </div>
                {(phase === "redirecting" || attempts > 0) && (
                    <div className="flex gap-2 items-center">
                        {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                            <div key={i} className={"w-2.5 h-2.5 rounded-full transition-all duration-300 " + (i < attempts ? "bg-[#CE7DA5]" : "bg-white/15")} />
                        ))}
                        <span className="text-xs text-[#945F95] ml-1">attempts</span>
                    </div>
                )}
                <MouthDiagram sound={activeSound !== "fluency" ? activeSound : null} visible={showMouthDiagram} />
                <div className="flex-1" />
                <div className="flex flex-col items-center gap-2 pb-2">
                    <p className="text-xs text-[#945F95]">Word {Math.min(completedWords + 1, TOTAL_WORDS)} of {TOTAL_WORDS}</p>
                    <div className="flex gap-2">
                        {Array.from({ length: TOTAL_WORDS }).map((_, i) => (
                            <div key={i} className={"w-3 h-3 rounded-full transition-all duration-500 " + (i < completedWords ? "bg-[#CE7DA5]" : i === completedWords ? "bg-[#CE7DA5] scale-125" : "bg-[rgba(57,0,82,0.1)]")} />
                        ))}
                    </div>
                </div>
            </main>
        </>
    );
}
