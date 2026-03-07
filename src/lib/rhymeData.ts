// rhymeData.ts — Rhyme Time exercise data.
// Each entry: a target word, the correct rhyme, and 2 distractors.
// Organized by target sound so the exercise stays thematically relevant.

export type RhymeChallenge = {
    word: string;       // Nova says this word
    emoji: string;
    correct: string;    // the rhyming word
    distractors: [string, string]; // two non-rhyming words
};

export type RhymeBank = {
    r: RhymeChallenge[];
    s: RhymeChallenge[];
    th: RhymeChallenge[];
    l: RhymeChallenge[];
    fluency: RhymeChallenge[];
};

export const rhymeData: RhymeBank = {
    r: [
        { word: "car", emoji: "🚗", correct: "star", distractors: ["frog", "cup"] },
        { word: "bear", emoji: "🐻", correct: "hair", distractors: ["sock", "hill"] },
        { word: "ring", emoji: "💍", correct: "king", distractors: ["duck", "lamp"] },
        { word: "rain", emoji: "🌧️", correct: "train", distractors: ["ball", "fish"] },
        { word: "rock", emoji: "🪨", correct: "sock", distractors: ["tree", "bed"] },
        { word: "red", emoji: "🔴", correct: "bed", distractors: ["moon", "cup"] },
        { word: "run", emoji: "🏃", correct: "sun", distractors: ["boat", "bird"] },
        { word: "rose", emoji: "🌹", correct: "nose", distractors: ["leaf", "hat"] },
    ],
    s: [
        { word: "sun", emoji: "☀️", correct: "run", distractors: ["book", "frog"] },
        { word: "snake", emoji: "🐍", correct: "cake", distractors: ["door", "bell"] },
        { word: "sock", emoji: "🧦", correct: "rock", distractors: ["moon", "tree"] },
        { word: "sea", emoji: "🌊", correct: "tree", distractors: ["cup", "drum"] },
        { word: "star", emoji: "⭐", correct: "car", distractors: ["fish", "hat"] },
        { word: "sing", emoji: "🎤", correct: "ring", distractors: ["boat", "lamp"] },
        { word: "soap", emoji: "🧼", correct: "rope", distractors: ["bird", "pen"] },
        { word: "sand", emoji: "🏖️", correct: "hand", distractors: ["moon", "duck"] },
    ],
    th: [
        { word: "three", emoji: "3️⃣", correct: "tree", distractors: ["sock", "cup"] },
        { word: "thumb", emoji: "👍", correct: "drum", distractors: ["fish", "star"] },
        { word: "teeth", emoji: "🦷", correct: "feet", distractors: ["ball", "rain"] },
        { word: "bath", emoji: "🛁", correct: "math", distractors: ["bird", "lamp"] },
        { word: "mouth", emoji: "👄", correct: "south", distractors: ["tree", "book"] },
        { word: "earth", emoji: "🌍", correct: "worth", distractors: ["fish", "cat"] },
        { word: "think", emoji: "💭", correct: "drink", distractors: ["frog", "bell"] },
        { word: "thorn", emoji: "🌹", correct: "horn", distractors: ["duck", "sun"] },
    ],
    l: [
        { word: "lake", emoji: "🏞️", correct: "cake", distractors: ["rock", "bird"] },
        { word: "leaf", emoji: "🍃", correct: "beef", distractors: ["drum", "star"] },
        { word: "lion", emoji: "🦁", correct: "cryon", distractors: ["fish", "moon"] },
        { word: "bell", emoji: "🔔", correct: "yell", distractors: ["frog", "cup"] },
        { word: "ball", emoji: "⚽", correct: "tall", distractors: ["sock", "rain"] },
        { word: "lamp", emoji: "💡", correct: "camp", distractors: ["bird", "dish"] },
        { word: "lemon", emoji: "🍋", correct: "demon", distractors: ["fish", "star"] },
        { word: "hill", emoji: "⛰️", correct: "bill", distractors: ["tree", "sock"] },
    ],
    fluency: [
        { word: "cat", emoji: "🐱", correct: "hat", distractors: ["dog", "sun"] },
        { word: "big", emoji: "🐘", correct: "pig", distractors: ["cup", "star"] },
        { word: "day", emoji: "☀️", correct: "play", distractors: ["fish", "drum"] },
        { word: "blue", emoji: "🔵", correct: "shoe", distractors: ["bird", "rock"] },
        { word: "night", emoji: "🌙", correct: "light", distractors: ["frog", "bell"] },
    ],
};
