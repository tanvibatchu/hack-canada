// app/kid/page.tsx — Exercise menu home for ArtiCue kid-side.
// Shows Nova greeting + 5 exercise mode cards with condition labels for practitioners/parents.
// Gamified, Duolingo-inspired Light Theme Edition ☀️

"use client";

import { useEffect, useState } from "react";
import Nova from "@/components/Nova";
import ExerciseCard from "@/components/ExerciseCard";
import StreakBadge from "@/components/StreakBadge";
import XPCounter from "@/components/XPCounter";

type ChildProfile = {
    name: string;
    streak: number;
    xp: number;
};

const GREETINGS = [
    "What do you want to play today?",
    "Ready for some speech fun?",
    "Let's get those sounds perfect!",
    "Pick an exercise and let's go!",
];

export default function KidMenuPage() {
    const [profile, setProfile] = useState<ChildProfile>({ name: "Maya", streak: 3, xp: 0 });
    const [greeting, setGreeting] = useState(GREETINGS[0]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
        fetch("/api/profile")
            .then(r => r.ok ? r.json() : null)
            .then(d => {
                const p = d?.profile;
                if (p) setProfile({
                    name: p.name ?? "Friend",
                    streak: p.streak ?? 0,
                    xp: p.totalXP ?? p.xp ?? 0
                });
            })
            .catch(() => { });
    }, []);

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');
                body {
                    background: #F9F4F1; /* Parchment */
                    font-family: 'Nunito', sans-serif;
                }
            `}</style>
            <main className="min-h-screen flex flex-col items-center px-4 md:px-8 pt-6 md:pt-12 pb-24 gap-6 md:gap-12 max-w-3xl md:max-w-5xl mx-auto w-full md:px-12">

                {/* Top bar */}
                <div className="w-full flex items-center justify-between">
                    <StreakBadge streak={profile.streak} />
                    <XPCounter xp={profile.xp} />
                </div>

                {/* Nova + greeting */}
                <div className="flex flex-col items-center gap-4 mt-4 w-full bg-white border-2 border-[rgba(57,0,82,0.1)] border-b-8 border-b-[rgba(57,0,82,0.1)] p-6 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#CE7DA5] opacity-10 rounded-full blur-2xl pointer-events-none" />
                    <Nova state="idle" size="lg" />
                    <div className="text-center relative z-10">
                        <p className="text-[#945F95] text-xs font-black uppercase tracking-[0.2em] mb-1">Hi, {profile.name}! 👋</p>
                        <p className="text-[#390052] text-2xl font-black leading-tight">{greeting}</p>
                    </div>
                </div>

                {/* Exercise cards */}
                <div className="w-full mt-2">
                    <h2 className="text-xl md:text-2xl font-black text-[#390052] tracking-tight ml-2 mb-4">Today&apos;s Exercises</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">

                    {/* Apraxia + Dysarthria */}
                    <ExerciseCard
                        href="/kid/practice"
                        emoji="🎤"
                        title="Word Practice"
                        description="Say words with Nova"
                        colorTheme="#CE7DA5" /* Peony */
                        badge="Apraxia"
                    />

                    {/* Aphasia */}
                    <ExerciseCard
                        href="/kid/sound-hunt"
                        emoji="📍"
                        title="Sound Hunt"
                        description="Find where the sound hides"
                        colorTheme="#1CB0F6" /* Blue */
                        badge="Aphasia"
                    />

                    {/* Apraxia (DTTC) */}
                    <ExerciseCard
                        href="/kid/blend-it"
                        emoji="🔤"
                        title="Blend It!"
                        description="Hear each sound, then say the word"
                        colorTheme="#58CC02" /* Green */
                        badge="Apraxia ★ Best"
                    />

                    {/* Aphasia - Rhyming */}
                    <ExerciseCard
                        href="/kid/rhyme-time"
                        emoji="🎵"
                        title="Rhyme Time"
                        description="Pick the rhyming word"
                        colorTheme="#FF9600" /* Streak/Orange */
                        badge="Aphasia"
                    />

                    {/* Dysarthria - LSVT */}
                    <ExerciseCard
                        href="/kid/speak-up"
                        emoji="🔊"
                        title="Speak Up!"
                        description="Say it as LOUD as you can"
                        colorTheme="#631D76" /* Velvet */
                        badge="Dysarthria"
                    />
                    </div>
                </div>

                {/* Practitioner tip */}
                <p className="text-[0.65rem] uppercase tracking-widest font-black text-[#945F95] text-center mt-8 pt-4 border-t-2 border-[rgba(57,0,82,0.1)] w-full max-w-[280px]">
                    SLP TIPS: <span className="text-[#58CC02]">Blend It!</span> (Apraxia) · <span className="text-[#1CB0F6]">Sound Hunt</span> (Aphasia) · <span className="text-[#631D76]">Speak Up!</span> (Dysarthria)
                </p>
            </main>
        </>
    );
}
