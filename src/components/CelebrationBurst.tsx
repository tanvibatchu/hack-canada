// CelebrationBurst.tsx — Full-screen CSS confetti explosion on correct answers.
// Uses randomized positions, rotations and colors with CSS animations.
// No external libraries — pure CSS keyframes. Automatically dismisses after 2.2s.

"use client";

import { useEffect, useState } from "react";

type CelebrationBurstProps = {
    active: boolean;
};

type Piece = {
    id: number;
    x: number;   // vw
    y: number;   // starting vh (above screen)
    color: string;
    size: number; // px
    duration: number; // s
    delay: number;    // s
    rotate: number;   // initial deg
    shape: "circle" | "square" | "star";
};

const COLORS = [
    "#7C3AED", "#a78bfa", "#F59E0B", "#FDE68A",
    "#ffffff", "#ec4899", "#34d399", "#60a5fa",
];

function randomBetween(min: number, max: number) {
    return Math.random() * (max - min) + min;
}

function generatePieces(count: number): Piece[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: randomBetween(0, 98),
        y: randomBetween(-20, -5),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: randomBetween(6, 16),
        duration: randomBetween(1.5, 3),
        delay: randomBetween(0, 0.6),
        rotate: randomBetween(0, 360),
        shape: (["circle", "square", "star"] as const)[Math.floor(Math.random() * 3)],
    }));
}

export default function CelebrationBurst({ active }: CelebrationBurstProps) {
    const [pieces, setPieces] = useState<Piece[]>([]);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (active) {
            setPieces(generatePieces(48));
            setVisible(true);
            const t = setTimeout(() => setVisible(false), 2200);
            return () => clearTimeout(t);
        } else {
            setVisible(false);
        }
    }, [active]);

    if (!visible) return null;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
            aria-hidden="true"
        >
            {pieces.map((p) => (
                <div
                    key={p.id}
                    className={p.shape === "circle" ? "rounded-full" : p.shape === "square" ? "rounded-sm" : ""}
                    style={{
                        position: "absolute",
                        left: `${p.x}vw`,
                        top: `${p.y}vh`,
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.shape !== "star" ? p.color : "transparent",
                        color: p.color,
                        fontSize: p.size,
                        lineHeight: 1,
                        transform: `rotate(${p.rotate}deg)`,
                        animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
                    }}
                >
                    {p.shape === "star" ? "★" : null}
                </div>
            ))}
        </div>
    );
}
