
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import type { ChildProfile, SessionData } from '@/types';

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const db = getFirestore();

export async function saveChildProfile(
  userId: string,
  child: ChildProfile
): Promise<void> {
  const ref = db.collection('users').doc(userId);
  await ref.set({ profile: child }, { merge: true });
}

export async function getChildProfile(
  userId: string
): Promise<ChildProfile | null> {
  const ref = db.collection('users').doc(userId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return (snap.data()?.profile as ChildProfile) ?? null;
}

export async function saveSession(
  userId: string,
  session: SessionData
): Promise<void> {
  const ref = db.collection('users').doc(userId).collection('sessions');
  await ref.add(session);
}

export async function getSessions(
  userId: string,
  sound: string
): Promise<SessionData[]> {
  const ref = db.collection('users').doc(userId).collection('sessions');
  const snap = await ref
    .where('targetSound', '==', sound)
    .orderBy('date', 'desc')
    .get();
  return snap.docs.map((d) => d.data() as SessionData);
}

export async function getAllSessions(
  userId: string
): Promise<SessionData[]> {
  const ref = db.collection('users').doc(userId).collection('sessions');
  const snap = await ref.orderBy('date', 'desc').get();
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
  const ref = db.collection('users').doc(userId);
  await ref.update({
    'profile.streak': newStreak,
    'profile.lastSessionDate': today,
  });
  return newStreak;
}

export async function updateXP(
  userId: string,
  xpToAdd: number
): Promise<void> {
  const { FieldValue } = await import('firebase-admin/firestore');
  const ref = db.collection('users').doc(userId);
  await ref.update({
    'profile.totalXP': FieldValue.increment(xpToAdd),
  });
}