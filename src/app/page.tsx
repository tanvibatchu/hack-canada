'use client';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center px-4">
      <div className="text-center space-y-8 max-w-md w-full">
        <h1 className="text-6xl md:text-7xl font-bold text-white">
          ArtiCue
        </h1>
        <p className="text-xl md:text-2xl text-white/90">
          Speech therapy for every Canadian kid — no waitlist required.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/auth/login?returnTo=/role"
            className="inline-block px-8 py-4 bg-white text-[#302b63] font-semibold rounded-lg shadow-lg shadow-purple-500/40 transition-all duration-200 hover:-translate-y-0.5"
          >
            Log In
          </a>
          <a
            href="/auth/login?screen_hint=signup&returnTo=/onboarding"
            className="inline-block px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-purple-500/60 transition-all duration-200 hover:-translate-y-0.5"
          >
            Create Account
          </a>
        </div>
      </div>
    </div>
  );
}
