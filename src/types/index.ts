/**
 * Shared types for ArtiCue speech therapy app.
 * Import: ChildProfile, SessionData, Attempt, Session, PhonemeResult,
 * FluencyResult, PredictionResult, WordBankEntry, SoundWordBank, WordBanksMap
 */

export interface ChildProfile {
  name: string;
  age: number;
  targetSounds: string[];
  streak: number;
  lastSessionDate: string;
  totalXP: number;
}

export interface Attempt {
  word: string;
  transcript: string;
  score: number;
  correct: boolean;
  substitution: string | null;
}

export interface SessionData {
  date: string;
  durationSeconds: number;
  targetSound: string;
  attempts: Attempt[];
  averageAccuracy: number;
}

export interface Session {
  userId: string;
  sound: string;
  startTime: number;
  attempts: Attempt[];
}

export interface PhonemeResult {
  correct: boolean;
  score: number;
  substitution: string | null;
  feedback: string;
  mouthCue: string;
  tryAgain: boolean;
}

export interface FluencyResult {
  score: number;
  rhythm: "good" | "rushed" | "hesitant";
  feedback: string;
  encouragement: string;
}

export interface PredictionResult {
  currentAccuracy: number;
  weeklyImprovementRate: number;
  weeksToMastery: number;
  parentInsight: string;
  trend: "improving" | "plateau" | "inconsistent";
}

export interface WordBankEntry {
  word: string;
  emoji: string;
}

export interface SoundWordBank {
  initial: WordBankEntry[];
  medial: WordBankEntry[];
  final: WordBankEntry[];
}

export type WordBanksMap = Record<string, SoundWordBank>;
