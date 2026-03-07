// Landing page component
// Displays ArtiCue branding and Google Sign-In button
// After sign-in, checks for existing profile and redirects accordingly
'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Home() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      setCheckingProfile(true);
      fetch('/api/profile')
        .then((res) => res.json())
        .then((data) => {
          if (data.profile) {
            router.push('/kid');
          } else {
            router.push('/onboarding');
          }
        })
        .catch((error) => {
          console.error('Error checking profile:', error);
          setCheckingProfile(false);
        });
    }
  }, [user, isLoading, router]);

  if (isLoading || checkingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-md w-full">
        <h1 className="text-6xl md:text-7xl font-bold text-white">
          ArtiCue
        </h1>
        <p className="text-xl md:text-2xl text-white/90">
          Speech therapy for every Canadian kid — no waitlist required.
        </p>
        <a
          href="/auth/login?returnTo=/Parent&connection=google-oauth2"
          className="inline-block px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/50 transition-all duration-200 hover:shadow-purple-500/70 hover:scale-105"
        >
          Sign in with Google
        </a>
      </div>
    </div>
  );
}
