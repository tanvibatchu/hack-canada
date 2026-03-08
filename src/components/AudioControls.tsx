"use client";

import { useEffect, useState } from "react";
import { isMuted, setMuted, repeatLastAudio, stopCurrentAudio } from "@/lib/elevenlabs";

type AudioControlsProps = {
    disabled?: boolean;
    colorTheme?: string;
};

export default function AudioControls({ disabled = false, colorTheme = "#945F95" }: AudioControlsProps) {
    const [muted, setMutedState] = useState(false);
    const [repeating, setRepeating] = useState(false);

    useEffect(() => {
        // Hydrate from global state on mount
        setMutedState(isMuted());
    }, []);

    const toggleMute = () => {
        const next = !muted;
        setMuted(next);
        setMutedState(next);
    };

    const handleRepeat = async () => {
        if (disabled || repeating) return;
        setRepeating(true);
        stopCurrentAudio(); // Optional safeguard
        try {
            await repeatLastAudio();
        } finally {
            setRepeating(false);
        }
    };

    return (
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border-2 border-[rgba(57,0,82,0.1)] border-b-[4px]">
            {/* Mute Toggle */}
            <button
                onClick={toggleMute}
                className="w-10 h-10 flex flex-col items-center justify-center rounded-full transition-all hover:bg-black/5"
                aria-label={muted ? "Unmute audio" : "Mute audio"}
                style={{ color: muted ? "#ccc" : colorTheme }}
            >
                {muted ? (
                    // Muted Speaker Icon
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                    </svg>
                ) : (
                    // Active Speaker Icon
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                    </svg>
                )}
                <span className="text-[10px] uppercase font-black tracking-wider mt-0.5">{muted ? "Muted" : "On"}</span>
            </button>

            {/* Divider */}
            <div className="w-[2px] h-6 bg-[rgba(57,0,82,0.1)] rounded-full"></div>

            {/* Repeat Button */}
            <button
                onClick={handleRepeat}
                disabled={disabled || repeating}
                className="w-10 h-10 flex flex-col items-center justify-center rounded-full transition-all hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Repeat last audio"
                title="Repeat audio"
                style={{ color: disabled ? "#ccc" : colorTheme }}
            >
                <div className={repeating ? "animate-spin" : ""}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </div>
                <span className="text-[10px] uppercase font-black tracking-wider mt-0.5" style={{ color: repeating || disabled ? "#ccc" : colorTheme }}>Repeat</span>
            </button>
        </div>
    );
}
