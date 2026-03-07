// blendData.ts — Blend It! exercise data.
// Each entry contains a word split into audible phoneme segments.
// Nova "says" each segment separately; the child blends them into the full word.

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
