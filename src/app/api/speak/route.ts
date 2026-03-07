/**
 * POST /api/speak — Server-side ElevenLabs TTS. Streams audio back to client.
 * Body: { text: string, speed?: number }
 */

import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";

export async function POST(request: NextRequest) {
  try {
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

    if (!text) {
      return NextResponse.json(
        { error: "Missing or invalid 'text' in body" },
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
          stability: 0.7,
          similarity_boost: 0.8,
          style: 0.3,
          speed,
        },
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
    return NextResponse.json(
      { error: `Speak failed: ${message}` },
      { status: 500 }
    );
  }
}
