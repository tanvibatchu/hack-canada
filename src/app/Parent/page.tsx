"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ─── MOCK DATA (simulates API responses) ────────────────────────────────────

const MOCK_PROFILE = {
  name: "Liam",
  age: 7,
  targetSounds: ["r", "s", "th"],
  streak: 12,
  lastSessionDate: "2026-03-06",
  totalXP: 3840,
};

const MOCK_PROGRESS = {
  sessionsThisWeek: 5,
  bestAccuracyThisWeek: 91,
  weeksToMastery: 3,
  trend: "improving",
  insight: "Liam is making excellent progress on the 'r' sound. Consistent daily practice is accelerating improvement beyond the initial forecast.",
};

const MOCK_SESSIONS: Record<string, SessionData[]> = {
  r: [
    { date: "Feb 14", durationSeconds: 420, targetSound: "r", averageAccuracy: 54, attempts: [] },
    { date: "Feb 17", durationSeconds: 380, targetSound: "r", averageAccuracy: 61, attempts: [] },
    { date: "Feb 20", durationSeconds: 510, targetSound: "r", averageAccuracy: 58, attempts: [] },
    { date: "Feb 23", durationSeconds: 460, targetSound: "r", averageAccuracy: 67, attempts: [] },
    { date: "Feb 26", durationSeconds: 490, targetSound: "r", averageAccuracy: 73, attempts: [] },
    { date: "Mar 01", durationSeconds: 530, targetSound: "r", averageAccuracy: 78, attempts: [] },
    { date: "Mar 04", durationSeconds: 500, targetSound: "r", averageAccuracy: 82, attempts: [] },
    { date: "Mar 06", durationSeconds: 470, targetSound: "r", averageAccuracy: 88, attempts: [] },
  ],
  s: [
    { date: "Feb 15", durationSeconds: 360, targetSound: "s", averageAccuracy: 71, attempts: [] },
    { date: "Feb 19", durationSeconds: 400, targetSound: "s", averageAccuracy: 75, attempts: [] },
    { date: "Feb 22", durationSeconds: 430, targetSound: "s", averageAccuracy: 70, attempts: [] },
    { date: "Feb 25", durationSeconds: 410, targetSound: "s", averageAccuracy: 79, attempts: [] },
    { date: "Mar 02", durationSeconds: 450, targetSound: "s", averageAccuracy: 83, attempts: [] },
    { date: "Mar 05", durationSeconds: 390, targetSound: "s", averageAccuracy: 87, attempts: [] },
  ],
  th: [
    { date: "Feb 18", durationSeconds: 300, targetSound: "th", averageAccuracy: 38, attempts: [] },
    { date: "Feb 22", durationSeconds: 340, targetSound: "th", averageAccuracy: 42, attempts: [] },
    { date: "Feb 27", durationSeconds: 360, targetSound: "th", averageAccuracy: 39, attempts: [] },
    { date: "Mar 03", durationSeconds: 380, targetSound: "th", averageAccuracy: 48, attempts: [] },
    { date: "Mar 06", durationSeconds: 410, targetSound: "th", averageAccuracy: 55, attempts: [] },
  ],
};

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface SessionData {
  date: string;
  durationSeconds: number;
  targetSound: string;
  averageAccuracy: number;
  attempts: unknown[];
}

interface ChildProfile {
  name: string;
  age: number;
  targetSounds: string[];
  streak: number;
  lastSessionDate: string;
  totalXP: number;
}

interface ProgressData {
  sessionsThisWeek: number;
  bestAccuracyThisWeek: number;
  weeksToMastery: number;
  trend: string;
  insight: string;
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function accuracyColor(acc: number): string {
  if (acc >= 80) return "#4ade80";
  if (acc >= 50) return "#facc15";
  return "#f87171";
}

function computeProjection(sessions: SessionData[]) {
  if (sessions.length < 2) return sessions.map(s => ({ ...s, projected: s.averageAccuracy }));
  const n = sessions.length;
  const last = sessions[n - 1].averageAccuracy;
  const prev = sessions[n - 2].averageAccuracy;
  const delta = last - prev;
  return sessions.map((s, i) => ({
    ...s,
    projected: Math.min(100, Math.round(s.averageAccuracy + delta * (i - n + 2) * 0.4)),
  }));
}

// ─── SKELETON ────────────────────────────────────────────────────────────────

function Skeleton({ height = 96 }: { height?: number }) {
  return (
    <div style={{
      height, borderRadius: 12,
      background: "linear-gradient(90deg, #1e1340, #2a1d5c, #1e1340)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
    }} />
  );
}

// ─── TOP BAR ─────────────────────────────────────────────────────────────────

function TopBar({ onPrint }: { onPrint: () => void }) {
  return (
    <header style={{
      background: "rgba(10,6,30,0.85)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(139,92,246,0.2)",
      position: "sticky", top: 0, zIndex: 50,
      padding: "0 2rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      height: "64px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #7c3aed, #a855f7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 800, color: "#fff",
          boxShadow: "0 0 20px rgba(139,92,246,0.5)",
        }}>A</div>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.4rem", color: "#e2d9f3", letterSpacing: "-0.02em" }}>
          ArtiCue
        </span>
        <span style={{
          fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.12em",
          color: "#a78bfa", background: "rgba(124,58,237,0.15)",
          border: "1px solid rgba(124,58,237,0.3)",
          padding: "2px 8px", borderRadius: 20, textTransform: "uppercase",
        }}>Parent</span>
      </div>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button onClick={onPrint} style={{
          background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)",
          color: "#c4b5fd", borderRadius: 8, padding: "7px 16px",
          fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          🖨 Share with SLP
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer",
        }}>P</div>
      </div>
    </header>
  );
}

// ─── CHILD PROFILE CARD ──────────────────────────────────────────────────────

function ChildProfileCard({ profile, loading }: { profile: ChildProfile | null; loading: boolean }) {
  if (loading) return <Skeleton height={144} />;
  if (!profile) return null;
  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(30,19,64,0.9) 0%, rgba(45,28,90,0.9) 100%)",
      border: "1px solid rgba(139,92,246,0.25)",
      borderRadius: 16, padding: "1.5rem 2rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: "1rem",
      boxShadow: "0 4px 32px rgba(124,58,237,0.1)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "linear-gradient(135deg, #7c3aed, #a855f7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.8rem", boxShadow: "0 0 24px rgba(168,85,247,0.4)",
        }}>🧒</div>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.6rem", color: "#f3f0ff", lineHeight: 1.1 }}>
            {profile.name}
          </div>
          <div style={{ color: "#9ca3af", fontSize: "0.85rem", marginTop: 2 }}>
            Age {profile.age} · Last practiced {daysSince(profile.lastSessionDate)} day{daysSince(profile.lastSessionDate) !== 1 ? "s" : ""} ago
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {profile.targetSounds.map(s => (
              <span key={s} style={{
                padding: "3px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)",
                color: "#c4b5fd",
              }}>/{s}/</span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "1.5rem" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.8rem", lineHeight: 1 }}>🔥</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fb923c", fontFamily: "'DM Serif Display', serif" }}>{profile.streak}</div>
          <div style={{ fontSize: "0.7rem", color: "#9ca3af", letterSpacing: "0.06em" }}>DAY STREAK</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.8rem", lineHeight: 1 }}>⭐</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#facc15", fontFamily: "'DM Serif Display', serif" }}>{profile.totalXP.toLocaleString()}</div>
          <div style={{ fontSize: "0.7rem", color: "#9ca3af", letterSpacing: "0.06em" }}>TOTAL XP</div>
        </div>
      </div>
    </div>
  );
}

// ─── PROGRESS SUMMARY ────────────────────────────────────────────────────────

function ProgressSummary({ profile, progress, loading }: { profile: ChildProfile | null; progress: ProgressData | null; loading: boolean }) {
  const stats = [
    { icon: "🔥", label: "Day Streak", value: profile?.streak ?? "—", color: "#fb923c" },
    { icon: "⭐", label: "Total XP", value: profile?.totalXP?.toLocaleString() ?? "—", color: "#facc15" },
    { icon: "📅", label: "Sessions This Week", value: progress?.sessionsThisWeek ?? "—", color: "#818cf8" },
    { icon: "🎯", label: "Best Accuracy", value: progress?.bestAccuracyThisWeek ? `${progress.bestAccuracyThisWeek}%` : "—", color: "#4ade80" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
      {stats.map(({ icon, label, value, color }) => (
        loading ? <Skeleton key={label} height={96} /> :
          <div key={label} style={{
            background: "rgba(20,13,50,0.7)", border: "1px solid rgba(139,92,246,0.15)",
            borderRadius: 12, padding: "1rem 1.25rem",
            borderLeft: `3px solid ${color}`,
          }}>
            <div style={{ fontSize: "1.4rem" }}>{icon}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color, fontFamily: "'DM Serif Display', serif", lineHeight: 1.1, marginTop: 4 }}>{value}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280", letterSpacing: "0.06em", marginTop: 4 }}>{label.toUpperCase()}</div>
          </div>
      ))}
    </div>
  );
}

// ─── SOUND SELECTOR ──────────────────────────────────────────────────────────

function SoundSelector({ sounds, selected, onChange }: { sounds: string[]; selected: string; onChange: (s: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(139,92,246,0.2)" }}>
      {sounds.map(sound => (
        <button key={sound} onClick={() => onChange(sound)} style={{
          padding: "0.6rem 1.4rem", background: "none", border: "none",
          cursor: "pointer", fontSize: "0.9rem", fontWeight: 600,
          color: selected === sound ? "#a78bfa" : "#6b7280",
          borderBottom: selected === sound ? "2px solid #7c3aed" : "2px solid transparent",
          marginBottom: -1, transition: "all 0.2s",
        }}>
          /{sound}/
        </button>
      ))}
    </div>
  );
}

// ─── PREDICTION CARD ─────────────────────────────────────────────────────────

function PredictionCard({ progress, loading }: { progress: ProgressData | null; loading: boolean }) {
  if (loading) return <Skeleton height={140} />;
  if (!progress) return null;
  const trendIcon = progress.trend === "improving" ? "📈" : progress.trend === "plateau" ? "➡️" : "📊";
  const trendLabel = progress.trend === "improving" ? "Improving" : progress.trend === "plateau" ? "Plateau" : "Inconsistent";
  return (
    <div style={{
      background: "linear-gradient(135deg, #3b1d8a 0%, #5b21b6 50%, #4c1d95 100%)",
      borderRadius: 16, padding: "1.75rem 2rem",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      flexWrap: "wrap", gap: "1rem",
      boxShadow: "0 8px 40px rgba(109,40,217,0.35)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -30, right: -30,
        width: 180, height: 180, borderRadius: "50%",
        background: "rgba(167,139,250,0.08)", pointerEvents: "none",
      }} />
      <div>
        <div style={{ fontSize: "0.72rem", color: "#c4b5fd", letterSpacing: "0.14em", marginBottom: 6 }}>PREDICTED MASTERY</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: "3.5rem", color: "#fff", lineHeight: 1 }}>
            {progress.weeksToMastery}
          </span>
          <span style={{ color: "#c4b5fd", fontSize: "1rem" }}>weeks</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: "1.1rem" }}>{trendIcon}</span>
          <span style={{ color: "#ddd6fe", fontSize: "0.85rem", fontWeight: 600 }}>{trendLabel}</span>
        </div>
      </div>
      <div style={{
        maxWidth: 360, color: "#e9d5ff", fontSize: "0.88rem", lineHeight: 1.6,
        background: "rgba(0,0,0,0.15)", borderRadius: 10, padding: "0.9rem 1.2rem",
        borderLeft: "3px solid #facc15",
      }}>
        <span style={{ fontSize: "1rem" }}>⭐ </span>
        {progress.insight}
      </div>
    </div>
  );
}

// ─── ACCURACY CHART ──────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(15,10,40,0.95)", border: "1px solid rgba(139,92,246,0.4)",
      borderRadius: 10, padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#e9d5ff",
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}%</strong>
        </div>
      ))}
    </div>
  );
}

function AccuracyChart({ sessions, sound, loading }: { sessions: SessionData[]; sound: string; loading: boolean }) {
  if (loading) return <Skeleton height={280} />;
  const data = computeProjection(sessions);
  return (
    <div style={{
      background: "rgba(15,10,40,0.6)", border: "1px solid rgba(139,92,246,0.15)",
      borderRadius: 16, padding: "1.5rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display', serif", color: "#e2d9f3", fontSize: "1.1rem" }}>
            Accuracy Over Time — <span style={{ color: "#a78bfa" }}>/{sound}/</span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 2 }}>Session performance history</div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.25)",
          borderRadius: 8, padding: "4px 10px", fontSize: "0.75rem", color: "#facc15",
        }} title="In speech-language pathology, 80% accuracy is the standard threshold for sound mastery.">
          🎯 80% Mastery Goal ⓘ
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.1)" />
          <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={80} stroke="#facc15" strokeDasharray="5 4" strokeWidth={1.5} label={{ value: "Mastery", fill: "#facc15", fontSize: 10, position: "right" }} />
          <Line type="monotone" dataKey="averageAccuracy" name="Accuracy" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: "#7c3aed", r: 4 }} activeDot={{ r: 6, fill: "#a855f7" }} />
          <Line type="monotone" dataKey="projected" name="Projected" stroke="#a78bfa" strokeDasharray="6 4" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── SESSION HISTORY ─────────────────────────────────────────────────────────

function SessionHistory({ sessions, loading }: { sessions: SessionData[]; loading: boolean }) {
  if (loading) return <Skeleton height={260} />;
  const recent = [...sessions].reverse().slice(0, 10);
  return (
    <div style={{
      background: "rgba(15,10,40,0.6)", border: "1px solid rgba(139,92,246,0.15)",
      borderRadius: 16, padding: "1.5rem", overflow: "hidden",
    }}>
      <div style={{ fontFamily: "'DM Serif Display', serif", color: "#e2d9f3", fontSize: "1.1rem", marginBottom: "1rem" }}>
        Session History
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
          <thead>
            <tr>
              {["Date", "Sound", "Accuracy", "Duration"].map(h => (
                <th key={h} style={{
                  textAlign: "left", color: "#6b7280", fontWeight: 600,
                  letterSpacing: "0.07em", fontSize: "0.72rem", textTransform: "uppercase",
                  padding: "0 0.75rem 0.75rem",
                  borderBottom: "1px solid rgba(139,92,246,0.15)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recent.map((s, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(124,58,237,0.04)" }}>
                <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{s.date}</td>
                <td style={{ padding: "0.6rem 0.75rem" }}>
                  <span style={{
                    background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)",
                    color: "#c4b5fd", borderRadius: 20, padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700,
                  }}>/{s.targetSound}/</span>
                </td>
                <td style={{ padding: "0.6rem 0.75rem" }}>
                  <span style={{ color: accuracyColor(s.averageAccuracy), fontWeight: 700, fontSize: "0.9rem" }}>{s.averageAccuracy}%</span>
                  <div style={{
                    height: 3, width: `${s.averageAccuracy}%`, maxWidth: 80,
                    background: accuracyColor(s.averageAccuracy), borderRadius: 2, marginTop: 3, opacity: 0.4,
                  }} />
                </td>
                <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{formatDuration(s.durationSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedSound, setSelectedSound] = useState("r");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setProfile(MOCK_PROFILE);
      setProgress(MOCK_PROGRESS);
      setSessions(MOCK_SESSIONS["r"]);
      setLoadingProfile(false);
      setLoadingSessions(false);
    }, 1200);
  }, []);

  useEffect(() => {
    if (!profile) return;
    setLoadingSessions(true);
    setTimeout(() => {
      setSessions(MOCK_SESSIONS[selectedSound] || []);
      setLoadingSessions(false);
    }, 600);
  }, [selectedSound, profile]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07041a; color: #e2d9f3; font-family: 'DM Sans', sans-serif; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @media print { header { display: none !important; } body { background: white !important; color: black !important; } }
      `}</style>
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #07041a 0%, #0f0830 40%, #12093a 100%)" }}>
        <TopBar onPrint={() => window.print()} />
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem 4rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ animation: "fadeUp 0.4s ease both" }}>
            <ChildProfileCard profile={profile} loading={loadingProfile} />
          </div>
          <div style={{ animation: "fadeUp 0.4s ease 0.1s both" }}>
            <ProgressSummary profile={profile} progress={progress} loading={loadingProfile} />
          </div>
          {!loadingProfile && profile && (
            <div style={{ animation: "fadeUp 0.4s ease 0.2s both" }}>
              <SoundSelector sounds={profile.targetSounds} selected={selectedSound} onChange={setSelectedSound} />
            </div>
          )}
          <div style={{ animation: "fadeUp 0.4s ease 0.3s both" }}>
            <PredictionCard progress={progress} loading={loadingProfile} />
          </div>
          <div style={{ animation: "fadeUp 0.4s ease 0.4s both" }}>
            <AccuracyChart sessions={sessions} sound={selectedSound} loading={loadingSessions} />
          </div>
          <div style={{ animation: "fadeUp 0.4s ease 0.5s both" }}>
            <SessionHistory sessions={sessions} loading={loadingSessions} />
          </div>
        </main>
      </div>
    </>
  );
}
