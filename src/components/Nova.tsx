// Nova.tsx — Animated companion character for ArtiCue.
// Renders a large animated star character with 4 visual states:
// idle (breathe), celebrating (bounce), thinking (tilt), encouraging (glow).

"use client";

type NovaState = "idle" | "celebrating" | "thinking" | "encouraging";

type NovaProps = {
    state: NovaState;
    size?: "sm" | "md" | "lg";
};

const STATE_ANIMATIONS: Record<NovaState, string> = {
    idle: "animate-[nova-idle_3s_ease-in-out_infinite]",
    celebrating: "animate-[nova-bounce_0.7s_ease-in-out_infinite]",
    thinking: "animate-[nova-think_2s_ease-in-out_infinite]",
    encouraging: "animate-[nova-glow_2s_ease-in-out_infinite]",
};

const SIZE_CLASSES: Record<NonNullable<NovaProps["size"]>, string> = {
    sm: "text-6xl",
    md: "text-8xl",
    lg: "text-[7rem]",
};

export default function Nova({ state, size = "lg" }: NovaProps) {
    return (
        <div className="relative flex items-center justify-center select-none">
            {/* Outer ambient glow ring */}
            <div
                className={[
                    "absolute rounded-full pointer-events-none",
                    state === "celebrating"
                        ? "w-56 h-56 bg-purple-500/20 animate-[ring-expand_1.2s_ease-out_infinite]"
                        : "w-48 h-48 bg-purple-700/15",
                ].join(" ")}
            />

            {/* Secondary ring for celebrating */}
            {state === "celebrating" && (
                <div className="absolute w-40 h-40 rounded-full bg-yellow-400/10 animate-[ring-expand_1.2s_ease-out_0.4s_infinite] pointer-events-none" />
            )}

            {/* Nova character */}
            <div
                className={[
                    "relative z-10 cursor-default leading-none",
                    SIZE_CLASSES[size],
                    STATE_ANIMATIONS[state],
                ].join(" ")}
                role="img"
                aria-label={`Nova is ${state}`}
            >
                🌟
            </div>

            {/* Particle stars when celebrating */}
            {state === "celebrating" && (
                <div className="absolute inset-0 pointer-events-none" aria-hidden>
                    {["⭐", "✨", "💫", "⭐", "✨"].map((star, i) => (
                        <span
                            key={i}
                            className="absolute text-2xl animate-[nova-bounce_0.7s_ease-in-out_infinite]"
                            style={{
                                top: `${[10, 5, 15, 8, 2][i]}%`,
                                left: `${[5, 75, 85, 45, 20][i]}%`,
                                animationDelay: `${i * 0.15}s`,
                                opacity: 0.85,
                            }}
                        >
                            {star}
                        </span>
                    ))}
                </div>
            )}

            {/* Thumbs up for encouraging */}
            {state === "encouraging" && (
                <span
                    className="absolute -bottom-3 -right-3 text-3xl animate-[streak-pulse_1.5s_ease-in-out_infinite]"
                    aria-hidden
                >
                    👍
                </span>
            )}
        </div>
    );
}
