// app/kid/page.tsx — Exercise menu home for ArtiCue kid-side.
// Shows Nova greeting + 5 exercise mode cards with condition labels for practitioners/parents.
// Condition labels help SLPs and parents choose the right exercise for their child's needs.

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
    "What do you want to practise today?",
    "Ready for some speech fun?",
    "Let's get those sounds perfect!",
    "Pick an exercise and let's go!",
];

export default function KidMenuPage() {
    const [profile, setProfile] = useState<ChildProfile>({ name: "Maya", streak: 3, xp: 0 });
    const [greeting, setGreeting] = useState(GREETINGS[0]);

    useEffect(() => {
        fetch("/api/profile")
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setProfile({ name: d.name, streak: d.streak ?? 3, xp: d.xp ?? 0 }); })
            .catch(() => { });
        setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
    }, []);

    return (
        <main className="min-h-screen flex flex-col items-center px-4 pt-4 pb-8 gap-5 max-w-sm mx-auto">

            {/* Top bar */}
            <div className="w-full flex items-center justify-between">
                <StreakBadge streak={profile.streak} />
                <XPCounter xp={profile.xp} />
            </div>

            {/* Nova + greeting */}
            <div className="flex flex-col items-center gap-3 mt-2">
                <Nova state="idle" size="lg" />
                <div className="text-center">
                    <p className="text-purple-300 text-sm uppercase tracking-widest mb-1">Hi, {profile.name}! 👋</p>
                    <p className="text-white text-xl font-bold">{greeting}</p>
                </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-white/5" />

            {/* Exercise cards — each labelled with the SLP condition it targets */}
            <div className="flex flex-col gap-3 w-full">

                {/* Apraxia + Dysarthria — motor imitation with cueing levels */}
                <ExerciseCard
                    href="/kid/practice"
                    emoji="🎤"
                    title="Word Practice"
                    description="Say words with Nova — guided cueing levels help with motor planning"
                    gradient="bg-gradient-to-br from-purple-600 to-violet-700"
                    badge="Apraxia · Dysarthria"
                />

                {/* Aphasia — phonological isolation, + SFA semantic hints */}
                <ExerciseCard
                    href="/kid/sound-hunt"
                    emoji="📍"
                    title="Sound Hunt"
                    description="Find where the sound hides — with picture & meaning hints"
                    gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
                    badge="Aphasia"
                />

                {/* Apraxia — syllable-by-syllable blending with rate control (DTTC + ReST) */}
                <ExerciseCard
                    href="/kid/blend-it"
                    emoji="🔤"
                    title="Blend It!"
                    description="Hear each sound, then say the whole word — slow or fast practice"
                    gradient="bg-gradient-to-br from-emerald-600 to-teal-700"
                    badge="Apraxia ★ Best"
                />

                {/* Aphasia — rhyme awareness, phonological access */}
                <ExerciseCard
                    href="/kid/rhyme-time"
                    emoji="🎵"
                    title="Rhyme Time"
                    description="Pick the rhyming word — builds sound awareness for word retrieval"
                    gradient="bg-gradient-to-br from-rose-500 to-pink-700"
                    badge="Aphasia"
                />

                {/* Dysarthria — LSVT LOUD vocal intensity training */}
                <ExerciseCard
                    href="/kid/speak-up"
                    emoji="🔊"
                    title="Speak Up!"
                    description="Say it as LOUD and clear as you can — trains vocal strength"
                    gradient="bg-gradient-to-br from-sky-500 to-blue-700"
                    badge="Dysarthria · LSVT"
                />
            </div>

            {/* Practitioner tip */}
            <p className="text-xs text-purple-500 text-center mt-auto pt-2">
                SLP tip: Use <span className="text-purple-400">Blend It!</span> for Apraxia · <span className="text-purple-400">Sound Hunt</span> for Aphasia · <span className="text-purple-400">Speak Up!</span> for Dysarthria
            </p>
        </main>
    );
}
