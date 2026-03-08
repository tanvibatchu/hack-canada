// MicButton.tsx — Large circular microphone button for voice input.
// Purple gradient at rest, white glowing ring when recording.
// Disabled while Nova is speaking.

"use client";

import WaveformDisplay from "./WaveformDisplay";

type MicButtonProps = {
    onStart: () => void;
    onStop: () => void;
    isRecording: boolean;
    disabled: boolean;
};

export default function MicButton({
    onStart,
    onStop,
    isRecording,
    disabled,
}: MicButtonProps) {
    return (
        <div className="flex flex-col items-center gap-4">
            {/* Waveform display — above button */}
            <WaveformDisplay isActive={isRecording} />

            {/* Button */}
            <button
                onPointerDown={!disabled ? onStart : undefined}
                onPointerUp={!disabled ? onStop : undefined}
                disabled={disabled}
                aria-label={isRecording ? "Recording — release to stop" : "Hold to speak"}
                className={[
                    // Shape
                    "relative w-24 h-24 rounded-full",
                    "flex items-center justify-center",
                    // Transition
                    "transition-all duration-200",
                    // Idle state
                    !isRecording && !disabled
                        ? "bg-gradient-to-br from-purple-500 to-violet-700 shadow-[0_0_24px_rgba(124,58,237,0.5)] active:scale-95"
                        : "",
                    // Recording state
                    isRecording
                        ? "bg-white animate-[mic-ring_1.2s_ease-in-out_infinite] scale-105"
                        : "",
                    // Disabled state
                    disabled ? "opacity-40 cursor-not-allowed bg-purple-900" : "cursor-pointer",
                ].join(" ")}
            >
                {/* Mic SVG icon */}
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className={[
                        "w-10 h-10 transition-colors duration-200",
                        isRecording ? "text-purple-600" : "text-white",
                    ].join(" ")}
                    aria-hidden="true"
                >
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z" />
                </svg>

                {/* Recording pulse ring */}
                {isRecording && (
                    <span className="absolute inset-0 rounded-full border-4 border-purple-400 animate-ping opacity-60" />
                )}
            </button>

            {/* Label */}
            <p className="text-sm text-purple-300 select-none">
                {disabled
                    ? "Nova is speaking…"
                    : isRecording
                        ? "Listening… release when done"
                        : "Hold to speak"}
            </p>
        </div>
    );
}
