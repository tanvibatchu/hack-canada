// WaveformDisplay.tsx — Animated waveform bars shown while the mic is active.
// 7 purple vertical bars that animate up/down when active, stay flat when idle.

"use client";

type WaveformDisplayProps = {
    isActive: boolean;
};

const BAR_COUNT = 7;
// Staggered animation delays for a natural waveform look
const DELAYS = ["0s", "0.1s", "0.2s", "0.05s", "0.15s", "0.25s", "0.08s"];
// Staggered durations so bars don't sync up
const DURATIONS = ["0.5s", "0.65s", "0.45s", "0.7s", "0.55s", "0.6s", "0.5s"];

export default function WaveformDisplay({ isActive }: WaveformDisplayProps) {
    return (
        <div
            className="flex items-center justify-center gap-1.5 h-12"
            aria-hidden="true"
        >
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
                <div
                    key={i}
                    className={[
                        "w-1.5 rounded-full bg-purple-400 origin-bottom transition-all duration-300",
                        isActive
                            ? `animate-[wave-bar_${DURATIONS[i]}_${DELAYS[i]}_ease-in-out_infinite]`
                            : "h-1.5 opacity-40",
                    ].join(" ")}
                    style={
                        isActive
                            ? {
                                height: "100%",
                                animationDuration: DURATIONS[i],
                                animationDelay: DELAYS[i],
                                animation: `wave-bar ${DURATIONS[i]} ${DELAYS[i]} ease-in-out infinite`,
                            }
                            : { height: "6px" }
                    }
                />
            ))}
        </div>
    );
}
