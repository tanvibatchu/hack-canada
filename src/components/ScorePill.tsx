"use client";

/**
 * ScorePill — animated stars + grade label shown after each attempt.
 * Auto-dismisses after a short hold.
 */

import { useEffect, useState } from "react";
import type { Stars } from "@/lib/grader";

interface ScorePillProps {
    stars: Stars;
    label: string;
    visible: boolean;
    onDismiss?: () => void;
    holdMs?: number;
}

export default function ScorePill({
    stars,
    label,
    visible,
    onDismiss,
    holdMs = 1600,
}: ScorePillProps) {
    const [shown, setShown] = useState(false);

    useEffect(() => {
        if (!visible) { setShown(false); return; }
        const show = setTimeout(() => setShown(true), 80);
        const hide = setTimeout(() => {
            setShown(false);
            onDismiss?.();
        }, holdMs + 80);
        return () => { clearTimeout(show); clearTimeout(hide); };
    }, [visible, holdMs, onDismiss]);

    const starStr = "⭐".repeat(stars) + "☆".repeat(3 - stars);

    const colors: Record<Stars, string> = {
        3: "bg-yellow-400/90 border-yellow-300 text-yellow-900",
        2: "bg-blue-400/90 border-blue-300 text-blue-900",
        1: "bg-white/20 border-white/30 text-white",
    };

    return (
        <div
            aria-live="polite"
            className={[
                "fixed top-24 left-1/2 -translate-x-1/2 z-50",
                "flex flex-col items-center gap-0.5",
                "px-5 py-2.5 rounded-2xl border backdrop-blur-md shadow-xl",
                "transition-all duration-300",
                colors[stars],
                shown ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none",
            ].join(" ")}
        >
            <span className="text-2xl tracking-wider">{starStr}</span>
            <span className="text-sm font-bold">{label}</span>
        </div>
    );
}
