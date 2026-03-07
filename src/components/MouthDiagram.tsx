// MouthDiagram.tsx — SVG articulation diagrams showing tongue/lip positions.
// Shows a different cross-section diagram for each target sound (r, s, th, l).
// Animates in when visible, hidden between attempts.

"use client";

import { TargetSound } from "@/lib/wordBanks";

type MouthDiagramProps = {
    sound: TargetSound | null;
    visible: boolean;
};

// SVG path data for simplified tongue/mouth cross-sections per sound
const DIAGRAMS: Partial<Record<TargetSound, { tip: string; label: string }>> = {
    r: {
        tip: "Curl your tongue tip UP and BACK — don't touch the roof!",
        label: "R Sound",
    },
    s: {
        tip: "Place tongue tip near your top front teeth, let air flow through the middle.",
        label: "S Sound",
    },
    th: {
        tip: "Put your tongue TIP gently between your front teeth and blow air.",
        label: "TH Sound",
    },
    l: {
        tip: "Lift your tongue tip to the ridge just behind your top front teeth.",
        label: "L Sound",
    },
};

type DiagramSVGProps = { sound: TargetSound };

function DiagramSVG({ sound }: DiagramSVGProps) {
    // All diagrams share the outer mouth shape; tongue path differs per sound
    const tonguePaths: Partial<Record<TargetSound, string>> = {
        r: "M 40 80 Q 55 50 75 45 Q 90 42 95 55 Q 90 65 75 65 Q 60 68 50 80 Z",   // curled back
        s: "M 40 85 Q 60 75 80 72 Q 95 70 98 78 Q 95 85 80 84 Q 60 83 45 88 Z",   // flat, near teeth
        th: "M 30 90 Q 55 82 80 65 Q 95 55 98 60 Q 97 70 80 75 Q 55 88 32 95 Z",  // between teeth
        l: "M 40 80 Q 55 60 72 52 Q 82 48 88 55 Q 88 65 75 68 Q 58 72 44 84 Z",   // tip up high
    };

    return (
        <svg
            viewBox="0 0 140 120"
            className="w-36 h-28"
            aria-hidden="true"
        >
            {/* Outer mouth/jaw outline */}
            <ellipse cx="70" cy="60" rx="62" ry="52" fill="#2d1b6b" stroke="#7C3AED" strokeWidth="2" />

            {/* Roof of mouth */}
            <path d="M 15 45 Q 70 20 125 45" stroke="#a78bfa" strokeWidth="2.5" fill="none" strokeLinecap="round" />

            {/* Teeth */}
            {[30, 42, 54, 66, 78, 90, 100].map((x, i) => (
                <rect key={i} x={x} y={38} width={9} height={12} rx={2} fill="#f0edff" stroke="#7C3AED" strokeWidth="0.5" />
            ))}

            {/* Tongue */}
            {tonguePaths[sound] && (
                <path
                    d={tonguePaths[sound]}
                    fill="#e879f9"
                    fillOpacity="0.75"
                    stroke="#d946ef"
                    strokeWidth="1.5"
                />
            )}

            {/* Airflow indicator (small arrow) */}
            <path d="M 115 70 L 130 70 L 125 65 M 130 70 L 125 75" stroke="#60a5fa" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
    );
}

export default function MouthDiagram({ sound, visible }: MouthDiagramProps) {
    if (!sound || !DIAGRAMS[sound]) return null;

    const info = DIAGRAMS[sound]!;

    return (
        <div
            className={[
                "flex flex-col items-center gap-2 p-4 rounded-2xl",
                "bg-white/5 border border-purple-400/20 backdrop-blur-sm",
                "transition-all duration-300 max-w-xs w-full",
                visible
                    ? "opacity-100 translate-y-0 animate-[fade-in_0.3s_ease-out_forwards]"
                    : "opacity-0 translate-y-4 pointer-events-none",
            ].join(" ")}
            aria-live="polite"
        >
            <p className="text-xs font-semibold text-purple-300 uppercase tracking-widest">
                {info.label}
            </p>

            <DiagramSVG sound={sound} />

            <p className="text-sm text-center text-purple-100 leading-relaxed px-2">
                {info.tip}
            </p>
        </div>
    );
}
