// WordCard.tsx — Displays the current practice word with emoji and phonetic breakdown.
// Highlights the target sound within the word so kids can see exactly where to focus.

"use client";

import { useEffect, useState } from "react";
import { TargetSound } from "@/lib/wordBanks";

type WordCardProps = {
    word: string;
    emoji: string;
    targetSound: TargetSound;
};

/**
 * Splits the word into segments and wraps each occurrence of the target sound
 * in a highlighted span. e.g. "rabbit" + "r" → [<highlight>r</highlight>, "abbit"]
 */
function PhoneticWord({ word, targetSound }: { word: string; targetSound: TargetSound }) {
    // For compound sounds like "th", match the sequence
    const sound = targetSound === "fluency" ? "" : targetSound;
    if (!sound) {
        return <span className="text-white">{word}</span>;
    }

    const regex = new RegExp(`(${sound})`, "gi");
    const parts = word.split(regex);

    return (
        <span>
            {parts.map((part, i) =>
                part.toLowerCase() === sound.toLowerCase() ? (
                    <span
                        key={i}
                        className="text-purple-300 font-black underline decoration-purple-400 decoration-4 underline-offset-4"
                    >
                        {part}
                    </span>
                ) : (
                    <span key={i} className="text-white">
                        {part}
                    </span>
                )
            )}
        </span>
    );
}

/**
 * Builds a simple phoneme hint label like "Focus: R sound"
 * and a sounded-out version like "r ... abbit"
 */
function PhoneticHint({ word, targetSound }: { word: string; targetSound: TargetSound }) {
    if (targetSound === "fluency") {
        return <p className="text-purple-300 text-sm text-center">Say it smoothly and clearly</p>;
    }

    const sound = targetSound.toUpperCase();
    // Build a "sounded out" form: stretch the target sound at start if it appears there
    const lower = word.toLowerCase();
    let soundedOut = word;
    if (lower.startsWith(targetSound)) {
        const rest = word.slice(targetSound.length);
        soundedOut = `${targetSound.toUpperCase()} ... ${rest}`;
    } else {
        // Find first occurrence and place ellipsis before it
        const idx = lower.indexOf(targetSound);
        if (idx > 0) {
            soundedOut = `${word.slice(0, idx)} ... ${targetSound.toUpperCase()} ... ${word.slice(idx + targetSound.length)}`;
        }
    }

    return (
        <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-widest text-purple-400 font-semibold">
                Focus on the <span className="text-purple-200">{sound}</span> sound
            </span>
            <span className="text-lg text-purple-200 font-mono tracking-widest">
                {soundedOut}
            </span>
        </div>
    );
}

export default function WordCard({ word, emoji, targetSound }: WordCardProps) {
    const [animKey, setAnimKey] = useState(word);

    useEffect(() => {
        setAnimKey(word + Date.now());
    }, [word]);

    return (
        <div
            key={animKey}
            className={[
                "flex flex-col items-center gap-4 px-8 py-6 rounded-3xl w-full max-w-xs",
                "bg-white/5 backdrop-blur-md",
                "border border-purple-400/30 shadow-[0_0_24px_rgba(124,58,237,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]",
                "animate-[fade-slide-in_0.4s_ease-out_forwards]",
            ].join(" ")}
        >
            {/* Emoji */}
            <span className="text-7xl leading-none select-none" role="img" aria-label={word}>
                {emoji}
            </span>

            {/* Word with target sound highlighted */}
            <p className="text-4xl font-bold tracking-wide text-center drop-shadow-md">
                <PhoneticWord word={word} targetSound={targetSound} />
            </p>

            {/* Phonetic hint */}
            <PhoneticHint word={word} targetSound={targetSound} />
        </div>
    );
}
