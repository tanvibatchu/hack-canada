// ExerciseCard.tsx — A large tappable menu card for the kid exercise home page.
// Each card represents one exercise mode with an emoji, title, description, and link.

"use client";

import Link from "next/link";

type ExerciseCardProps = {
    href: string;
    emoji: string;
    title: string;
    description: string;
    gradient: string;   // Tailwind gradient classes
    badge?: string;     // e.g. "New!" or "Favourite"
};

export default function ExerciseCard({
    href,
    emoji,
    title,
    description,
    gradient,
    badge,
}: ExerciseCardProps) {
    return (
        <Link href={href} className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 rounded-3xl">
            <div
                className={[
                    "relative flex items-center gap-4 px-5 py-5 rounded-3xl",
                    "border border-white/10",
                    "bg-white/5 backdrop-blur-sm",
                    "shadow-[0_0_20px_rgba(124,58,237,0.1)]",
                    "transition-all duration-200 active:scale-95",
                    "hover:bg-white/10 hover:border-purple-400/40 hover:shadow-[0_0_28px_rgba(124,58,237,0.25)]",
                    "cursor-pointer select-none",
                ].join(" ")}
            >
                {/* Coloured emoji badge */}
                <div
                    className={[
                        "flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl",
                        gradient,
                    ].join(" ")}
                >
                    {emoji}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h2 className="text-base font-bold text-white truncate">{title}</h2>
                        {badge && (
                            <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
                                {badge}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-purple-300 leading-snug">{description}</p>
                </div>

                {/* Arrow */}
                <svg className="flex-shrink-0 w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </div>
        </Link>
    );
}
