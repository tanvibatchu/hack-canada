"use client";

import Lottie from "lottie-react";
import mascotBird from "../../public/mascot_bird.json";

export default function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9F4F1]">
      <Lottie
        animationData={mascotBird}
        loop={true}
        className="w-48 h-48"
      />
    </main>
  );
}
