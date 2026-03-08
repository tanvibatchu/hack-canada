"use client";

import { useState, useEffect, useRef } from "react";
import type { ChildProfile } from "@/types";
import { useRouter } from "next/navigation";

type ParentGateProps = {
    onClose: () => void;
    onSuccess: () => void;
};

export default function ParentGate({ onClose, onSuccess }: ParentGateProps) {
    const [loading, setLoading] = useState(true);
    const [existingPin, setExistingPin] = useState<string | null>(null);
    const [originalProfile, setOriginalProfile] = useState<ChildProfile | null>(null);

    const [pin, setPin] = useState(["", "", "", "", "", ""]);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        async function fetchProfile() {
            try {
                const res = await fetch("/api/profile");
                if (res.ok) {
                    const data = await res.json();
                    if (data.profile) {
                        setOriginalProfile(data.profile);
                        if (data.profile.parentPin) {
                            setExistingPin(data.profile.parentPin);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setLoading(false);
                // Auto-focus first input after load
                if (inputsRef.current[0]) inputsRef.current[0].focus();
            }
        }
        fetchProfile();
    }, []);

    const handlePinChange = (index: number, value: string) => {
        // Only allow digits
        if (value && !/^\d+$/.test(value)) return;

        const newPin = [...pin];
        // Take only the last char if they pasted or typed quickly
        newPin[index] = value.slice(-1);
        setPin(newPin);
        setError(null);

        // Move to next input
        if (value && index < 5) {
            inputsRef.current[index + 1]?.focus();
        }

        // Auto-submit if all 6 filled
        if (value && index === 5 && newPin.every(p => p !== "")) {
            handleSubmit(newPin.join(""));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !pin[index] && index > 0) {
            inputsRef.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async (enteredPin: string) => {
        if (enteredPin.length !== 6) {
            setError("Please enter a 6-digit PIN.");
            return;
        }

        if (existingPin) {
            // Returning user check
            if (enteredPin === existingPin) {
                onSuccess();
            } else {
                setError("Incorrect PIN.");
                setPin(["", "", "", "", "", ""]);
                inputsRef.current[0]?.focus();
            }
        } else {
            // First time setup
            setSaving(true);
            try {
                const updatedProfile = {
                    ...(originalProfile ?? {}),
                    parentPin: enteredPin
                };

                const res = await fetch("/api/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedProfile),
                });

                if (res.ok) {
                    onSuccess();
                } else {
                    setError("Failed to save PIN.");
                    setSaving(false);
                }
            } catch (err) {
                console.error(err);
                setError("Error saving PIN.");
                setSaving(false);
            }
        }
    };

    const isFirstTime = !existingPin;

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(15, 12, 41, 0.8)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            fontFamily: "'Nunito', sans-serif"
        }} onClick={onClose}>

            <div style={{
                background: "#FFFFFF",
                borderRadius: 24, padding: "40px 32px",
                width: "100%", maxWidth: 400,
                boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
                color: "#302b63",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 24
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔒</div>
                    <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0 0 8px 0" }}>Parent Dashboard</h2>
                    <p style={{ fontSize: "0.95rem", color: "#666", margin: 0, fontWeight: 600 }}>
                        {loading ? "Loading security settings..." :
                            isFirstTime ? "Create a 6-digit PIN to secure the parent dashboard." : "Enter your 6-digit PIN to continue."}
                    </p>
                </div>

                {!loading && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, width: "100%" }}>
                        {/* PIN Inputs */}
                        <div style={{ display: "flex", gap: 8, justifyContent: "center", width: "100%" }}>
                            {pin.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={el => { inputsRef.current[i] = el; }}
                                    type="password"
                                    inputMode="numeric"
                                    value={digit}
                                    onChange={e => handlePinChange(i, e.target.value)}
                                    onKeyDown={e => handleKeyDown(i, e)}
                                    disabled={saving}
                                    style={{
                                        width: 44, height: 56,
                                        borderRadius: 12, border: `2px solid ${error ? "#FF4B4B" : "rgba(48, 43, 99, 0.2)"}`,
                                        fontSize: "1.5rem", fontWeight: 800, textAlign: "center",
                                        color: "#302b63", outline: "none", backgroundColor: "#F5F5F7"
                                    }}
                                />
                            ))}
                        </div>

                        {error && <div style={{ color: "#FF4B4B", fontSize: "0.85rem", fontWeight: 700 }}>{error}</div>}

                        {/* Action Buttons */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", marginTop: 8 }}>
                            <button
                                onClick={() => handleSubmit(pin.join(""))}
                                disabled={saving || pin.some(p => p === "")}
                                style={{
                                    width: "100%", padding: 16, borderRadius: 12,
                                    background: "#9333ea", color: "white",
                                    border: "none",
                                    fontSize: "1.1rem", fontWeight: 700, cursor: (saving || pin.some(p => p === "")) ? "not-allowed" : "pointer",
                                    opacity: (saving || pin.some(p => p === "")) ? 0.7 : 1, transition: "all 0.1s",
                                    boxShadow: "0 4px 14px rgba(147, 51, 234, 0.3)"
                                }}
                            >
                                {saving ? "Saving..." : isFirstTime ? "Set PIN" : "Unlock"}
                            </button>
                            <button
                                onClick={onClose}
                                disabled={saving}
                                style={{
                                    width: "100%", padding: 12, borderRadius: 12,
                                    background: "transparent", color: "#666",
                                    border: "none",
                                    fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
