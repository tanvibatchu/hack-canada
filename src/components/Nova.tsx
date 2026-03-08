"use client";

import Lottie from "lottie-react";
import { useState, useEffect, useRef } from "react";
import mascotCelebrating from "../../public/mascot.json";
import mascotIncorrect from "../../public/mascot_incorrect.json";
import mascotIdle from "../../public/mascot_idle.json";
import mascotTalking from "../../public/mascot_talking.json";
import mascotSitting from "../../public/mascot_sitting.json";
import mascotSad from "../../public/mascot_sad.json";
import mascotWave from "../../public/mascot_wave.json";

type NovaState = "idle" | "celebrating" | "thinking" | "encouraging" | "incorrect";

type NovaProps = {
    state: NovaState;
    size?: "sm" | "md" | "lg";
};

const SIZE_MAP: Record<NonNullable<NovaProps["size"]>, number> = {
    sm: 100,
    md: 160,
    lg: 220,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NovaConfig = { speed: number; loop: boolean; glow: string; data: any };

const SITTING_CONFIG: Record<NovaState, NovaConfig> = {
    idle: { speed: 1.0, loop: true, glow: "rgba(139,92,246,0.1)", data: mascotSitting },
    celebrating: { speed: 1.0, loop: true, glow: "rgba(250,204,21,0.35)", data: mascotCelebrating },
    thinking: { speed: 1.0, loop: true, glow: "rgba(96,165,250,0.2)", data: mascotSitting },
    encouraging: { speed: 1.0, loop: true, glow: "rgba(74,222,128,0.25)", data: mascotTalking },
    incorrect: { speed: 1.0, loop: true, glow: "rgba(239, 37, 70, 0.25)", data: mascotIncorrect },
};

const STANDING_CONFIG: Record<NovaState, NovaConfig> = {
    idle: { speed: 1.0, loop: true, glow: "rgba(139,92,246,0.1)", data: mascotIdle },
    celebrating: { speed: 1.0, loop: true, glow: "rgba(250,204,21,0.35)", data: mascotCelebrating },
    thinking: { speed: 1.0, loop: true, glow: "rgba(96,165,250,0.2)", data: mascotIdle },
    encouraging: { speed: 1.0, loop: true, glow: "rgba(74,222,128,0.25)", data: mascotWave },
    incorrect: { speed: 1.0, loop: true, glow: "rgba(244, 44, 77, 0.25)", data: mascotSad },
};

export default function Nova({ state: propState, size = "lg" }: NovaProps) {
    const [mounted, setMounted] = useState(false);
    const [theme, setTheme] = useState<"sitting" | "standing">("standing");
    const [isGlobalSpeaking, setIsGlobalSpeaking] = useState(false);
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lottieRef = useRef<any>(null);
    const px = SIZE_MAP[size];

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTheme(Math.random() > 0.5 ? "sitting" : "standing");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);

        const handleSpeaking = (e: Event) => {
            const isSpeaking = (e as CustomEvent).detail;
            setIsGlobalSpeaking(isSpeaking);
        };
        window.addEventListener("nova-speaking", handleSpeaking);
        return () => window.removeEventListener("nova-speaking", handleSpeaking);
    }, []);

    // If global audio is actively playing, override the state to "encouraging" (talking)
    const activeState = isGlobalSpeaking ? "encouraging" : propState;
    const config = theme === "sitting" ? SITTING_CONFIG[activeState] : STANDING_CONFIG[activeState];

    useEffect(() => {
        if (!lottieRef.current) return;
        lottieRef.current.setSpeed(config.speed);
    }, [activeState, config.speed, mounted]);

    if (!mounted) {
        return <div style={{ width: px, height: px }} />;
    }

    return (
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* Ambient glow behind mascot */}
            <div style={{
                position: "absolute",
                width: px * 0.85,
                height: px * 0.85,
                borderRadius: "50%",
                background: config.glow,
                filter: "blur(24px)",
                transition: "background 0.6s ease, transform 0.4s ease",
                transform: activeState === "celebrating" ? "scale(1.3)" : "scale(1)",
                pointerEvents: "none",
            }} />

            {/* Celebration ring burst */}
            {activeState === "celebrating" && (
                <>
                    <div style={{
                        position: "absolute",
                        width: px * 1.1, height: px * 1.1,
                        borderRadius: "50%",
                        border: "2px solid rgba(250,204,21,0.3)",
                        animation: "nova-ring 1.2s ease-out infinite",
                        pointerEvents: "none",
                    }} />
                    <div style={{
                        position: "absolute",
                        width: px * 1.3, height: px * 1.3,
                        borderRadius: "50%",
                        border: "2px solid rgba(250,204,21,0.15)",
                        animation: "nova-ring 1.2s ease-out 0.4s infinite",
                        pointerEvents: "none",
                    }} />
                </>
            )}

            {/* The mascot */}
            <Lottie
                lottieRef={lottieRef}
                animationData={config.data}
                loop={config.loop}
                autoplay={true}
                style={{ width: px, height: px, position: "relative", zIndex: 1 }}
            />

            {/* Floating particles for celebrating */}
            {activeState === "celebrating" && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
                    {["⭐", "✨", "💫", "🎉", "⭐"].map((star, i) => (
                        <span key={i} style={{
                            position: "absolute",
                            fontSize: "1.4rem",
                            top: `${[8, 4, 12, 6, 2][i]}%`,
                            left: `${[4, 78, 82, 44, 18][i]}%`,
                            animation: "nova-float 1s ease-in-out infinite",
                            animationDelay: `${i * 0.2}s`,
                            opacity: 0.9,
                        }}>{star}</span>
                    ))}
                </div>
            )}

            {/* Thinking dots */}
            {activeState === "thinking" && (
                <div style={{
                    position: "absolute", bottom: -8, right: -8,
                    display: "flex", gap: 4, zIndex: 2,
                }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: 7, height: 7, borderRadius: "50%",
                            background: "#60a5fa",
                            animation: "nova-dot 1.2s ease-in-out infinite",
                            animationDelay: `${i * 0.2}s`,
                        }} />
                    ))}
                </div>
            )}

            {/* Encouraging thumbs up */}
            {activeState === "encouraging" && (
                <span style={{
                    position: "absolute", bottom: -6, right: -6,
                    fontSize: "1.8rem", zIndex: 2,
                    animation: "nova-float 1.5s ease-in-out infinite",
                }}>👍</span>
            )}

            <style>{`
                @keyframes nova-ring {
                    0% { transform: scale(0.8); opacity: 0.8; }
                    100% { transform: scale(1.5); opacity: 0; }
                }
                @keyframes nova-float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes nova-dot {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}