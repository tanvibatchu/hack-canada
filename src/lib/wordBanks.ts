import type { SoundWordBank, WordBanksMap, WordBankEntry } from "@/types";
export type TargetSound = "r" | "s" | "th" | "l" | "fluency";
export type WordEntry = WordBankEntry;
export function getSessionWords(sound: TargetSound, count: number, age: number = 6): WordEntry[] {
  const key = sound === "fluency" ? "Fluency" : sound.toUpperCase();
  const bank = wordBanks[key as keyof typeof wordBanks];
  if (!bank) return [];

  // Decide which difficulty level to focus on based on age
  let pool: WordEntry[] = [];
  if (age <= 4) pool = bank.level1;
  else if (age <= 6) pool = bank.level2;
  else pool = bank.level3;

  // To avoid running out of words, if pool is empty, combine all
  if (pool.length === 0) {
    pool = [...bank.level1, ...bank.level2, ...bank.level3];
  }

  return pool.sort(() => Math.random() - 0.5).slice(0, count);
}
export const wordBanks: WordBanksMap = {
  R: {
    level1: [
      { word: "red", emoji: "🔴" },
      { word: "run", emoji: "🏃" },
      { word: "rat", emoji: "🐀" },
      { word: "rug", emoji: "🧶" },
    ],
    level2: [
      { word: "rabbit", emoji: "🐰" },
      { word: "carrot", emoji: "🥕" },
      { word: "star", emoji: "⭐" },
      { word: "rocket", emoji: "🚀" },
    ],
    level3: [
      { word: "rainbow", emoji: "🌈" },
      { word: "parrot", emoji: "🦜" },
      { word: "river", emoji: "🏞️" },
      { word: "dinosaur", emoji: "🦖" },
    ],
  },
  S: {
    level1: [
      { word: "sun", emoji: "☀️" },
      { word: "sad", emoji: "😢" },
      { word: "sit", emoji: "🪑" },
      { word: "bus", emoji: "🚌" },
    ],
    level2: [
      { word: "sock", emoji: "🧦" },
      { word: "pencil", emoji: "✏️" },
      { word: "mouse", emoji: "🐭" },
      { word: "sandwich", emoji: "🥪" },
    ],
    level3: [
      { word: "basket", emoji: "🧺" },
      { word: "castle", emoji: "🏰" },
      { word: "grasshopper", emoji: "🦗" },
      { word: "octopus", emoji: "🐙" },
    ],
  },
  TH: {
    level1: [
      { word: "thumb", emoji: "👍" },
      { word: "thin", emoji: "📏" },
      { word: "math", emoji: "➕" },
      { word: "path", emoji: "🛣️" },
    ],
    level2: [
      { word: "three", emoji: "3️⃣" },
      { word: "bath", emoji: "🛁" },
      { word: "teeth", emoji: "🦷" },
      { word: "mother", emoji: "👩" },
    ],
    level3: [
      { word: "thunder", emoji: "⛈️" },
      { word: "feather", emoji: "🪶" },
      { word: "marathon", emoji: "🏃‍♂️" },
      { word: "thermometer", emoji: "🌡️" },
    ],
  },
  L: {
    level1: [
      { word: "leg", emoji: "🦵" },
      { word: "lip", emoji: "👄" },
      { word: "log", emoji: "🪵" },
      { word: "bell", emoji: "🔔" },
    ],
    level2: [
      { word: "lion", emoji: "🦁" },
      { word: "leaf", emoji: "🍃" },
      { word: "ball", emoji: "⚽" },
      { word: "pillow", emoji: "🛏️" },
    ],
    level3: [
      { word: "lemon", emoji: "🍋" },
      { word: "balloon", emoji: "🎈" },
      { word: "alligator", emoji: "🐊" },
      { word: "umbrella", emoji: "☂️" },
    ],
  },
  Fluency: {
    level1: [
      { word: "The dog ran.", emoji: "🐶🏃" },
      { word: "I see a cat.", emoji: "👁️🐱" },
      { word: "Go up the hill.", emoji: "⬆️⛰️" },
    ],
    level2: [
      { word: "The big brown bear found a red balloon.", emoji: "🐻🎈" },
      { word: "My mother and brother went to the beach.", emoji: "👩👦🏖️" },
    ],
    level3: [
      { word: "She sells seashells by the seashore.", emoji: "🐚🌊" },
      { word: "Three fluffy rabbits ran around the garden.", emoji: "🐰🌷" },
      { word: "Look at the little yellow lemon on the leaf.", emoji: "🍋🍃" },
    ],
  },
};
