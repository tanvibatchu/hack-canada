'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RolePage() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }

    fetch('/api/profile')
      .then((res) => res.json())
      .then((data) => {
        if (!data.profile) {
          router.replace('/onboarding');
        }
      })
      .catch(() => router.replace('/'));
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-md w-full">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-purple-200/80 font-semibold">
            Welcome back
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Choose your view
          </h1>
          <p className="text-lg text-white/80">
            Continue as a parent or switch to the kid experience.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/Parent"
            className="px-6 py-4 bg-white text-[#302b63] font-semibold rounded-lg shadow-lg shadow-purple-500/40 hover:-translate-y-0.5 transition-all duration-200"
          >
            Parent
          </Link>
          <Link
            href="/kid"
            className="px-6 py-4 bg-purple-600 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/60 hover:bg-purple-700 hover:-translate-y-0.5 transition-all duration-200"
          >
            Kid
          </Link>
        </div>
      </div>
    </div>
  );
}
