import { NextRequest, NextResponse } from "next/server";
import { analyzePronunciationAudio, analyzePhoneme, analyzeVoiceAttempt } from "@/lib/gemini";

function getStringField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const targetSound = getStringField(formData, "targetSound");
    const word = getStringField(formData, "word");
    const transcript = getStringField(formData, "transcript");
    const ageValue = Number(getStringField(formData, "age"));
    const age = Number.isFinite(ageValue) && ageValue > 0 ? ageValue : 6;

    if (!targetSound || !word) {
      return NextResponse.json(
        { error: "Missing required fields: targetSound and word." },
        { status: 400 }
      );
    }

    // Speak Up ("voice") mode: stricter — the target word must be recognizable
    if (targetSound === "voice") {
      if (!transcript) {
        // No transcript for voice mode — fall back to a basic check
        const result = await analyzeVoiceAttempt({ age, targetSound, transcript: word, word });
        return NextResponse.json(result);
      }
      const result = await analyzeVoiceAttempt({ age, targetSound, transcript, word });
      return NextResponse.json(result);
    }

    // All other modes: prefer text-based analysis when a transcript is available
    if (transcript) {
      const result = await analyzePhoneme({ age, targetSound, transcript, word });
      return NextResponse.json(result);
    }

    // Fall back to audio analysis when there is no transcript
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json(
        { error: "Missing required audio file." },
        { status: 400 }
      );
    }

    const bytes = await audio.arrayBuffer();
    const audioBase64 = Buffer.from(bytes).toString("base64");
    const result = await analyzePronunciationAudio({
      age,
      audioBase64,
      mimeType: audio.type || "audio/webm",
      targetSound,
      word,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed.";
    console.error("ANALYZE ERROR:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
