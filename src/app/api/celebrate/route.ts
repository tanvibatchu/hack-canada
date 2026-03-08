/**
 * POST /api/celebrate — Server-side Gemini session celebration message.
 * Body: { sound: string, count: number, accuracy: number }
 * Returns: { message: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { generateSessionCelebration } from "@/lib/gemini";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const sound = typeof body?.sound === "string" ? body.sound : "R";
        const count = typeof body?.count === "number" ? body.count : 6;
        const accuracy = typeof body?.accuracy === "number" ? body.accuracy : 0;

        const message = await generateSessionCelebration(sound, count, accuracy);
        return NextResponse.json({ message });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
            { error: `Celebration failed: ${message}` },
            { status: 500 }
        );
    }
}
