"use client";

import { useRef, useState } from "react";
import WaveformDisplay from "./WaveformDisplay";

type MicButtonProps = {
  disabled: boolean;
  isRecording: boolean;
  onStart: () => void;
  onStop: () => void;
};

export default function MicButton({
  disabled,
  isRecording,
  onStart,
  onStop,
}: MicButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const activePointerIdRef = useRef<number | null>(null);
  const keyboardActiveRef = useRef(false);

  const releasePress = (shouldStop: boolean) => {
    setIsPressed(false);
    activePointerIdRef.current = null;

    if (shouldStop && isRecording) {
      onStop();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <WaveformDisplay isActive={isRecording} />

      <button
        aria-disabled={disabled}
        aria-label={isRecording ? "Recording in progress" : "Hold to record"}
        className={[
          "relative flex h-32 w-32 items-center justify-center rounded-full outline-none transition-all duration-150",
          isRecording ? "animate-pulse" : "",
        ].join(" ")}
        onKeyDown={(event) => {
          if (disabled || keyboardActiveRef.current) return;
          if (event.key !== " " && event.key !== "Enter") return;

          event.preventDefault();
          keyboardActiveRef.current = true;
          setIsPressed(true);
          onStart();
        }}
        onKeyUp={(event) => {
          if (!keyboardActiveRef.current) return;
          if (event.key !== " " && event.key !== "Enter") return;

          event.preventDefault();
          keyboardActiveRef.current = false;
          releasePress(true);
        }}
        onPointerCancel={() => releasePress(true)}
        onPointerDown={(event) => {
          if (disabled || isRecording) return;

          activePointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          setIsPressed(true);
          onStart();
        }}
        onPointerLeave={() => {
          if (activePointerIdRef.current === null) return;
          releasePress(true);
        }}
        onPointerUp={(event) => {
          if (activePointerIdRef.current !== event.pointerId) return;

          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }

          releasePress(true);
        }}
        style={{
          background: disabled ? "#F4E8EE" : isRecording ? "#FFF6F8" : "#CE7DA5",
          border: `4px solid ${isRecording ? "#CE7DA5" : "rgba(57, 0, 82, 0.12)"}`,
          borderBottom: isPressed ? "4px solid rgba(57, 0, 82, 0.12)" : "10px solid rgba(57, 0, 82, 0.12)",
          boxShadow: isRecording
            ? "0 0 0 14px rgba(206, 125, 165, 0.18)"
            : "0 18px 30px rgba(57, 0, 82, 0.12)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.7 : 1,
          transform: isPressed ? "translateY(6px)" : "translateY(0)",
        }}
        type="button"
      >
        <span
          aria-hidden="true"
          className="absolute inset-3 rounded-full"
          style={{
            background: isRecording ? "rgba(206, 125, 165, 0.16)" : "rgba(255, 255, 255, 0.18)",
          }}
        />

        <svg
          aria-hidden="true"
          className="relative z-10 h-14 w-14"
          fill={isRecording ? "#CE7DA5" : disabled ? "#945F95" : "#FFFFFF"}
          viewBox="0 0 24 24"
        >
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 11a1 1 0 1 0-2 0v1a5 5 0 0 1-10 0v-1a1 1 0 1 0-2 0v1a7 7 0 0 0 6 6.93V22a1 1 0 1 0 2 0v-3.07A7 7 0 0 0 19 12v-1Z" />
        </svg>

        {isRecording ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full animate-ping"
            style={{ border: "4px solid rgba(206, 125, 165, 0.5)" }}
          />
        ) : null}
      </button>

      <p className="select-none text-sm font-black uppercase tracking-[0.28em] text-[#945F95]">
        {disabled ? "Wait for Nova" : isRecording ? "Release to send" : "Hold to talk"}
      </p>
    </div>
  );
}
