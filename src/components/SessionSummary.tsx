// SessionSummary.tsx — End-of-session overlay shown after all words are complete.
// Full-screen purple gradient with Nova celebrating, stats, and action buttons.
// Slides up from bottom on display.

"use client";

import Nova from "./Nova";

type SessionSummaryProps = {
    accuracy: number;       // 0–100
    xpEarned: number;
    wordsCompleted: number;
    totalWords: number;
    message: string;        // encouraging message from Nova
    onPlayAgain: () => void;
    onDone: () => void;
};

export default function SessionSummary({
    accuracy,
    xpEarned,
    wordsCompleted,
    totalWords,
    message,
    onPlayAgain,
    onDone,
}: SessionSummaryProps) {
    const stars =
        accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : accuracy >= 50 ? 1 : 0;

    return (
        <div
            className={[
                "fixed inset-0 z-40 flex flex-col items-center justify-center",
                "bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e]",
                "animate-[slide-up_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards]",
                "p-6 overflow-y-auto",
            ].join(" ")}
            role="dialog"
            aria-label="Session complete"
            aria-modal="true"
        >
            {/* Nova celebrating */}
            <div className="mb-4">
                <Nova state="celebrating" size="lg" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-white mb-1 text-center">
                Great Job! 🎉
            </h1>

            {/* Stars */}
            <div className="flex gap-1 mb-5" aria-label={`${stars} out of 3 stars`}>
                {[1, 2, 3].map((s) => (
                    <span
                        key={s}
                        className={[
                            "text-3xl transition-all duration-300",
                            s <= stars ? "opacity-100 scale-110" : "opacity-25",
                        ].join(" ")}
                        aria-hidden
                    >
                        ⭐
                    </span>
                ))}
            </div>

            {/* Nova's message */}
            <p className="text-center text-purple-200 text-base italic mb-6 max-w-xs leading-relaxed">
                &ldquo;{message}&rdquo;
            </p>

            {/* Stats cards */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-8">
                <StatCard
                    label="Accuracy"
                    value={`${accuracy}%`}
                    icon="🎯"
                    color="text-green-300"
                />
                <StatCard
                    label="XP Earned"
                    value={`+${xpEarned}`}
                    icon="⭐"
                    color="text-yellow-300"
                />
                <StatCard
                    label="Words"
                    value={`${wordsCompleted}/${totalWords}`}
                    icon="📝"
                    color="text-purple-300"
                />
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                    onClick={onPlayAgain}
                    className={[
                        "w-full py-4 rounded-2xl font-bold text-lg text-white",
                        "bg-gradient-to-r from-purple-600 to-violet-600",
                        "shadow-[0_0_24px_rgba(124,58,237,0.4)]",
                        "active:scale-95 transition-transform duration-150",
                    ].join(" ")}
                >
                    Practice Again 🚀
                </button>

                <button
                    onClick={onDone}
                    className={[
                        "w-full py-3 rounded-2xl font-semibold text-base text-purple-300",
                        "border border-purple-400/30 bg-white/5",
                        "active:scale-95 transition-transform duration-150",
                    ].join(" ")}
                >
                    I&apos;m Done for Today
                </button>
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    color,
}: {
    label: string;
    value: string;
    icon: string;
    color: string;
}) {
    return (
        <div className="flex flex-col items-center gap-1 bg-white/5 rounded-2xl border border-white/10 py-3 px-2">
            <span className="text-xl" aria-hidden>{icon}</span>
            <span className={`text-lg font-bold tabular-nums ${color}`}>{value}</span>
            <span className="text-xs text-purple-400">{label}</span>
        </div>
    );
}
