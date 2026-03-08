"use client";

import { useState, useEffect } from "react";
import type { ChildProfile } from "@/types";

type ProfileMenuProps = {
    onClose: () => void;
    readOnly?: boolean;
};

export default function ProfileMenu({ onClose, readOnly = false }: ProfileMenuProps) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Auth0 User details
    const [email, setEmail] = useState("");
    const [memberId, setMemberId] = useState("");

    // Editable Profile details
    const [name, setName] = useState("");
    const [age, setAge] = useState<number>(6);
    const [parentName, setParentName] = useState("");
    const [parentRelation, setParentRelation] = useState("");

    // Read-only Profile details
    const [streak, setStreak] = useState(0);
    const [xp, setXp] = useState(0);
    const [sounds, setSounds] = useState<string[]>([]);

    // We store the full profile object so we don't accidentally wipe out fields not shown in the UI during a POST
    const [originalProfile, setOriginalProfile] = useState<ChildProfile | null>(null);

    useEffect(() => {
        async function fetchProfile() {
            try {
                const res = await fetch("/api/profile");
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        setEmail(data.user.email ?? "");
                        setMemberId(data.user.userId ?? "");
                    }
                    if (data.profile) {
                        setOriginalProfile(data.profile);
                        setName(data.profile.name ?? "");
                        setAge(data.profile.age ?? 6);
                        setParentName(data.profile.parentName ?? "");
                        setParentRelation(data.profile.parentRelation ?? "");
                        setStreak(data.profile.streak ?? 0);
                        setXp(data.profile.totalXP ?? data.profile.xp ?? 0);
                        setSounds(data.profile.targetSounds ?? []);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setLoading(false);
            }
        }
        fetchProfile();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Merge edits into original profile
            const updatedProfile = {
                ...(originalProfile ?? {}),
                name,
                age: Number(age),
                parentName,
                parentRelation,
            };

            const res = await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedProfile),
            });

            if (res.ok) {
                onClose(); // Parent will trigger window.location.reload()
            } else {
                alert("Failed to save profile.");
                setSaving(false);
            }
        } catch (err) {
            console.error(err);
            alert("Error saving profile.");
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(57, 0, 82, 0.4)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            fontFamily: "'Nunito', sans-serif"
        }} onClick={onClose}>

            <div style={{
                background: "#FFFFFF",
                borderRadius: 24, padding: 32,
                width: "100%", maxWidth: 480,
                boxShadow: "0 24px 80px rgba(57,0,82,0.2), 0 0 40px rgba(148, 95, 149, 0.2)",
                color: "#390052",
                display: "flex", flexDirection: "column", gap: 24
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid rgba(57,0,82,0.1)", paddingBottom: 16 }}>
                    <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>Profile & Settings</h2>
                        <p style={{ fontSize: "0.9rem", color: "#945F95", margin: 0, fontWeight: 600 }}>Adjust age-scaling and preferences</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: "rgba(57,0,82,0.1)", border: "none", color: "#390052", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >✕</button>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: 32, color: "#945F95", fontWeight: 600 }}>Loading profile data...</div>
                ) : (
                    <>
                        {/* Auth0 Info */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "#F9F4F1", padding: 16, borderRadius: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#945F95", textTransform: "uppercase" }}>Account Email</span>
                                <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>{email || "N/A"}</span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#945F95", textTransform: "uppercase" }}>Member ID</span>
                                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1CB0F6" }}>{memberId ? memberId.split('|')[1]?.substring(0, 8) + "..." : "N/A"}</span>
                            </div>
                        </div>

                        {/* Editable Form */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div>
                                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 800, color: "#945F95", textTransform: "uppercase", marginBottom: 6 }}>Child's Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={readOnly}
                                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid rgba(57,0,82,0.1)", fontSize: "1.1rem", fontWeight: 700, color: "#390052", outline: "none", boxSizing: "border-box", opacity: readOnly ? 0.7 : 1, cursor: readOnly ? "not-allowed" : "text" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#945F95", textTransform: "uppercase" }}>Child's Age</span>
                                    <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#FF9600" }}>Modifies Exercise Difficulty</span>
                                </label>
                                <select
                                    value={age}
                                    onChange={(e) => setAge(Number(e.target.value))}
                                    disabled={readOnly}
                                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid rgba(57,0,82,0.1)", fontSize: "1.1rem", fontWeight: 700, color: "#390052", outline: "none", boxSizing: "border-box", backgroundColor: "white", cursor: readOnly ? "not-allowed" : "pointer", opacity: readOnly ? 0.7 : 1 }}
                                >
                                    {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(a => (
                                        <option key={a} value={a}>{a} years old {a <= 4 ? "(Level 1 - Emerging)" : a <= 6 ? "(Level 2 - Developing)" : "(Level 3 - Strong)"}</option>
                                    ))}
                                </select>
                            </div>

                            {!readOnly && (
                                <>
                                    <div style={{ borderTop: "2px solid rgba(57,0,82,0.1)", margin: "4px 0" }} />
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 800, color: "#945F95", textTransform: "uppercase", marginBottom: 6 }}>Parent/Guardian Name</label>
                                        <input
                                            type="text"
                                            value={parentName}
                                            onChange={(e) => setParentName(e.target.value)}
                                            placeholder="Enter your name"
                                            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid rgba(57,0,82,0.1)", fontSize: "1.1rem", fontWeight: 700, color: "#390052", outline: "none", boxSizing: "border-box" }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 800, color: "#945F95", textTransform: "uppercase", marginBottom: 6 }}>Relation to Child</label>
                                        <select
                                            value={parentRelation}
                                            onChange={(e) => setParentRelation(e.target.value)}
                                            style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid rgba(57,0,82,0.1)", fontSize: "1.1rem", fontWeight: 700, color: "#390052", outline: "none", boxSizing: "border-box", backgroundColor: "white", cursor: "pointer" }}
                                        >
                                            <option value="">Select relation...</option>
                                            <option value="Mother">Mother</option>
                                            <option value="Father">Father</option>
                                            <option value="Guardian">Guardian</option>
                                            <option value="SLP">Speech-Language Pathologist</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Read-Only Stats */}
                        <div style={{ display: "flex", gap: 12 }}>
                            <div style={{ flex: 1, border: "2px solid rgba(57,0,82,0.1)", borderRadius: 16, padding: 12, textAlign: "center" }}>
                                <div style={{ fontSize: "1.5rem" }}>🔥</div>
                                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#FF9600", marginTop: 4 }}>{streak}</div>
                                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#945F95", textTransform: "uppercase" }}>Day Streak</div>
                            </div>
                            <div style={{ flex: 1, border: "2px solid rgba(57,0,82,0.1)", borderRadius: 16, padding: 12, textAlign: "center" }}>
                                <div style={{ fontSize: "1.5rem" }}>⭐</div>
                                <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#FFC800", marginTop: 4 }}>{xp}</div>
                                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#945F95", textTransform: "uppercase" }}>Total XP</div>
                            </div>
                        </div>

                        <div style={{ textAlign: "center" }}>
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#945F95", textTransform: "uppercase", marginRight: 8 }}>Active Target Sounds:</span>
                            {sounds.length > 0 ? sounds.map(s => <span key={s} style={{ background: "rgba(206,125,165,0.15)", border: "1px solid rgba(206,125,165,0.4)", color: "#CE7DA5", padding: "2px 8px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 800, marginRight: 4 }}>/{s}/</span>) : <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#390052" }}>None</span>}
                        </div>

                        {/* Save Button */}
                        {!readOnly ? (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    width: "100%", padding: 16, borderRadius: 16,
                                    background: "#58CC02", color: "white",
                                    border: "none", borderBottom: "4px solid #46A302",
                                    fontSize: "1.2rem", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer",
                                    opacity: saving ? 0.7 : 1, transition: "all 0.1s"
                                }}
                            >
                                {saving ? "Saving..." : "Save Preferences"}
                            </button>
                        ) : (
                            <div style={{ textAlign: "center", fontSize: "0.85rem", color: "#945F95", fontWeight: 700, marginTop: 8 }}>
                                Settings can only be changed from the Parent Dashboard.
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
