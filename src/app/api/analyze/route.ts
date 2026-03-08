/**
 * POST /api/analyze — Phoneme analysis via Gemini. Body: { word, transcript, targetSound, age }
 * Returns PhonemeResult as JSON.
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzePhoneme } from "@/lib/gemini";
import { requireUser } from "@/lib/auth0";

export async function POST(request: NextRequest) {
  try {
    await requireUser(); // ensure authenticated
    const body = await request.json();
    const word = typeof body?.word === "string" ? body.word : "";
    const transcript = typeof body?.transcript === "string" ? body.transcript : "";
    const targetSound = typeof body?.targetSound === "string" ? body.targetSound : "";
    const age = typeof body?.age === "number" ? body.age : Number(body?.age);

    if (!word || !transcript || !targetSound) {
      return NextResponse.json(
        { error: "Missing required fields: word, transcript, targetSound" },
        { status: 400 }
      );
    }

    const result = await analyzePhoneme(
      word,
      transcript,
      targetSound,
      Number.isFinite(age) ? age : 5
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const unauthorized = message.toLowerCase().includes("auth") || message.includes("401");
    if (unauthorized) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: `Analysis failed: ${message}` },
      { status: 500 }
    );
  }
}
