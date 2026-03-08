
"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar,
} from "recharts";

import ModeSwitcher from "@/components/ModeSwitcher";
import ChangeUserButton from "@/components/ChangeUserButton";
import Link from "next/link";
// ─── THEME ───────────────────────────────────────────────────────────────────

const COLORS = {
  parchment: "#F9F4F1", 
  white: "#FFFFFF",
  velvet: "#631D76",    
  amethyst: "#390052",  
  peony: "#CE7DA5",     
  lavender: "#945F95",  
  pageBg: "#F9F4F1",
  streak: "#FF9600",
  xp: "#FFC800",
  green: "#58CC02",     
  blue: "#1CB0F6",      
  red: "#FF4B4B",
  borderLight: "rgba(57, 0, 82, 0.1)",
  borderDark: "rgba(57, 0, 82, 0.15)",
};

const UI = {
  card: {
    background: COLORS.white,
    border: `1px solid ${COLORS.borderLight}`,
    borderRadius: 12,
    padding: 24,
    color: COLORS.amethyst,
    boxShadow: "0 2px 4px rgba(57, 0, 82, 0.04)"
  },
  pill: {
    background: "rgba(206, 125, 165, 0.15)",
    border: `1px solid rgba(206, 125, 165, 0.4)`,
    borderRadius: 8,
    padding: "4px 12px",
    fontSize: "0.8rem",
    fontWeight: 600,
    color: COLORS.velvet,
  }
};

// ─── TYPES ───────────────────────────────────────────────────────────────────

type ExerciseType = "practice" | "blend-it" | "rhyme-time" | "sound-hunt" | "speak-up";

interface SessionData {
  date: string;
  durationSeconds: number;
  targetSound: string;
  averageAccuracy: number;
  exerciseType: ExerciseType;
  xpEarned: number;
  wordsCompleted: number;
  totalWords: number;
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

// ─── EXERCISE META & INSIGHTS ─────────────────────────────────────────────────

const EXERCISE_META: Record<ExerciseType, {
  label: string; icon: string; color: string; tag: string; description: string;
  whatItIs: string; whyItMatters: string; whatToLookFor: string; howToHelp: string;
  goodScore: number; milestones: { score: number; label: string }[];
}> = {
  "practice": {
    label: "Word Practice", icon: "🎤", color: COLORS.peony, tag: "Phoneme Articulation",
    description: "Hears & repeats words, AI scores phoneme accuracy",
    whatItIs: "Your child listens to Nova say a word and then repeats it. The AI compares how accurately they produce the target sound against a clinical model.",
    whyItMatters: "Repetitive phoneme practice is the foundation of speech therapy. Research shows that 100-150 accurate repetitions per session significantly accelerates sound acquisition.",
    whatToLookFor: "Look for steady accuracy improvement week over week. Scores above 70% suggest the sound is becoming established.",
    howToHelp: "After sessions, casually use the target words in conversation - don't correct, just model.",
    goodScore: 70,
    milestones: [{ score: 50, label: "Emerging" }, { score: 70, label: "Developing" }, { score: 80, label: "Mastery" }, { score: 90, label: "Automatic" }],
  },
  "blend-it": {
    label: "Blend It!", icon: "🔤", color: COLORS.green, tag: "DTTC · Apraxia",
    description: "Blends phoneme segments together — slow then fast rate",
    whatItIs: "Nova breaks a word into individual sound segments and your child blends them into the full word. Slow and Fast modes train motor planning.",
    whyItMatters: "This targets Childhood Apraxia of Speech using Dynamic Temporal and Tactile Cueing (DTTC), building the brain's motor planning system.",
    whatToLookFor: "Watch for the gap between slow mode and fast mode accuracy. A large gap indicates motor planning difficulty.",
    howToHelp: "Play 'robot talk' at home - say words slowly, syllable by syllable, then speed up together.",
    goodScore: 65,
    milestones: [{ score: 40, label: "Emerging" }, { score: 65, label: "Developing" }, { score: 80, label: "Mastery" }, { score: 90, label: "Fluent" }],
  },
  "rhyme-time": {
    label: "Rhyme Time", icon: "🎵", color: COLORS.streak, tag: "Phonological",
    description: "Tap the word that rhymes — no microphone needed",
    whatItIs: "Nova says a word and your child taps which of three choices rhymes with it. A listening exercise to recognize sound patterns.",
    whyItMatters: "Phonological awareness is one of the strongest predictors of speech development and reading success.",
    whatToLookFor: "High accuracy (80%+) with fast responses suggests strong phonological awareness.",
    howToHelp: "Rhyming games during daily routines are extremely effective: bath time ('soap, rope, hope!').",
    goodScore: 75,
    milestones: [{ score: 50, label: "Emerging" }, { score: 75, label: "Developing" }, { score: 85, label: "Strong" }, { score: 95, label: "Automatic" }],
  },
  "sound-hunt": {
    label: "Sound Hunt", icon: "📍", color: COLORS.blue, tag: "Sound Isolation",
    description: "Find where the target sound lives — start, middle, or end",
    whatItIs: "Your child hears a word and identifies whether the target sound appears at the beginning, middle, or end.",
    whyItMatters: "Sound isolation is a critical phonological skill that bridges perception and production.",
    whatToLookFor: "Compare start vs. middle vs. end accuracy. Most children find word-initial sounds easiest.",
    howToHelp: "Make sound position awareness a game: 'Does RABBIT start with R or end with R?'",
    goodScore: 70,
    milestones: [{ score: 45, label: "Emerging" }, { score: 70, label: "Developing" }, { score: 85, label: "Strong" }, { score: 95, label: "Mastered" }],
  },
  "speak-up": {
    label: "Speak Up!", icon: "🔊", color: COLORS.velvet, tag: "LSVT LOUD",
    description: "Maximum vocal effort training — loudness and clarity",
    whatItIs: "Your child says high-frequency words as loudly and clearly as possible. A visual volume meter gives real-time feedback.",
    whyItMatters: "Many children with motor speech disorders speak quietly not because they're shy, but because their brain underestimates effort needed.",
    whatToLookFor: "The volume meter score is as important as word accuracy. Look for consistent level 3-4.",
    howToHelp: "Practice 'big voice' moments at home: cheering at sports, calling across the house.",
    goodScore: 60,
    milestones: [{ score: 35, label: "Emerging" }, { score: 60, label: "Developing" }, { score: 75, label: "Strong" }, { score: 90, label: "Powerful" }],
  },
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function daysSince(d: string) { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); }
function formatDuration(s: number) { return `${Math.floor(s / 60)}m ${s % 60}s`; }
function accuracyColor(a: number) { return a >= 80 ? COLORS.green : a >= 50 ? COLORS.streak : COLORS.red; }
function computeProjection(sessions: SessionData[]) {
  if (sessions.length < 2) return sessions.map(s => ({ ...s, projected: s.averageAccuracy }));
  const n = sessions.length;
  const delta = sessions[n - 1].averageAccuracy - sessions[n - 2].averageAccuracy;
  return sessions.map((s, i) => ({ ...s, projected: Math.min(100, Math.max(0, Math.round(s.averageAccuracy + delta * (i - n + 2) * 0.4))) }));
}

function Skeleton({ height = 96 }: { height?: number }) {
  return <div style={{ height, borderRadius: 12, background: `linear-gradient(90deg, #E5E5E5, #F5F5F5, #E5E5E5)`, backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />;
}

// ─── EXERCISE DETAIL MODAL ────────────────────────────────────────────────────

function ExerciseModal({ type, sessions, onClose }: { type: ExerciseType; sessions: SessionData[]; onClose: () => void }) {
  const meta = EXERCISE_META[type];
  const typeSessions = sessions.filter(s => s.exerciseType === type);
  const avgAcc = typeSessions.length > 0 ? Math.round(typeSessions.reduce((a, s) => a + s.averageAccuracy, 0) / typeSessions.length) : 0;
  const totalXP = typeSessions.reduce((a, s) => a + s.xpEarned, 0);
  const trend = typeSessions.length >= 2
    ? typeSessions[typeSessions.length - 1].averageAccuracy - typeSessions[0].averageAccuracy
    : 0;

  const currentMilestone = meta.milestones.reduce((prev, m) => avgAcc >= m.score ? m : prev, meta.milestones[0]);
  const nextMilestone = meta.milestones.find(m => m.score > avgAcc);
  const milestoneProgress = nextMilestone
    ? Math.round(((avgAcc - currentMilestone.score) / (nextMilestone.score - currentMilestone.score)) * 100)
    : 100;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(57, 0, 82, 0.4)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }} onClick={onClose}>
      <div style={{
        ...UI.card,
        width: "100%", maxWidth: 640,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: `0 24px 80px rgba(57,0,82,0.2), 0 0 40px ${meta.color}20`,
        padding: 0,
      }} onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ padding: "32px 32px 24px", borderBottom: `1px solid ${COLORS.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "rgba(255,255,255,0.8)" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <span style={{ fontSize: "2rem", background: `${meta.color}15`, padding: "8px 12px", borderRadius: 8 }}>{meta.icon}</span>
              <div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: COLORS.amethyst }}>{meta.label}</div>
                <div style={{ fontSize: "0.8rem", color: meta.color, letterSpacing: "0.05em", fontWeight: 700, textTransform: "uppercase" }}>{meta.tag}</div>
              </div>
            </div>
            <div style={{ fontSize: "1rem", color: COLORS.lavender, fontWeight: 500 }}>{meta.description}</div>
          </div>
          <button onClick={onClose} style={{ background: COLORS.borderLight, border: "none", color: COLORS.amethyst, borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: "1.1rem", fontWeight: 700, flexShrink: 0, transition: "background 0.2s" }} onMouseEnter={e => (e.currentTarget.style.background = COLORS.borderDark)} onMouseLeave={e => (e.currentTarget.style.background = COLORS.borderLight)}>✕</button>
        </div>

        <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[
              { label: "Sessions", value: typeSessions.length, color: meta.color },
              { label: "Avg Accuracy", value: typeSessions.length ? `${avgAcc}%` : "—", color: accuracyColor(avgAcc) },
              { label: "Total XP", value: `${totalXP}`, icon: "⭐", color: COLORS.xp },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{ background: COLORS.white, border: `1px solid ${COLORS.borderLight}`, borderRadius: 12, padding: "16px", textAlign: "center" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color }}>{icon && <span style={{fontSize:"1rem"}}>{icon} </span>}{value}</div>
                <div style={{ fontSize: "0.75rem", color: COLORS.lavender, marginTop: 8, fontWeight: 600, letterSpacing: "0.02em" }}>{label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Milestone progress */}
          <div style={{ background: COLORS.white, border: `1px solid ${COLORS.borderLight}`, borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: COLORS.amethyst }}>Progress Milestone</span>
              <span style={{ fontSize: "0.9rem", color: meta.color, fontWeight: 700 }}>{currentMilestone.label} {nextMilestone ? `→ ${nextMilestone.label}` : "✓ Max"}</span>
            </div>
            <div style={{ height: 12, background: COLORS.borderLight, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${milestoneProgress}%`, background: meta.color, borderRadius: 6, transition: "width 0.8s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
              {meta.milestones.map(m => (
                <span key={m.score} style={{ fontSize: "0.75rem", fontWeight: 600, color: avgAcc >= m.score ? meta.color : COLORS.lavender }}>
                  {m.score}% {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Trend mini chart */}
          {typeSessions.length >= 2 && (
            <div>
              <div style={{ fontSize: "0.9rem", fontWeight: 700, color: COLORS.amethyst, marginBottom: 16 }}>Accuracy Trend</div>
              <div style={{ background: COLORS.white, border: `1px solid ${COLORS.borderLight}`, borderRadius: 12, overflow: "hidden", padding: "20px 20px 0 20px" }}>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={typeSessions} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <XAxis dataKey="date" tick={{ fill: COLORS.lavender, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: COLORS.lavender, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                    <Tooltip cursor={{fill: COLORS.borderLight}} contentStyle={{ background: COLORS.white, border: `1px solid ${COLORS.borderLight}`, borderRadius: 8, fontSize: "0.9rem", fontWeight: 600, color: COLORS.amethyst, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }} />
                    <ReferenceLine y={meta.goodScore} stroke={COLORS.xp} strokeDasharray="4 4" strokeWidth={1} />
                    <Bar dataKey="averageAccuracy" name="Accuracy" fill={meta.color} radius={[4, 4, 0, 0]} opacity={0.9} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: trend >= 0 ? COLORS.green : COLORS.red }}>
                  {trend >= 0 ? "📈" : "📉"} {trend >= 0 ? "+" : ""}{trend.toFixed(0)}% overall trend
                </span>
              </div>
            </div>
          )}

          {/* 4 insight sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "🔬", title: "What Is This Exercise?", text: meta.whatItIs, color: meta.color },
              { icon: "💡", title: "Why It Matters", text: meta.whyItMatters, color: COLORS.amethyst },
              { icon: "👀", title: "What To Look For", text: meta.whatToLookFor, color: COLORS.streak },
              { icon: "🏠", title: "How You Can Help At Home", text: meta.howToHelp, color: COLORS.green },
            ].map(({ icon, title, text, color }) => (
              <div key={title} style={{ background: COLORS.white, border: `1px solid ${COLORS.borderLight}`, borderRadius: 12, padding: 20, borderLeft: `4px solid ${color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: "1.2rem" }}>{icon}</span>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color }}>{title}</span>
                </div>
                <p style={{ fontSize: "0.9rem", color: COLORS.lavender, lineHeight: 1.6, fontWeight: 500 }}>{text}</p>
              </div>
            ))}
          </div>

          {/* No sessions yet */}
          {typeSessions.length === 0 && (
            <div style={{ textAlign: "center", padding: 32, color: COLORS.lavender, fontSize: "1rem", fontWeight: 600 }}>
              Your child hasn&apos;t tried this exercise yet. It will appear on the dashboard once they do.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── EXERCISE BREAKDOWN ───────────────────────────────────────────────────────

function ExerciseBreakdown({ sessions, loading, onSelect }: { sessions: SessionData[]; loading: boolean; onSelect: (t: ExerciseType) => void }) {
  if (loading) return <Skeleton height={200} />;
  const counts: Partial<Record<ExerciseType, { count: number; totalAcc: number; totalXP: number }>> = {};
  sessions.forEach(s => {
    if (!counts[s.exerciseType]) counts[s.exerciseType] = { count: 0, totalAcc: 0, totalXP: 0 };
    counts[s.exerciseType]!.count++;
    counts[s.exerciseType]!.totalAcc += s.averageAccuracy;
    counts[s.exerciseType]!.totalXP += s.xpEarned;
  });

  return (
    <div style={UI.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: COLORS.amethyst }}>Exercise Breakdown</div>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: COLORS.lavender }}>Click cards for detailed insights</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
        {(Object.entries(EXERCISE_META) as [ExerciseType, typeof EXERCISE_META[ExerciseType]][]).map(([type, meta]) => {
          const data = counts[type];
          return (
            <button key={type} onClick={() => onSelect(type)} style={{
              background: data ? COLORS.white : COLORS.parchment,
              border: `1px solid ${data ? meta.color : COLORS.borderLight}`,
              borderRadius: 12, padding: "16px",
              opacity: data ? 1 : 0.7, cursor: "pointer",
              textAlign: "left", transition: "transform 0.1s, box-shadow 0.1s",
            }}
              onMouseEnter={e => { if(data){ (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${meta.color}15`; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: "1.4rem", background: `${meta.color}15`, padding: "4px 8px", borderRadius: 8 }}>{meta.icon}</span>
                  <span style={{ fontSize: "1rem", fontWeight: 700, color: data ? COLORS.amethyst : COLORS.lavender }}>{meta.label}</span>
                </div>
              </div>
              <div style={{ fontSize: "0.8rem", color: COLORS.lavender, marginBottom: 16, fontWeight: 500, lineHeight: 1.4 }}>{meta.description}</div>
              {data ? (
                <div style={{ display: "flex", gap: 12, borderTop: `1px solid ${COLORS.borderLight}`, paddingTop: 12 }}>
                  <div><div style={{ fontSize: "1.1rem", fontWeight: 700, color: COLORS.amethyst }}>{data.count}</div><div style={{ fontSize: "0.6rem", fontWeight: 600, color: COLORS.lavender }}>SESSIONS</div></div>
                  <div><div style={{ fontSize: "1.1rem", fontWeight: 700, color: accuracyColor(Math.round(data.totalAcc / data.count)) }}>{Math.round(data.totalAcc / data.count)}%</div><div style={{ fontSize: "0.6rem", fontWeight: 600, color: COLORS.lavender }}>AVG ACC</div></div>
                  <div><div style={{ fontSize: "1.1rem", fontWeight: 700, color: COLORS.xp }}>{data.totalXP}</div><div style={{ fontSize: "0.6rem", fontWeight: 600, color: COLORS.lavender }}>XP</div></div>
                </div>
              ) : <div style={{ fontSize: "0.75rem", fontWeight: 600, color: COLORS.lavender, background: COLORS.borderLight, padding: "6px 10px", borderRadius: 8, display: "inline-block" }}>No data recorded</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── TOP BAR ─────────────────────────────────────────────────────────────────

function TopBar({ onPrint }: { onPrint: () => void }) {
  return (
    <header style={{ 
      background: COLORS.white, 
      borderBottom: `1px solid ${COLORS.borderLight}`, 
      position: "sticky", top: 0, zIndex: 50, 
      padding: "0 24px", 
      display: "flex", alignItems: "center", justifyContent: "space-between", 
      height: 64 
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ 
          width: 36, height: 36, borderRadius: 8, 
          background: COLORS.velvet, 
          display: "flex", alignItems: "center", justifyContent: "center", 
          fontSize: 18, fontWeight: 700, color: COLORS.white,
        }}>A</div>
        <div>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: COLORS.amethyst, lineHeight: 1 }}>ArtiCue</div>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: COLORS.lavender, letterSpacing: "0.05em" }}>Parent Dashboard</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <ChangeUserButton />
        <Link href="/Parent/chatbot" style={{
          background: COLORS.white, border: `1px solid ${COLORS.borderLight}`,
          color: COLORS.amethyst, borderRadius: 8, padding: "8px 16px",
          fontSize: "0.9rem", fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8, textDecoration: "none",
          transition: "background 0.1s"
        }}>
          📚 Research
        </Link>
        <button onClick={onPrint} style={{ 
          background: COLORS.white, border: `1px solid ${COLORS.borderLight}`,
          color: COLORS.amethyst, borderRadius: 8, padding: "8px 16px", 
          fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", 
          display: "flex", alignItems: "center", gap: 8, transition: "background 0.1s",
          fontFamily: "inherit",
        }} onMouseEnter={e => e.currentTarget.style.background = COLORS.parchment} 
           onMouseLeave={e => e.currentTarget.style.background = COLORS.white}>
          Share Data
        </button>
        <ModeSwitcher />
      </div>
    </header>
  );
}

function ChildProfileCard({ profile, loading }: { profile: ChildProfile | null; loading: boolean }) {
  if (loading) return <Skeleton height={140} />;
  if (!profile) return null;
  return (
    <div style={{ ...UI.card, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ 
          width: 80, height: 80, borderRadius: "50%", 
          background: COLORS.parchment, border: `2px solid ${COLORS.blue}`, 
          display: "flex", alignItems: "center", justifyContent: "center", 
          fontSize: "2.5rem",
        }}>👦🏽</div>
        <div>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: COLORS.amethyst, lineHeight: 1 }}>{profile.name}</div>
          <div style={{ color: COLORS.lavender, fontSize: "1rem", fontWeight: 500, marginTop: 6 }}>Age {profile.age} • Practiced {daysSince(profile.lastSessionDate)} day{daysSince(profile.lastSessionDate) !== 1 ? "s" : ""} ago</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: COLORS.amethyst, alignSelf: "center", marginRight: 4 }}>TARGETS:</span>
            {profile.targetSounds.map(s => <span key={s} style={UI.pill}>/{s}/</span>)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16 }}>
        {[
          { icon: "🔥", val: profile.streak, label: "Day Streak", color: COLORS.streak }, 
          { icon: "⭐", val: profile.totalXP.toLocaleString(), label: "Total XP", color: COLORS.xp }
        ].map(({ icon, val, label, color }) => (
          <div key={label} style={{ textAlign: "center", background: COLORS.parchment, padding: "16px 24px", borderRadius: 12, border: `1px solid ${COLORS.borderLight}` }}>
            <div style={{ fontSize: "2rem", lineHeight: 1 }}>{icon}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color, marginTop: 8 }}>{val}</div>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: COLORS.lavender, letterSpacing: "0.02em", marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressSummary({ profile, progress, loading }: { profile: ChildProfile | null; progress: ProgressData | null; loading: boolean }) {
  const stats = [
    { icon: "🔥", label: "Day Streak", value: profile?.streak ?? "—", color: COLORS.streak },
    { icon: "⭐", label: "Total XP", value: profile?.totalXP?.toLocaleString() ?? "—", color: COLORS.xp },
    { icon: "📅", label: "Sessions (Week)", value: progress?.sessionsThisWeek ?? "—", color: COLORS.blue },
    { icon: "🎯", label: "Best Accuracy", value: progress?.bestAccuracyThisWeek ? `${progress.bestAccuracyThisWeek}%` : "—", color: COLORS.green },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
      {stats.map(({ icon, label, value, color }) => loading ? <Skeleton key={label} height={120} /> : (
        <div key={label} style={{ 
          ...UI.card, 
          padding: 20, 
          borderLeft: `4px solid ${color}`,
          display: "flex", flexDirection: "column", justifyContent: "space-between"
        }}>
          <div style={{ fontSize: "1.6rem" }}>{icon}</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: COLORS.amethyst, lineHeight: 1.1, marginTop: 12 }}>{value}</div>
          <div style={{ fontSize: "0.8rem", fontWeight: 600, color: COLORS.lavender, letterSpacing: "0.02em", marginTop: 4 }}>{label.toUpperCase()}</div>
        </div>
      ))}
    </div>
  );
}

function SoundSelector({ sounds, selected, onChange }: { sounds: string[]; selected: string; onChange: (s: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      {sounds.map(sound => (
        <button key={sound} onClick={() => onChange(sound)} style={{ 
          padding: "8px 24px", 
          background: selected === sound ? COLORS.blue : COLORS.white,
          border: selected === sound ? `1px solid #1899d6` : `1px solid ${COLORS.borderLight}`,
          borderRadius: 8,
          cursor: "pointer", fontSize: "1.1rem", fontWeight: 600, 
          color: selected === sound ? COLORS.white : COLORS.lavender, 
          transition: "all 0.1s" 
        }}>
          /{sound}/
        </button>
      ))}
    </div>
  );
}

function PredictionCard({ progress, loading }: { progress: ProgressData | null; loading: boolean }) {
  if (loading) return <Skeleton height={120} />;
  if (!progress) return null;
  const trendIcon = progress.trend === "improving" ? "📈" : progress.trend === "plateau" ? "➡️" : "📊";
  const trendLabel = { improving: "Improving", plateau: "Plateau", inconsistent: "Inconsistent" }[progress.trend] ?? progress.trend;
  return (
    <div style={{ 
      ...UI.card, border: `1px solid ${COLORS.velvet}`,
      display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24, 
      background: COLORS.white
    }}>
      <div>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: COLORS.velvet, letterSpacing: "0.05em", marginBottom: 8 }}>PREDICTED MASTERY</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: "3rem", fontWeight: 700, color: COLORS.amethyst, lineHeight: 1 }}>{progress.weeksToMastery}</span>
          <span style={{ color: COLORS.lavender, fontSize: "1.1rem", fontWeight: 600 }}>weeks</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <span style={{fontSize: "1.1rem"}}>{trendIcon}</span>
          <span style={{ color: COLORS.green, fontSize: "0.95rem", fontWeight: 600 }}>{trendLabel}</span>
        </div>
      </div>
      <div style={{ 
        maxWidth: 420, color: COLORS.amethyst, fontSize: "0.95rem", fontWeight: 500, lineHeight: 1.5, 
        background: COLORS.parchment, borderRadius: 8, padding: "16px 20px", 
        borderLeft: `4px solid ${COLORS.xp}`
      }}>
        ⭐ {progress.insight}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: COLORS.white, border: `1px solid ${COLORS.borderLight}`, borderRadius: 8, padding: "12px 16px", fontSize: "0.9rem", color: COLORS.amethyst, fontWeight: 600, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: COLORS.lavender }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ color: p.color, marginTop: 4 }}>{p.name}: <strong style={{fontSize: "1.1rem"}}>{p.value}%</strong></div>)}
    </div>
  );
}

function AccuracyChart({ sessions, sound, loading }: { sessions: SessionData[]; sound: string; loading: boolean }) {
  if (loading) return <Skeleton height={280} />;
  const data = computeProjection(sessions);
  return (
    <div style={UI.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: "1.2rem", fontWeight: 700, color: COLORS.amethyst }}>Accuracy Over Time — <span style={{ color: COLORS.blue }}>/{sound}/</span></div>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: COLORS.lavender, marginTop: 4 }}>Combined overall performance</div>
        </div>
        <div style={{ 
          display: "flex", alignItems: "center", gap: 8, 
          background: "rgba(255, 200, 0, 0.1)", border: `1px solid ${COLORS.xp}`, 
          borderRadius: 8, padding: "8px 12px", fontSize: "0.85rem", fontWeight: 600, color: "#b38b00" 
        }} title="80% accuracy is the standard SLP threshold for sound mastery.">
          🎯 80% Mastery Goal ⓘ
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={COLORS.borderLight} />
          <XAxis dataKey="date" tick={{ fill: COLORS.lavender, fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
          <YAxis domain={[0, 100]} tick={{ fill: COLORS.lavender, fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} dx={-10} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: COLORS.borderLight, strokeWidth: 1 }} />
          <ReferenceLine y={80} stroke={COLORS.xp} strokeDasharray="5 4" strokeWidth={2} label={{ value: "Mastery", fill: "#b38b00", fontSize: 11, fontWeight: 600, position: "right" }} />
          <Line type="monotone" dataKey="averageAccuracy" name="Accuracy" stroke={COLORS.blue} strokeWidth={3} dot={{ fill: COLORS.white, stroke: COLORS.blue, strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: COLORS.blue }} />
          <Line type="monotone" dataKey="projected" name="Projected" stroke={COLORS.lavender} strokeDasharray="4 4" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function SessionHistory({ sessions, loading }: { sessions: SessionData[]; loading: boolean }) {
  if (loading) return <Skeleton height={240} />;
  const recent = [...sessions].reverse().slice(0, 10);
  return (
    <div style={{ ...UI.card, overflow: "hidden", padding: "24px 0" }}>
      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: COLORS.amethyst, marginBottom: 16, padding: "0 24px" }}>Recent Sessions</div>
      <div style={{ overflowX: "auto", padding: "0 24px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem", fontWeight: 500 }}>
          <thead>
            <tr>{["Date", "Exercise", "Sound", "Completed", "Accuracy", "XP Earned", "Time"].map(h => (
              <th key={h} style={{ textAlign: "left", color: COLORS.lavender, fontWeight: 600, letterSpacing: "0.02em", fontSize: "0.8rem", textTransform: "uppercase", padding: "0 12px 12px", borderBottom: `2px solid ${COLORS.borderLight}` }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {recent.map((s, i) => {
              const meta = EXERCISE_META[s.exerciseType];
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.borderLight}` }}>
                  <td style={{ padding: "16px 12px", color: COLORS.amethyst }}>{s.date}</td>
                  <td style={{ padding: "16px 12px" }}>
                    <span style={{ 
                      display: "inline-flex", alignItems: "center", gap: 6, 
                      background: `${meta.color}15`, border: `1px solid ${meta.color}50`, 
                      color: meta.color, borderRadius: 8, padding: "4px 12px", fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap" 
                    }}>{meta.icon} {meta.label}</span>
                  </td>
                  <td style={{ padding: "16px 12px" }}>
                    <span style={{ background: COLORS.borderLight, color: COLORS.amethyst, borderRadius: 8, padding: "4px 12px", fontSize: "0.85rem", fontWeight: 600 }}>/{s.targetSound}/</span>
                  </td>
                  <td style={{ padding: "16px 12px", color: COLORS.lavender }}>{s.wordsCompleted} / {s.totalWords}</td>
                  <td style={{ padding: "16px 12px" }}>
                    <span style={{ color: accuracyColor(s.averageAccuracy), fontWeight: 700, fontSize: "1rem" }}>{s.averageAccuracy}%</span>
                    <div style={{ height: 4, width: `${s.averageAccuracy}%`, maxWidth: 64, background: accuracyColor(s.averageAccuracy), borderRadius: 2, marginTop: 4, opacity: 0.9 }} />
                  </td>
                  <td style={{ padding: "16px 12px", color: COLORS.xp, fontWeight: 700, fontSize: "1rem" }}>+{s.xpEarned}</td>
                  <td style={{ padding: "16px 12px", color: COLORS.lavender }}>{formatDuration(s.durationSeconds)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ParentDashboard() {
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [selectedSound, setSelectedSound] = useState("r");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [activeModal, setActiveModal] = useState<ExerciseType | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, progressRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/progress"),
        ]);
        const { profile: p } = await profileRes.json();
        const prog = await progressRes.json();
        setProfile(p);
        setProgress(prog);
        if (p?.targetSounds?.length) {
          setSelectedSound(p.targetSounds[0]);
        }
      } catch (e) {
        console.error("Failed to load profile/progress", e);
      } finally {
        setLoadingProfile(false);
        setLoadingSessions(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!profile) return;
    setLoadingSessions(true);
    async function loadSessions() {
      try {
        const res = await fetch(`/api/session?sound=${selectedSound}`);
        const { sessions: s } = await res.json();
        setSessions(s ?? []);
      } catch (e) {
        console.error("Failed to load sessions", e);
        setSessions([]);
      } finally {
        setLoadingSessions(false);
      }
    }
    loadSessions();
  }, [selectedSound, profile]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:${COLORS.pageBg};color:${COLORS.amethyst};font-family:'Nunito',sans-serif}
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: ${COLORS.pageBg}; }
        ::-webkit-scrollbar-thumb { background: #D0D0D0; border-radius: 8px; border: 2px solid ${COLORS.pageBg}; }
        ::-webkit-scrollbar-thumb:hover { background: #B0B0B0; }
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @media print{header{display:none!important}body{background:white!important;color:black!important}}
      `}</style>

      {activeModal && (
        <ExerciseModal
          type={activeModal}
          sessions={sessions}
          onClose={() => setActiveModal(null)}
        />
      )}

      <div style={{ minHeight: "100vh", paddingBottom: 64 }}>
        <TopBar onPrint={() => window.print()} />
        <main style={{ maxWidth: 1024, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ animation: "fadeUp 0.3s ease both" }}><ChildProfileCard profile={profile} loading={loadingProfile} /></div>
          
          <div style={{ animation: "fadeUp 0.3s ease 0.05s both", display: "flex", flexDirection: "column", gap: 12 }}>
             <h2 style={{fontSize: "1.2rem", fontWeight: 700, color: COLORS.amethyst, paddingLeft: 4}}>Weekly Overview</h2>
             <ProgressSummary profile={profile} progress={progress} loading={loadingProfile} />
          </div>

          <div style={{ animation: "fadeUp 0.3s ease 0.1s both" }}>
            <ExerciseBreakdown sessions={sessions} loading={loadingSessions} onSelect={setActiveModal} />
          </div>
          
          {!loadingProfile && profile && (
            <div style={{ animation: "fadeUp 0.3s ease 0.15s both", background: COLORS.white, padding: "20px 24px", borderRadius: 12, border: `1px solid ${COLORS.borderLight}` }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: COLORS.amethyst, marginBottom: 12 }}>Target Sounds</div>
              <SoundSelector sounds={profile.targetSounds} selected={selectedSound} onChange={setSelectedSound} />
            </div>
          )}
          
          <div style={{ animation: "fadeUp 0.3s ease 0.2s both" }}><PredictionCard progress={progress} loading={loadingProfile} /></div>
          
          <div style={{ animation: "fadeUp 0.3s ease 0.25s both" }}><AccuracyChart sessions={sessions} sound={selectedSound} loading={loadingSessions} /></div>
          
          <div style={{ animation: "fadeUp 0.3s ease 0.3s both" }}><SessionHistory sessions={sessions} loading={loadingSessions} /></div>
        </main>
      </div>
    </>
  );
}
