// blendData.ts — Blend It! exercise data.
// Each entry contains a word split into audible phoneme segments.
// Nova "says" each segment separately; the child blends them into the full word.
//
// segmentToSpeech() converts short phoneme spellings into TTS-friendly phrases
// so ElevenLabs pronounces the *sound* rather than the letter name.

// PHONEME_STRETCH: how to exaggerate a phoneme at the START of a word.
// For sonorants we repeat the character(s). For stops we can't truly stretch them
// so we use the word as-is (the word context alone improves ElevenLabs accuracy).
const PHONEME_STRETCH: Record<string, string> = {
    "r": "ruhhh",
    "l": "lllll",
    "m": "mmmmm",
    "n": "nnnnn",
    "s": "sssss",
    "f": "fffff",
    "v": "vvvvv",
    "z": "zzzzz",
    "w": "wwwww",
    "y": "yyyyy",
    "sh": "shhhh",
    "th": "thhhh",
    "ch": "chhhh",
};

// PHONEME_SOLO: isolated phoneme sound when there's no word context.
const PHONEME_SOLO: Record<string, string> = {
    "r": "ruh", "l": "lll", "m": "mmm", "n": "nnn",
    "s": "sss", "f": "fff", "v": "vvv", "z": "zzz",
    "w": "wuh", "y": "yuh",
    // Stop consonants — use open "a" vowel; schwa "uh" diphthongs to "ua" at slow speed
    "b": "buh", "c": "ka", "d": "da", "g": "ga",
    "h": "ha", "j": "ja", "k": "ka", "p": "pa",
    "t": "ta", "x": "ksa", "q": "kwa",
    "a": "aah", "e": "eh", "i": "ih", "o": "oh", "u": "uh",
    "sh": "sha", "ch": "cha", "th": "thh",
    "ck": "ka", "ng": "nng", "nd": "nd", "mp": "mp", "nk": "nk",
    "ai": "ay", "ee": "ee", "oo": "oo", "aw": "aw", "er": "er",
    "it": "it", "et": "et", "en": "en", "on": "on", "an": "an", "in": "in",
};

/**
 * Returns the TTS text for a phoneme segment.
 *
 * isFirst=true  → uses longer stretch (more emphasis on the target sound)
 * isFirst=false → standard isolated phoneme sound
 *
 * The full word is spoken SEPARATELY after all segments by the caller.
 * This keeps each sound audibly distinct before blending.
 */
export function segmentToSpeech(segment: string, isFirst: boolean): string {
    const key = segment.toLowerCase();
    if (isFirst) {
        return PHONEME_STRETCH[key] ?? PHONEME_SOLO[key] ?? segment;
    }
    return PHONEME_SOLO[key] ?? segment;
}

export type BlendWord = {
    word: string;
    emoji: string;
    segments: string[];   // how Nova sounds it out, e.g. ["r", "a", "b", "it"]
    display: string;      // visual on-screen version, e.g. "r ... a ... b ... it"
};

export type BlendBank = {
    r: BlendWord[];
    s: BlendWord[];
    th: BlendWord[];
    l: BlendWord[];
    fluency: BlendWord[];
};

export const blendData: BlendBank = {
    r: [
        { word: "rabbit", emoji: "🐰", segments: ["r", "a", "b", "it"], display: "r • a • b • it" },
        { word: "rain", emoji: "🌧️", segments: ["r", "ai", "n"], display: "r • ai • n" },
        { word: "rocket", emoji: "🚀", segments: ["r", "o", "ck", "et"], display: "r • o • ck • et" },
        { word: "ring", emoji: "💍", segments: ["r", "i", "ng"], display: "r • i • ng" },
        { word: "river", emoji: "🏞️", segments: ["r", "i", "v", "er"], display: "r • i • v • er" },
        { word: "rose", emoji: "🌹", segments: ["r", "o", "z"], display: "r • o • z" },
    ],
    s: [
        { word: "sun", emoji: "☀️", segments: ["s", "u", "n"], display: "s • u • n" },
        { word: "sock", emoji: "🧦", segments: ["s", "o", "ck"], display: "s • o • ck" },
        { word: "sand", emoji: "🏖️", segments: ["s", "a", "nd"], display: "s • a • nd" },
        { word: "snake", emoji: "🐍", segments: ["s", "n", "ai", "k"], display: "s • n • ai • k" },
        { word: "soap", emoji: "🧼", segments: ["s", "o", "p"], display: "s • o • p" },
        { word: "seven", emoji: "7️⃣", segments: ["s", "e", "v", "en"], display: "s • e • v • en" },
    ],
    th: [
        { word: "thumb", emoji: "👍", segments: ["th", "u", "m"], display: "th • u • m" },
        { word: "three", emoji: "3️⃣", segments: ["th", "r", "ee"], display: "th • r • ee" },
        { word: "think", emoji: "💭", segments: ["th", "i", "nk"], display: "th • i • nk" },
        { word: "teeth", emoji: "🦷", segments: ["t", "ee", "th"], display: "t • ee • th" },
        { word: "bath", emoji: "🛁", segments: ["b", "a", "th"], display: "b • a • th" },
        { word: "earth", emoji: "🌍", segments: ["er", "th"], display: "er • th" },
    ],
    l: [
        { word: "lion", emoji: "🦁", segments: ["l", "i", "on"], display: "l • i • on" },
        { word: "lemon", emoji: "🍋", segments: ["l", "e", "m", "on"], display: "l • e • m • on" },
        { word: "leaf", emoji: "🍃", segments: ["l", "ee", "f"], display: "l • ee • f" },
        { word: "lamp", emoji: "💡", segments: ["l", "a", "mp"], display: "l • a • mp" },
        { word: "ball", emoji: "⚽", segments: ["b", "aw", "l"], display: "b • aw • l" },
        { word: "bell", emoji: "🔔", segments: ["b", "e", "l"], display: "b • e • l" },
    ],
    fluency: [
        { word: "cat", emoji: "🐱", segments: ["c", "a", "t"], display: "c • a • t" },
        { word: "dog", emoji: "🐶", segments: ["d", "o", "g"], display: "d • o • g" },
        { word: "fish", emoji: "🐟", segments: ["f", "i", "sh"], display: "f • i • sh" },
        { word: "bird", emoji: "🐦", segments: ["b", "er", "d"], display: "b • er • d" },
        { word: "cup", emoji: "☕", segments: ["c", "u", "p"], display: "c • u • p" },
    ],
};
