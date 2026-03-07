// ChoiceButton.tsx — Large rounded answer button for multiple-choice exercises.
// States: default, correct (green glow + scale up), wrong (shake animation).
// Used by Sound Hunt, Rhyme Time, and Blend It!

"use client";

import { useEffect, useState } from "react";

type ChoiceState = "default" | "correct" | "wrong";

type ChoiceButtonProps = {
    label: string;
    emoji?: string;
    state?: ChoiceState;
    onClick: () => void;
    disabled?: boolean;
};

export default function ChoiceButton({
    label,
    emoji,
    state = "default",
    onClick,
    disabled = false,
}: ChoiceButtonProps) {
    const [shake, setShake] = useState(false);

    useEffect(() => {
        if (state === "wrong") {
            setShake(true);
            const t = setTimeout(() => setShake(false), 600);
            return () => clearTimeout(t);
        }
    }, [state]);

    const stateClasses = {
        default: "bg-white/5 border-white/15 text-white hover:bg-white/10 hover:border-purple-400/50",
        correct: "bg-green-500/20 border-green-400/60 text-green-200 shadow-[0_0_20px_rgba(74,222,128,0.35)] scale-105",
        wrong: "bg-purple-900/40 border-purple-400/40 text-purple-300",
    }[state];

    return (
        <button
            onClick={!disabled ? onClick : undefined}
            disabled={disabled}
            className={[
                "w-full py-4 px-5 rounded-2xl border",
                "flex items-center justify-center gap-3",
                "font-bold text-lg",
                "transition-all duration-200",
                "active:scale-95",
                stateClasses,
                shake ? "animate-[shake_0.5s_ease-in-out]" : "",
                disabled && state === "default" ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
            aria-pressed={state === "correct"}
        >
            {emoji && <span className="text-2xl" aria-hidden>{emoji}</span>}
            <span>{label}</span>
            {state === "correct" && <span className="text-xl" aria-hidden>✓</span>}
        </button>
    );
}
