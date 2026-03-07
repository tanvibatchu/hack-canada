"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar,
} from "recharts";

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
    label: "Word Practice", icon: "🎤", color: "#a78bfa", tag: "Phoneme Articulation",
    description: "Hears & repeats words, AI scores phoneme accuracy",
    whatItIs: "Your child listens to Nova say a word and then repeats it. The AI compares how accurately they produce the target sound (like 'r' in 'rabbit') against a clinical model.",
    whyItMatters: "Repetitive phoneme practice is the foundation of speech therapy. Research shows that 100–150 accurate repetitions per session significantly accelerates sound acquisition. This exercise directly builds the muscle memory needed for automatic, natural speech.",
    whatToLookFor: "Look for steady accuracy improvement week over week. Scores above 70% suggest the sound is becoming established. Plateaus are normal — they often precede a breakthrough. Pay attention to which specific words score lower, as they reveal where the sound breaks down.",
    howToHelp: "After sessions, casually use the target words in conversation — don't correct, just model. E.g., if practicing 'r', say 'Look at that rainbow!' This natural exposure reinforces what was practiced without pressure.",
    goodScore: 70,
    milestones: [{ score: 50, label: "Emerging" }, { score: 70, label: "Developing" }, { score: 80, label: "Mastery" }, { score: 90, label: "Automatic" }],
  },
  "blend-it": {
    label: "Blend It!", icon: "🔤", color: "#34d399", tag: "DTTC · Childhood Apraxia",
    description: "Blends phoneme segments together — slow then fast rate",
    whatItIs: "Nova breaks a word into individual sound segments (e.g., 'r'... 'ai'... 'n') and your child blends them into the full word. The exercise uses two speed modes: Slow (DTTC Level 1) and Fast (ReST training).",
    whyItMatters: "This exercise targets Childhood Apraxia of Speech (CAS) using Dynamic Temporal and Tactile Cueing (DTTC), one of the most evidence-supported treatments for CAS. The slow→fast progression trains the brain's motor planning system — the same system that breaks down in apraxia. Research by Strand et al. (2006) shows DTTC produces the fastest gains of any apraxia intervention.",
    whatToLookFor: "Watch for the gap between slow mode and fast mode accuracy. A large gap (e.g., 90% slow vs. 45% fast) indicates motor planning difficulty — the child can produce sounds in isolation but struggles with transitions. This is classic CAS and should be shared with your SLP.",
    howToHelp: "Play 'robot talk' at home — say words slowly, syllable by syllable, then speed up together. This reinforces the slow→fast pattern in a fun, low-pressure way. E.g., 'rub-ber' → 'rubber!'",
    goodScore: 65,
    milestones: [{ score: 40, label: "Emerging" }, { score: 65, label: "Developing" }, { score: 80, label: "Mastery" }, { score: 90, label: "Fluent" }],
  },
  "rhyme-time": {
    label: "Rhyme Time", icon: "🎵", color: "#fb923c", tag: "Phonological Awareness",
    description: "Tap the word that rhymes — no microphone needed",
    whatItIs: "Nova says a word and your child taps which of three choices rhymes with it. This is a listening and thinking exercise — no speaking required, just recognizing sound patterns.",
    whyItMatters: "Phonological awareness — the ability to hear and manipulate sound patterns — is one of the strongest predictors of both speech development and reading success. Research consistently shows that children who struggle with rhyming are at higher risk for dyslexia and reading difficulties. This exercise trains the ear before the mouth.",
    whatToLookFor: "High accuracy (80%+) with fast responses suggests strong phonological awareness. Slow responses even when correct may indicate the child is using letter knowledge rather than sound intuition — a subtle but important difference. Consistent confusion between specific sound pairs (e.g., 'at' vs. 'ot') can pinpoint specific phonological gaps.",
    howToHelp: "Rhyming games during daily routines are extremely effective: bath time ('soap, rope, hope!'), car rides ('I spy something that rhymes with car — star!'). Even nonsense rhymes count — 'cat, bat, zat!' Children don't need to know the words are real to benefit.",
    goodScore: 75,
    milestones: [{ score: 50, label: "Emerging" }, { score: 75, label: "Developing" }, { score: 85, label: "Strong" }, { score: 95, label: "Automatic" }],
  },
  "sound-hunt": {
    label: "Sound Hunt", icon: "📍", color: "#60a5fa", tag: "Sound Isolation · SFA",
    description: "Find where the target sound lives — start, middle, or end",
    whatItIs: "Your child hears a word and identifies whether the target sound appears at the beginning, middle, or end. A hint system using Semantic Feature Analysis (SFA) reveals category, function, and attribute clues if needed.",
    whyItMatters: "Sound isolation — knowing WHERE a sound is in a word — is a critical phonological skill that bridges perception and production. Children who can't isolate sounds struggle to self-correct their speech. The SFA hint system is adapted from gold-standard aphasia therapy (Boyle & Coelho, 1995) and strengthens semantic-phonological connections that support word retrieval and reading.",
    whatToLookFor: "Compare start vs. middle vs. end accuracy. Most children find word-initial sounds easiest and medial sounds hardest — this is developmentally normal. If your child consistently misses end-position sounds, this may indicate final consonant deletion, a common phonological process worth noting for your SLP. Track hint usage — decreasing hints over time shows growing independence.",
    howToHelp: "Make sound position awareness a game: 'Does RABBIT start with R or end with R?' Use physical gestures — tap your head for start, tummy for middle, knees for end. This multi-sensory approach matches the SFA therapy principles in the exercise.",
    goodScore: 70,
    milestones: [{ score: 45, label: "Emerging" }, { score: 70, label: "Developing" }, { score: 85, label: "Strong" }, { score: 95, label: "Mastered" }],
  },
  "speak-up": {
    label: "Speak Up!", icon: "🔊", color: "#f472b6", tag: "LSVT LOUD · Dysarthria",
    description: "Maximum vocal effort training — loudness and clarity",
    whatItIs: "Your child says high-frequency words (GO, WOW, YEAH) as loudly and clearly as possible. A visual volume meter gives real-time feedback. This is adapted from LSVT LOUD (Lee Silverman Voice Treatment), the most evidence-based therapy for voice and motor speech disorders.",
    whyItMatters: "Many children with motor speech disorders (dysarthria, hypotonia) speak quietly not because they're shy, but because their brain underestimates how much effort is needed. LSVT LOUD recalibrates this — training the child to use maximum vocal effort until it becomes the new normal. Studies by Boliek et al. (2010) show significant, lasting improvements in speech clarity and intelligibility.",
    whatToLookFor: "The volume meter score is as important as word accuracy. Look for the child consistently hitting levels 3–4. If they reach level 4 but accuracy drops, they're prioritizing loudness over clarity — this is expected initially and will self-correct. If both scores are low, the child may need more respiratory support exercises.",
    howToHelp: "Practice 'big voice' moments at home: cheering at sports, calling across the house, reading aloud dramatically. Celebrate loud, clear speech without making it feel like a correction. Never tell a dysarthric child to 'speak up' without the fun context — it creates pressure. The game format removes that pressure.",
    goodScore: 60,
    milestones: [{ score: 35, label: "Emerging" }, { score: 60, label: "Developing" }, { score: 75, label: "Strong" }, { score: 90, label: "Powerful" }],
  },
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_PROFILE: ChildProfile = {
  name: "Liam", age: 7, targetSounds: ["r", "s", "th"],
  streak: 12, lastSessionDate: "2026-03-06", totalXP: 3840,
};
const MOCK_PROGRESS: ProgressData = {
  sessionsThisWeek: 5, bestAccuracyThisWeek: 91, weeksToMastery: 3, trend: "improving",
  insight: "Liam is making excellent progress on the 'r' sound. Consistent daily practice is accelerating improvement beyond the initial forecast.",
};
const MOCK_SESSIONS: Record<string, SessionData[]> = {
  r: [
    { date: "Feb 14", durationSeconds: 420, targetSound: "r", averageAccuracy: 54, exerciseType: "practice",   xpEarned: 40, wordsCompleted: 4, totalWords: 8, attempts: [] },
    { date: "Feb 17", durationSeconds: 380, targetSound: "r", averageAccuracy: 61, exerciseType: "blend-it",   xpEarned: 50, wordsCompleted: 5, totalWords: 6, attempts: [] },
    { date: "Feb 20", durationSeconds: 510, targetSound: "r", averageAccuracy: 58, exerciseType: "sound-hunt", xpEarned: 30, wordsCompleted: 3, totalWords: 8, attempts: [] },
    { date: "Feb 23", durationSeconds: 460, targetSound: "r", averageAccuracy: 67, exerciseType: "rhyme-time", xpEarned: 60, wordsCompleted: 6, totalWords: 8, attempts: [] },
    { date: "Feb 26", durationSeconds: 490, targetSound: "r", averageAccuracy: 73, exerciseType: "practice",   xpEarned: 70, wordsCompleted: 7, totalWords: 8, attempts: [] },
    { date: "Mar 01", durationSeconds: 530, targetSound: "r", averageAccuracy: 78, exerciseType: "blend-it",   xpEarned: 60, wordsCompleted: 6, totalWords: 6, attempts: [] },
    { date: "Mar 04", durationSeconds: 500, targetSound: "r", averageAccuracy: 82, exerciseType: "speak-up",   xpEarned: 60, wordsCompleted: 6, totalWords: 6, attempts: [] },
    { date: "Mar 06", durationSeconds: 470, targetSound: "r", averageAccuracy: 88, exerciseType: "practice",   xpEarned: 80, wordsCompleted: 8, totalWords: 8, attempts: [] },
  ],
  s: [
    { date: "Feb 15", durationSeconds: 360, targetSound: "s", averageAccuracy: 71, exerciseType: "practice",   xpEarned: 50, wordsCompleted: 5, totalWords: 8, attempts: [] },
    { date: "Feb 19", durationSeconds: 400, targetSound: "s", averageAccuracy: 75, exerciseType: "sound-hunt", xpEarned: 60, wordsCompleted: 6, totalWords: 8, attempts: [] },
    { date: "Feb 22", durationSeconds: 430, targetSound: "s", averageAccuracy: 70, exerciseType: "rhyme-time", xpEarned: 50, wordsCompleted: 5, totalWords: 8, attempts: [] },
    { date: "Feb 25", durationSeconds: 410, targetSound: "s", averageAccuracy: 79, exerciseType: "practice",   xpEarned: 70, wordsCompleted: 7, totalWords: 8, attempts: [] },
    { date: "Mar 02", durationSeconds: 450, targetSound: "s", averageAccuracy: 83, exerciseType: "blend-it",   xpEarned: 60, wordsCompleted: 6, totalWords: 6, attempts: [] },
    { date: "Mar 05", durationSeconds: 390, targetSound: "s", averageAccuracy: 87, exerciseType: "speak-up",   xpEarned: 60, wordsCompleted: 6, totalWords: 6, attempts: [] },
  ],
  th: [
    { date: "Feb 18", durationSeconds: 300, targetSound: "th", averageAccuracy: 38, exerciseType: "practice",   xpEarned: 20, wordsCompleted: 2, totalWords: 8, attempts: [] },
    { date: "Feb 22", durationSeconds: 340, targetSound: "th", averageAccuracy: 42, exerciseType: "sound-hunt", xpEarned: 30, wordsCompleted: 3, totalWords: 8, attempts: [] },
    { date: "Feb 27", durationSeconds: 360, targetSound: "th", averageAccuracy: 39, exerciseType: "rhyme-time", xpEarned: 30, wordsCompleted: 3, totalWords: 8, attempts: [] },
    { date: "Mar 03", durationSeconds: 380, targetSound: "th", averageAccuracy: 48, exerciseType: "blend-it",   xpEarned: 40, wordsCompleted: 4, totalWords: 6, attempts: [] },
    { date: "Mar 06", durationSeconds: 410, targetSound: "th", averageAccuracy: 55, exerciseType: "practice",   xpEarned: 50, wordsCompleted: 5, totalWords: 8, attempts: [] },
  ],
};

// ─── UTILITIES ────────────────────────────────────────────────────────────────

function daysSince(d: string) { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000); }
function formatDuration(s: number) { return `${Math.floor(s / 60)}m ${s % 60}s`; }
function accuracyColor(a: number) { return a >= 80 ? "#4ade80" : a >= 50 ? "#facc15" : "#f87171"; }
function computeProjection(sessions: SessionData[]) {
  if (sessions.length < 2) return sessions.map(s => ({ ...s, projected: s.averageAccuracy }));
  const n = sessions.length;
  const delta = sessions[n - 1].averageAccuracy - sessions[n - 2].averageAccuracy;
  return sessions.map((s, i) => ({ ...s, projected: Math.min(100, Math.round(s.averageAccuracy + delta * (i - n + 2) * 0.4)) }));
}

function Skeleton({ height = 96 }: { height?: number }) {
  return <div style={{ height, borderRadius: 12, background: "linear-gradient(90deg,#1e1340,#2a1d5c,#1e1340)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />;
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
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
    }} onClick={onClose}>
      <div style={{
        background: "linear-gradient(160deg,#0f0830,#12093a)",
        border: `1px solid ${meta.color}40`,
        borderRadius: 20, width: "100%", maxWidth: 640,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 40px ${meta.color}20`,
      }} onClick={e => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ padding: "1.5rem 1.75rem", borderBottom: `1px solid ${meta.color}25`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: "1.8rem" }}>{meta.icon}</span>
              <div>
                <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.4rem", color: "#f3f0ff" }}>{meta.label}</div>
                <div style={{ fontSize: "0.7rem", color: meta.color, letterSpacing: "0.1em", fontWeight: 700 }}>{meta.tag}</div>
              </div>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>{meta.description}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#9ca3af", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: "1rem", flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.75rem" }}>
            {[
              { label: "Sessions", value: typeSessions.length, color: meta.color },
              { label: "Avg Accuracy", value: typeSessions.length ? `${avgAcc}%` : "—", color: accuracyColor(avgAcc) },
              { label: "Total XP", value: `⭐ ${totalXP}`, color: "#facc15" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "0.9rem", textAlign: "center" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color, fontFamily: "'DM Serif Display',serif" }}>{value}</div>
                <div style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: 3 }}>{label.toUpperCase()}</div>
              </div>
            ))}
          </div>

          {/* Milestone progress */}
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${meta.color}25`, borderRadius: 12, padding: "1rem 1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#e2d9f3" }}>Progress Milestone</span>
              <span style={{ fontSize: "0.8rem", color: meta.color, fontWeight: 700 }}>{currentMilestone.label} {nextMilestone ? `→ ${nextMilestone.label}` : "✓ Max level!"}</span>
            </div>
            <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${milestoneProgress}%`, background: `linear-gradient(90deg,${meta.color}80,${meta.color})`, borderRadius: 4, transition: "width 0.8s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              {meta.milestones.map(m => (
                <span key={m.score} style={{ fontSize: "0.65rem", color: avgAcc >= m.score ? meta.color : "#4b5563" }}>
                  {m.score}% {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Trend mini chart */}
          {typeSessions.length >= 2 && (
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#9ca3af", marginBottom: 8, letterSpacing: "0.06em" }}>ACCURACY TREND</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={typeSessions} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <XAxis dataKey="date" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip contentStyle={{ background: "rgba(15,10,40,0.95)", border: `1px solid ${meta.color}40`, borderRadius: 8, fontSize: "0.78rem" }} />
                  <ReferenceLine y={meta.goodScore} stroke="#facc15" strokeDasharray="4 3" strokeWidth={1} />
                  <Bar dataKey="averageAccuracy" name="Accuracy" fill={meta.color} radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: "0.75rem", color: trend >= 0 ? "#4ade80" : "#f87171" }}>
                  {trend >= 0 ? "📈" : "📉"} {trend >= 0 ? "+" : ""}{trend.toFixed(0)}% overall trend
                </span>
              </div>
            </div>
          )}

          {/* 4 insight sections */}
          {[
            { icon: "🔬", title: "What Is This Exercise?", text: meta.whatItIs, color: meta.color },
            { icon: "💡", title: "Why It Matters", text: meta.whyItMatters, color: "#a78bfa" },
            { icon: "👀", title: "What To Look For", text: meta.whatToLookFor, color: "#facc15" },
            { icon: "🏠", title: "How You Can Help At Home", text: meta.howToHelp, color: "#4ade80" },
          ].map(({ icon, title, text, color }) => (
            <div key={title} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}20`, borderRadius: 12, padding: "1rem 1.25rem", borderLeft: `3px solid ${color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: "1rem" }}>{icon}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color }}>{title}</span>
              </div>
              <p style={{ fontSize: "0.84rem", color: "#c4b5fd", lineHeight: 1.65 }}>{text}</p>
            </div>
          ))}

          {/* No sessions yet */}
          {typeSessions.length === 0 && (
            <div style={{ textAlign: "center", padding: "1rem", color: "#6b7280", fontSize: "0.85rem" }}>
              Your child hasn&apos;t tried this exercise yet. It will appear on the dashboard once they do!
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
    <div style={{ background: "rgba(15,10,40,0.6)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 16, padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ fontFamily: "'DM Serif Display',serif", color: "#e2d9f3", fontSize: "1.1rem" }}>Exercise Breakdown</div>
        <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>Click any card for in-depth insights</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: "0.75rem" }}>
        {(Object.entries(EXERCISE_META) as [ExerciseType, typeof EXERCISE_META[ExerciseType]][]).map(([type, meta]) => {
          const data = counts[type];
          return (
            <button key={type} onClick={() => onSelect(type)} style={{
              background: data ? `${meta.color}0a` : "rgba(255,255,255,0.02)",
              border: `1px solid ${data ? meta.color + "35" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 12, padding: "0.9rem 1rem",
              borderLeft: `3px solid ${data ? meta.color : "rgba(255,255,255,0.1)"}`,
              opacity: data ? 1 : 0.55, cursor: "pointer",
              textAlign: "left", transition: "all 0.18s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${meta.color}20`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: "1.1rem" }}>{meta.icon}</span>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: data ? meta.color : "#6b7280" }}>{meta.label}</span>
                </div>
                <span style={{ fontSize: "0.65rem", color: data ? meta.color : "#4b5563", opacity: 0.7 }}>→</span>
              </div>
              <div style={{ fontSize: "0.67rem", color: "#6b7280", marginBottom: 8 }}>{meta.description}</div>
              {data ? (
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <div><div style={{ fontSize: "1rem", fontWeight: 800, color: "#e2d9f3" }}>{data.count}</div><div style={{ fontSize: "0.6rem", color: "#6b7280" }}>SESSIONS</div></div>
                  <div><div style={{ fontSize: "1rem", fontWeight: 800, color: accuracyColor(Math.round(data.totalAcc / data.count)) }}>{Math.round(data.totalAcc / data.count)}%</div><div style={{ fontSize: "0.6rem", color: "#6b7280" }}>AVG</div></div>
                  <div><div style={{ fontSize: "1rem", fontWeight: 800, color: "#facc15" }}>{data.totalXP}</div><div style={{ fontSize: "0.6rem", color: "#6b7280" }}>XP</div></div>
                </div>
              ) : <div style={{ fontSize: "0.75rem", color: "#4b5563" }}>Not yet tried — tap to learn more</div>}
              <div style={{ fontSize: "0.62rem", color: meta.color, marginTop: 6, opacity: 0.7 }}>{meta.tag}</div>
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
    <header style={{ background: "rgba(10,6,30,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(139,92,246,0.2)", position: "sticky", top: 0, zIndex: 50, padding: "0 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", boxShadow: "0 0 20px rgba(139,92,246,0.5)" }}>A</div>
        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.4rem", color: "#e2d9f3", letterSpacing: "-0.02em" }}>ArtiCue</span>
        <span style={{ fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.12em", color: "#a78bfa", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", padding: "2px 8px", borderRadius: 20, textTransform: "uppercase" }}>Parent</span>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button onClick={onPrint} style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", color: "#c4b5fd", borderRadius: 8, padding: "7px 16px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>🖨 Share with SLP</button>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>P</div>
      </div>
    </header>
  );
}

function ChildProfileCard({ profile, loading }: { profile: ChildProfile | null; loading: boolean }) {
  if (loading) return <Skeleton height={144} />;
  if (!profile) return null;
  return (
    <div style={{ background: "linear-gradient(135deg,rgba(30,19,64,0.9),rgba(45,28,90,0.9))", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 16, padding: "1.5rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", boxShadow: "0 0 24px rgba(168,85,247,0.4)" }}>🧒</div>
        <div>
          <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: "1.6rem", color: "#f3f0ff", lineHeight: 1.1 }}>{profile.name}</div>
          <div style={{ color: "#9ca3af", fontSize: "0.85rem", marginTop: 2 }}>Age {profile.age} · Last practiced {daysSince(profile.lastSessionDate)} day{daysSince(profile.lastSessionDate) !== 1 ? "s" : ""} ago</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            {profile.targetSounds.map(s => <span key={s} style={{ padding: "3px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.4)", color: "#c4b5fd" }}>/{s}/</span>)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "1.5rem" }}>
        {[{ icon: "🔥", val: profile.streak, label: "DAY STREAK", color: "#fb923c" }, { icon: "⭐", val: profile.totalXP.toLocaleString(), label: "TOTAL XP", color: "#facc15" }].map(({ icon, val, label, color }) => (
          <div key={label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", lineHeight: 1 }}>{icon}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color, fontFamily: "'DM Serif Display',serif" }}>{val}</div>
            <div style={{ fontSize: "0.7rem", color: "#9ca3af", letterSpacing: "0.06em" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressSummary({ profile, progress, loading }: { profile: ChildProfile | null; progress: ProgressData | null; loading: boolean }) {
  const stats = [
    { icon: "🔥", label: "Day Streak", value: profile?.streak ?? "—", color: "#fb923c" },
    { icon: "⭐", label: "Total XP", value: profile?.totalXP?.toLocaleString() ?? "—", color: "#facc15" },
    { icon: "📅", label: "Sessions This Week", value: progress?.sessionsThisWeek ?? "—", color: "#818cf8" },
    { icon: "🎯", label: "Best Accuracy", value: progress?.bestAccuracyThisWeek ? `${progress.bestAccuracyThisWeek}%` : "—", color: "#4ade80" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem" }}>
      {stats.map(({ icon, label, value, color }) => loading ? <Skeleton key={label} height={96} /> : (
        <div key={label} style={{ background: "rgba(20,13,50,0.7)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 12, padding: "1rem 1.25rem", borderLeft: `3px solid ${color}` }}>
          <div style={{ fontSize: "1.4rem" }}>{icon}</div>
          <div style={{ fontSize: "1.5rem", fontWeight: 800, color, fontFamily: "'DM Serif Display',serif", lineHeight: 1.1, marginTop: 4 }}>{value}</div>
          <div style={{ fontSize: "0.72rem", color: "#6b7280", letterSpacing: "0.06em", marginTop: 4 }}>{label.toUpperCase()}</div>
        </div>
      ))}
    </div>
  );
}

function SoundSelector({ sounds, selected, onChange }: { sounds: string[]; selected: string; onChange: (s: string) => void }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid rgba(139,92,246,0.2)" }}>
      {sounds.map(sound => (
        <button key={sound} onClick={() => onChange(sound)} style={{ padding: "0.6rem 1.4rem", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600, color: selected === sound ? "#a78bfa" : "#6b7280", borderBottom: selected === sound ? "2px solid #7c3aed" : "2px solid transparent", marginBottom: -1, transition: "all 0.2s" }}>/{sound}/</button>
      ))}
    </div>
  );
}

function PredictionCard({ progress, loading }: { progress: ProgressData | null; loading: boolean }) {
  if (loading) return <Skeleton height={140} />;
  if (!progress) return null;
  const trendIcon = progress.trend === "improving" ? "📈" : progress.trend === "plateau" ? "➡️" : "📊";
  const trendLabel = { improving: "Improving", plateau: "Plateau", inconsistent: "Inconsistent" }[progress.trend] ?? progress.trend;
  return (
    <div style={{ background: "linear-gradient(135deg,#3b1d8a,#5b21b6,#4c1d95)", borderRadius: 16, padding: "1.75rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", boxShadow: "0 8px 40px rgba(109,40,217,0.35)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -30, right: -30, width: 180, height: 180, borderRadius: "50%", background: "rgba(167,139,250,0.08)", pointerEvents: "none" }} />
      <div>
        <div style={{ fontSize: "0.72rem", color: "#c4b5fd", letterSpacing: "0.14em", marginBottom: 6 }}>PREDICTED MASTERY</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: "3.5rem", color: "#fff", lineHeight: 1 }}>{progress.weeksToMastery}</span>
          <span style={{ color: "#c4b5fd", fontSize: "1rem" }}>weeks</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span>{trendIcon}</span>
          <span style={{ color: "#ddd6fe", fontSize: "0.85rem", fontWeight: 600 }}>{trendLabel}</span>
        </div>
      </div>
      <div style={{ maxWidth: 360, color: "#e9d5ff", fontSize: "0.88rem", lineHeight: 1.6, background: "rgba(0,0,0,0.15)", borderRadius: 10, padding: "0.9rem 1.2rem", borderLeft: "3px solid #facc15" }}>
        ⭐ {progress.insight}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(15,10,40,0.95)", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 10, padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#e9d5ff" }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map(p => <div key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}%</strong></div>)}
    </div>
  );
}

function AccuracyChart({ sessions, sound, loading }: { sessions: SessionData[]; sound: string; loading: boolean }) {
  if (loading) return <Skeleton height={280} />;
  const data = computeProjection(sessions);
  return (
    <div style={{ background: "rgba(15,10,40,0.6)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 16, padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <div style={{ fontFamily: "'DM Serif Display',serif", color: "#e2d9f3", fontSize: "1.1rem" }}>Accuracy Over Time — <span style={{ color: "#a78bfa" }}>/{sound}/</span></div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: 2 }}>All exercise types combined</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.25)", borderRadius: 8, padding: "4px 10px", fontSize: "0.75rem", color: "#facc15" }} title="80% accuracy is the standard SLP threshold for sound mastery.">
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

function SessionHistory({ sessions, loading }: { sessions: SessionData[]; loading: boolean }) {
  if (loading) return <Skeleton height={260} />;
  const recent = [...sessions].reverse().slice(0, 10);
  return (
    <div style={{ background: "rgba(15,10,40,0.6)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 16, padding: "1.5rem", overflow: "hidden" }}>
      <div style={{ fontFamily: "'DM Serif Display',serif", color: "#e2d9f3", fontSize: "1.1rem", marginBottom: "1rem" }}>Session History</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
          <thead>
            <tr>{["Date", "Exercise", "Sound", "Words", "Accuracy", "XP", "Duration"].map(h => (
              <th key={h} style={{ textAlign: "left", color: "#6b7280", fontWeight: 600, letterSpacing: "0.07em", fontSize: "0.72rem", textTransform: "uppercase", padding: "0 0.75rem 0.75rem", borderBottom: "1px solid rgba(139,92,246,0.15)" }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {recent.map((s, i) => {
              const meta = EXERCISE_META[s.exerciseType];
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(124,58,237,0.04)" }}>
                  <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{s.date}</td>
                  <td style={{ padding: "0.6rem 0.75rem" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: `${meta.color}18`, border: `1px solid ${meta.color}40`, color: meta.color, borderRadius: 20, padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700, whiteSpace: "nowrap" }}>{meta.icon} {meta.label}</span></td>
                  <td style={{ padding: "0.6rem 0.75rem" }}><span style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd", borderRadius: 20, padding: "2px 10px", fontSize: "0.75rem", fontWeight: 700 }}>/{s.targetSound}/</span></td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{s.wordsCompleted}/{s.totalWords}</td>
                  <td style={{ padding: "0.6rem 0.75rem" }}>
                    <span style={{ color: accuracyColor(s.averageAccuracy), fontWeight: 700 }}>{s.averageAccuracy}%</span>
                    <div style={{ height: 3, width: `${s.averageAccuracy}%`, maxWidth: 60, background: accuracyColor(s.averageAccuracy), borderRadius: 2, marginTop: 3, opacity: 0.4 }} />
                  </td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "#facc15", fontWeight: 700 }}>+{s.xpEarned}</td>
                  <td style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>{formatDuration(s.durationSeconds)}</td>
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
    setTimeout(() => {
      setProfile(MOCK_PROFILE); setProgress(MOCK_PROGRESS);
      setSessions(MOCK_SESSIONS["r"]);
      setLoadingProfile(false); setLoadingSessions(false);
    }, 1200);
  }, []);

  useEffect(() => {
    if (!profile) return;
    setLoadingSessions(true);
    setTimeout(() => { setSessions(MOCK_SESSIONS[selectedSound] || []); setLoadingSessions(false); }, 600);
  }, [selectedSound, profile]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#07041a;color:#e2d9f3;font-family:'DM Sans',sans-serif}
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

      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#07041a 0%,#0f0830 40%,#12093a 100%)" }}>
        <TopBar onPrint={() => window.print()} />
        <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem 4rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ animation: "fadeUp 0.4s ease both" }}><ChildProfileCard profile={profile} loading={loadingProfile} /></div>
          <div style={{ animation: "fadeUp 0.4s ease 0.1s both" }}><ProgressSummary profile={profile} progress={progress} loading={loadingProfile} /></div>
          <div style={{ animation: "fadeUp 0.4s ease 0.2s both" }}>
            <ExerciseBreakdown sessions={sessions} loading={loadingSessions} onSelect={setActiveModal} />
          </div>
          {!loadingProfile && profile && (
            <div style={{ animation: "fadeUp 0.4s ease 0.25s both" }}>
              <SoundSelector sounds={profile.targetSounds} selected={selectedSound} onChange={setSelectedSound} />
            </div>
          )}
          <div style={{ animation: "fadeUp 0.4s ease 0.3s both" }}><PredictionCard progress={progress} loading={loadingProfile} /></div>
          <div style={{ animation: "fadeUp 0.4s ease 0.4s both" }}><AccuracyChart sessions={sessions} sound={selectedSound} loading={loadingSessions} /></div>
          <div style={{ animation: "fadeUp 0.4s ease 0.5s both" }}><SessionHistory sessions={sessions} loading={loadingSessions} /></div>
        </main>
      </div>
    </>
  );
}
