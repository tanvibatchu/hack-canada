/**
 * Word banks for target sounds (R, S, TH, L) and fluency phrases. Each entry has word + emoji.
 * Import: wordBanks
 */

import type { SoundWordBank, WordBanksMap } from "@/types";

export const wordBanks: WordBanksMap = {
  R: {
    initial: [
      { word: "rabbit", emoji: "🐰" },
      { word: "rainbow", emoji: "🌈" },
      { word: "rocket", emoji: "🚀" },
    ],
    medial: [
      { word: "carrot", emoji: "🥕" },
      { word: "parrot", emoji: "🦜" },
      { word: "arrow", emoji: "🏹" },
    ],
    final: [
      { word: "star", emoji: "⭐" },
      { word: "bear", emoji: "🐻" },
      { word: "car", emoji: "🚗" },
    ],
  },
  S: {
    initial: [
      { word: "sun", emoji: "☀️" },
      { word: "sock", emoji: "🧦" },
      { word: "sandwich", emoji: "🥪" },
    ],
    medial: [
      { word: "pencil", emoji: "✏️" },
      { word: "basket", emoji: "🧺" },
      { word: "castle", emoji: "🏰" },
    ],
    final: [
      { word: "bus", emoji: "🚌" },
      { word: "grass", emoji: "🌿" },
      { word: "mouse", emoji: "🐭" },
    ],
  },
  TH: {
    initial: [
      { word: "thumb", emoji: "👍" },
      { word: "three", emoji: "3️⃣" },
      { word: "thunder", emoji: "⛈️" },
    ],
    medial: [
      { word: "feather", emoji: "🪶" },
      { word: "mother", emoji: "👩" },
      { word: "brother", emoji: "👦" },
    ],
    final: [
      { word: "bath", emoji: "🛁" },
      { word: "teeth", emoji: "🦷" },
      { word: "mouth", emoji: "👄" },
    ],
  },
  L: {
    initial: [
      { word: "lion", emoji: "🦁" },
      { word: "lemon", emoji: "🍋" },
      { word: "leaf", emoji: "🍃" },
    ],
    medial: [
      { word: "balloon", emoji: "🎈" },
      { word: "jelly", emoji: "🍮" },
      { word: "pillow", emoji: "🛏️" },
    ],
    final: [
      { word: "ball", emoji: "⚽" },
      { word: "bell", emoji: "🔔" },
      { word: "shell", emoji: "🐚" },
    ],
  },
  Fluency: {
    initial: [],
    medial: [],
    final: [
      { word: "The big brown bear found a red balloon.", emoji: "🐻🎈" },
      { word: "She sells seashells by the seashore.", emoji: "🐚🌊" },
      { word: "Three fluffy rabbits ran around the garden.", emoji: "🐰🌷" },
      { word: "Look at the little yellow lemon on the leaf.", emoji: "🍋🍃" },
      { word: "My mother and brother went to the beach.", emoji: "👩👦🏖️" },
    ],
  },
};
