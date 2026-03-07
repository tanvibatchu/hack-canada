// StreakBadge.tsx — Shows the child's current daily practice streak.
// Fire emoji with animated pulse to encourage consistency.

"use client";

type StreakBadgeProps = {
    streak: number;
};

export default function StreakBadge({ streak }: StreakBadgeProps) {
    return (
        <div className="flex items-center gap-1.5 select-none">
            <div className="flex items-center gap-1 bg-orange-500/15 border border-orange-400/30 rounded-full px-3 py-1">
                <span
                    className="text-base leading-none animate-[streak-pulse_2s_ease-in-out_infinite]"
                    role="img"
                    aria-label="streak fire"
                >
                    🔥
                </span>
                <span className="text-sm font-bold text-orange-300 tabular-nums">
                    {streak}
                    <span className="font-normal text-orange-400 ml-0.5">day{streak !== 1 ? "s" : ""}</span>
                </span>
            </div>
        </div>
    );
}
