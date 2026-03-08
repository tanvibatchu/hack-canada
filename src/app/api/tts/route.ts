import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth0";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";

export async function POST(request: NextRequest) {
  try {
    await requireUser();

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    if (!apiKey || !voiceId) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID not set" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text : "";
    const speed = typeof body?.speed === "number" ? body.speed : 1;

    if (!text.trim()) {
        return NextResponse.json(
            { error: "Missing 'text'" },
            { status: 400 }
        );
    }

    const url = `${ELEVENLABS_BASE}/${voiceId}?output_format=mp3_44100_128`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.85,
          similarity_boost: 0.92,
          style: 0,
          use_speaker_boost: true,
        },
        speed,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `ElevenLabs error: ${errText}` },
        { status: res.status }
      );
    }

    const audioBuffer = await res.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const unauthorized = message.toLowerCase().includes("auth") || message.includes("401");
    if (unauthorized) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: `TTS failed: ${message}` }, { status: 500 });
  }
}
