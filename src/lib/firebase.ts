// Firebase Firestore database functions
// Provides functions to save/retrieve child profiles and session data
// Used by API routes to interact with Firestore
import {
  initializeApp,
  getApps,
} from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  updateDoc,
  increment,
} from 'firebase/firestore';
import type { ChildProfile, SessionData } from '@/types';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);

export async function saveChildProfile(
  userId: string,
  child: ChildProfile
): Promise<void> {
  const ref = doc(db, 'users', userId);
  await setDoc(ref, { profile: child }, { merge: true });
}

export async function getChildProfile(
  userId: string
): Promise<ChildProfile | null> {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return (snap.data()?.profile as ChildProfile) ?? null;
}

export async function saveSession(
  userId: string,
  session: SessionData
): Promise<void> {
  const ref = collection(db, 'users', userId, 'sessions');
  await addDoc(ref, session);
}

export async function getSessions(
  userId: string,
  sound: string
): Promise<SessionData[]> {
  const ref = collection(db, 'users', userId, 'sessions');
  const q = query(
    ref,
    where('targetSound', '==', sound),
    orderBy('date', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SessionData);
}

export async function getAllSessions(
  userId: string
): Promise<SessionData[]> {
  const ref = collection(db, 'users', userId, 'sessions');
  const q = query(ref, orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as SessionData);
}

export async function updateStreak(userId: string): Promise<number> {
  const profile = await getChildProfile(userId);
  if (!profile) return 0;
  const today = new Date().toISOString().split('T')[0];
  const last = profile.lastSessionDate;
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .split('T')[0];
  let newStreak = profile.streak;
  if (last === yesterday) {
    newStreak = profile.streak + 1;
  } else if (last !== today) {
    newStreak = 1;
  }
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, {
    'profile.streak': newStreak,
    'profile.lastSessionDate': today,
  });
  return newStreak;
}

export async function updateXP(
  userId: string,
  xpToAdd: number
): Promise<void> {
  const ref = doc(db, 'users', userId);
  await updateDoc(ref, {
    'profile.totalXP': increment(xpToAdd),
  });
}
