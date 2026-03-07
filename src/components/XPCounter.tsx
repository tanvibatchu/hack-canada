// XPCounter.tsx — Displays current session XP with a floating +10 animation on earn.
// Gold colored, shown in the top-right corner of the practice page.

"use client";

import { useEffect, useRef, useState } from "react";

type XPCounterProps = {
    xp: number;
};

type FloatingLabel = {
    id: number;
    amount: number;
};

export default function XPCounter({ xp }: XPCounterProps) {
    const prevXpRef = useRef(xp);
    const [floats, setFloats] = useState<FloatingLabel[]>([]);

    useEffect(() => {
        const diff = xp - prevXpRef.current;
        if (diff > 0) {
            const id = Date.now();
            setFloats((f) => [...f, { id, amount: diff }]);
            // Remove after animation finishes
            setTimeout(() => {
                setFloats((f) => f.filter((x) => x.id !== id));
            }, 1300);
        }
        prevXpRef.current = xp;
    }, [xp]);

    return (
        <div className="relative flex items-center gap-1.5 select-none">
            {/* Floating +XP labels */}
            {floats.map((f) => (
                <span
                    key={f.id}
                    className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-bold text-yellow-300 animate-[float-up_1.2s_ease-out_forwards] pointer-events-none whitespace-nowrap"
                    aria-hidden
                >
                    +{f.amount} XP
                </span>
            ))}

            {/* XP badge */}
            <div className="flex items-center gap-1 bg-yellow-500/15 border border-yellow-400/30 rounded-full px-3 py-1">
                <span className="text-base leading-none">⭐</span>
                <span className="text-sm font-bold text-yellow-300 tabular-nums">
                    {xp} XP
                </span>
            </div>
        </div>
    );
}
