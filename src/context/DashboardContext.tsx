"use client";
import {
  createContext, useContext, useEffect, useState,
  useCallback, useRef, ReactNode,
} from "react";
import {
  doc, onSnapshot, collection, query, orderBy, limit,
  setDoc, updateDoc, serverTimestamp, Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebaseClient";

export type UserMode = "kid" | "parent";
export type SyncStatus = "online" | "offline" | "syncing";

export interface ChildProfile {
  name: string; age: number; targetSounds: string[];
  streak: number; lastSessionDate: string; totalXP: number;
}
export interface ParentGoals {
  dailySessionTarget: number; weeklyXPTarget: number;
  focusSounds: string[]; notes: string; lastUpdated?: string;
}
export interface SessionData {
  date: string; durationSeconds: number; targetSound: string;
  averageAccuracy: number; exerciseType: string;
  xpEarned: number; wordsCompleted: number; totalWords: number;
}
export interface Achievement {
  id: string; label: string; icon: string; unlockedAt: string;
}

interface DashboardContextValue {
  userId: string | null;
  profile: ChildProfile | null;
  parentGoals: ParentGoals | null;
  recentSessions: SessionData[];
  achievements: Achievement[];
  syncStatus: SyncStatus;
  mode: UserMode;
  lastSynced: Date | null;
  setMode: (mode: UserMode) => void;
  setUserId: (id: string) => void;
  updateParentGoals: (goals: Partial<ParentGoals>) => Promise<void>;
  updateProfile: (profile: Partial<ChildProfile>) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string | null>(null);
  const [profile, setProfile] = useState<ChildProfile | null>(null);
  const [parentGoals, setParentGoals] = useState<ParentGoals | null>(null);
  const [recentSessions, setRecentSessions] = useState<SessionData[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("offline");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [mode, setModeState] = useState<UserMode>(() => {
    if (typeof window === "undefined") return "kid";
    return (localStorage.getItem("articue_mode") as UserMode) ?? "kid";
  });
  const unsubs = useRef<Unsubscribe[]>([]);

  const setMode = useCallback((newMode: UserMode) => {
    setModeState(newMode);
    if (typeof window !== "undefined") localStorage.setItem("articue_mode", newMode);
  }, []);

  const setUserId = useCallback((id: string) => { setUserIdState(id); }, []);

  useEffect(() => {
    if (!userId || !db) return;
    unsubs.current.forEach((u) => u());
    unsubs.current = [];
    setSyncStatus("syncing");

    const profileUnsub = onSnapshot(
      doc(db, "users", userId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data.profile ?? null);
          setParentGoals(data.parentGoals ?? null);
          setAchievements(data.achievements ?? []);
        }
        setSyncStatus("online");
        setLastSynced(new Date());
      },
      () => setSyncStatus("offline")
    );

    const sessionsUnsub = onSnapshot(
      query(collection(db, "users", userId, "sessions"), orderBy("date", "desc"), limit(20)),
      (snap) => { setRecentSessions(snap.docs.map((d) => d.data() as SessionData)); setLastSynced(new Date()); },
      () => {}
    );

    unsubs.current = [profileUnsub, sessionsUnsub];
    return () => { unsubs.current.forEach((u) => u()); setSyncStatus("offline"); };
  }, [userId]);

  const updateParentGoals = useCallback(async (goals: Partial<ParentGoals>) => {
    if (!userId || !db) return;
    setSyncStatus("syncing");
    const updated = { ...parentGoals, ...goals, lastUpdated: new Date().toISOString() };
    await setDoc(doc(db, "users", userId), { parentGoals: updated, updatedAt: serverTimestamp() }, { merge: true });
    setParentGoals(updated as ParentGoals);
    setSyncStatus("online");
  }, [userId, parentGoals]);

  const updateProfile = useCallback(async (updates: Partial<ChildProfile>) => {
    if (!userId || !db) return;
    setSyncStatus("syncing");
    const updated = { ...profile, ...updates };
    await updateDoc(doc(db, "users", userId), { profile: updated, updatedAt: serverTimestamp() });
    setSyncStatus("online");
  }, [userId, profile]);

  return (
    <DashboardContext.Provider value={{
      userId, profile, parentGoals, recentSessions, achievements,
      syncStatus, mode, lastSynced, setMode, setUserId,
      updateParentGoals, updateProfile,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}
