# Echo — System Design Document
### Hack Canada 2026 | Speech Therapy Companion for Kids

---

## What We're Building

**Echo** is a two-sided web app that helps Canadian kids with speech impediments practice between therapy sessions. The app has a **kid-facing side** (fun, game-like, guided by an animated companion named Nova) and a **parent-facing side** (progress dashboard, predicted improvement timeline, shareable SLP reports).

**The problem it solves:** 750,000+ Canadian kids have speech or language disorders. Public SLP waitlists are 12–18 months. Private sessions cost $150–250/hour. Echo bridges the gap.

**Theme fit:** Solving Problems Canadians Face — healthcare accessibility crisis.

---

## Prize Targets

| Prize | Why We Qualify |
|---|---|
| Hack Canada Overall (up to $1st place) | Canadian healthcare gap + emotional story + technical depth |
| Gemini API | Phoneme analysis + predicted improvement are load-bearing |
| ElevenLabs | Nova's voice + word demonstration IS the product |
| Auth0 | Google Sign-In for parent accounts |
| Stan ($250) | 3 LinkedIn posts documenting the build |

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js (App Router) | Two-sided app needs clean routing; deploys to Vercel in one click |
| Auth | Auth0 (Google Sign-In) | Parent accounts, qualifies for Auth0 prize |
| AI Analysis | Gemini API (gemini-1.5-flash) | Phoneme detection + session analysis + predicted improvement |
| Voice Output | ElevenLabs TTS | Nova speaks to the child; demonstrates correct pronunciation |
| Speech Input | Web Speech API (browser built-in) | Captures child's voice, free, no extra dependency |
| Database | Firebase Firestore | Stores sessions, progress, streaks |
| Animation | Lottie (lottiefiles.com) | Nova's animated states, free JSON animations |
| Charts | Recharts | Parent dashboard progress graphs |
| Styling | Tailwind CSS | Fast, consistent UI |
| Deployment | Vercel | Free, instant, one command |

---

## Project File Structure

```
echo/
├── app/
│   ├── page.tsx                  → Landing page + Google Sign-In
│   ├── onboarding/
│   │   └── page.tsx              → Parent setup (child name, age, target sounds)
│   ├── parent/
│   │   └── page.tsx              → Parent dashboard
│   └── kid/
│       └── page.tsx              → Kid side (Nova + practice session)
├── components/
│   ├── Nova.tsx                  → Animated Lottie character, 4 states
│   ├── MicButton.tsx             → Record button + live waveform visualizer
│   ├── WordCard.tsx              → Word display + emoji illustration
│   ├── MouthDiagram.tsx          → Animated tongue/lip placement guide
│   ├── ProgressChart.tsx         → Recharts accuracy over time + projection line
│   ├── CelebrationBurst.tsx      → Confetti/stars on correct answer
│   ├── SessionSummary.tsx        → End-of-session XP + accuracy recap
│   └── NotificationPreview.tsx   → Practice reminder preview
├── lib/
│   ├── gemini.ts                 → All Gemini API calls
│   ├── elevenlabs.ts             → TTS utility functions
│   ├── firebase.ts               → Firestore read/write helpers
│   ├── speechCapture.ts          → Web Speech API wrapper
│   └── wordBanks.ts              → All practice words by sound + position
├── public/
│   └── nova/
│       ├── idle.json             → Nova breathing/idle Lottie
│       ├── celebrating.json      → Nova jumping/happy Lottie
│       ├── thinking.json         → Nova tilted head Lottie
│       └── encouraging.json      → Nova thumbs up Lottie
└── .env.local
    ├── GEMINI_API_KEY
    ├── ELEVENLABS_API_KEY
    ├── AUTH0_SECRET
    ├── AUTH0_BASE_URL
    ├── AUTH0_ISSUER_BASE_URL
    ├── AUTH0_CLIENT_ID
    ├── AUTH0_CLIENT_SECRET
    └── NEXT_PUBLIC_FIREBASE_CONFIG
```

---

## App Architecture — Two Sides

### Side 1: Kid Side (`/kid`)

The child never sees the parent dashboard. This side is full-screen, colorful, and designed for ages 4–10.

**Screen flow:**
```
Nova greeting → Word appears → Nova demonstrates pronunciation
→ Child speaks into mic → Waveform shows → Gemini analyzes
→ If correct: celebration + XP + next word
→ If needs work: Nova redirects warmly + mouth diagram + try again
→ After 8–10 words: Session summary screen
```

**Nova's 4 animation states:**
- `idle` — Nova breathing, blinking, waiting
- `celebrating` — Nova jumps, stars burst, big smile
- `thinking` — Nova tilts head, curious expression
- `encouraging` — Nova thumbs up, warm smile

**Nova's voice rules (ElevenLabs):**
- Always warm, never frustrated
- Never says "wrong" or "no"
- Celebrates every attempt, correct or not
- On correct: *"Amazing! You nailed the R sound!"*
- On incorrect: *"Ooh so close! Watch where my tongue goes — let's try together"*
- Demonstrates word: slowly first (stretching target sound), then normal speed

**Gamification layer:**
- XP earned per session (10 XP per correct attempt)
- Streak counter (days in a row practiced)
- Badge system: "R Sound Rookie" → "R Sound Pro" → "R Sound Master"
- Nova has different outfit each day (keeps kids returning)

---

### Side 2: Parent Side (`/parent`)

Clean, calm, informative. Designed for adults who want progress data.

**Dashboard components:**
- Child profile cards (if multiple children)
- Weekly accuracy chart per target sound (line chart, Recharts)
- Predicted improvement timeline: *"At this pace, Maya reaches 80% mastery in ~3 weeks"*
- Session history table: date, duration, sound practiced, accuracy %
- Badge progress
- One-tap PDF export for sharing with real SLP
- Notification settings: set daily practice reminder time

---

## Firebase Data Structure

```javascript
// Firestore schema
users/{userId}/
  profile: {
    email: string,
    name: string,
    role: "parent"
  }

  children/{childId}/
    profile: {
      name: string,           // "Maya"
      age: number,            // 6
      targetSounds: string[], // ["r", "s", "th", "l"]
      novaColor: "purple",
      streak: number,
      lastSessionDate: timestamp,
      totalXP: number
    }

    sessions/{sessionId}/
      date: timestamp,
      durationSeconds: number,
      targetSound: string,
      attempts: [
        {
          word: string,
          transcript: string,     // what child actually said
          score: number,          // 0-100
          correct: boolean,
          substitution: string    // e.g. "said 'wabbit' for 'rabbit'"
        }
      ],
      averageAccuracy: number

    badges/{badgeId}/
      id: string,
      name: string,
      earnedAt: timestamp
```

---

## Gemini API — Exact Prompts

### Prompt 1: Real-time Phoneme Analysis
Called after every word attempt. Returns JSON instantly.

```typescript
const phonemeAnalysisPrompt = `
You are a pediatric speech-language pathologist assistant.

Child age: ${age}
Target sound: ${targetSound} (e.g., "r")
Target word: ${word} (e.g., "rabbit")
What the child said (transcription): ${transcript}

Analyze and respond in JSON only, no other text:
{
  "correct": boolean,
  "score": number (0-100),
  "substitution": string or null (e.g., "replaced r with w"),
  "feedback": string (max 12 words, child-friendly, encouraging),
  "mouthCue": string (one sentence: where tongue/lips should be),
  "tryAgain": boolean
}
`;
```

### Prompt 2: Predicted Improvement (Parent Dashboard)
Called once when parent loads dashboard. Uses session history.

```typescript
const predictionPrompt = `
You are analyzing a child's speech therapy practice data.

Child age: ${age}
Target sound: "${sound}"
Session data (last 14 days):
${JSON.stringify(sessionHistory)}

Respond in JSON only, no other text:
{
  "currentAccuracy": number (percentage),
  "weeklyImprovementRate": number (percentage points per week),
  "weeksToMastery": number (to reach 80% — clinical threshold),
  "bestDayOfWeek": string or null,
  "parentInsight": string (2 sentences max, specific and encouraging),
  "trend": "improving" | "plateau" | "inconsistent"
}
`;
```

### Prompt 3: Session Summary
Called at end of each session.

```typescript
const summaryPrompt = `
Child just completed a speech practice session.

Sound practiced: ${sound}
Words attempted: ${attempts.length}
Accuracy: ${accuracy}%
Specific errors: ${JSON.stringify(errors)}

Write one celebratory sentence (max 15 words) for the child to hear.
Write one specific tip (max 20 words) for the parent to read.
Respond in JSON: { "kidMessage": string, "parentTip": string }
`;
```

---

## ElevenLabs Integration

```typescript
// lib/elevenlabs.ts

const NOVA_VOICE_ID = "YOUR_VOICE_ID"; // Use "Aria" or create custom

export async function speakAsNova(text: string): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${NOVA_VOICE_ID}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.7,
          similarity_boost: 0.8,
          style: 0.3,           // warm and expressive
          use_speaker_boost: true
        }
      })
    }
  );
  return response.arrayBuffer();
}

// Demonstrate a word with target sound emphasized
export async function demonstrateWord(
  word: string,
  targetSound: string
): Promise<void> {
  // Slow version first (stretch the target sound)
  // e.g., "r" sound in "rabbit" → "r-r-r-rabbit"
  const slowVersion = emphasizeSound(word, targetSound);
  await speakAsNova(slowVersion);
  await delay(800);
  // Normal speed
  await speakAsNova(word);
}
```

---

## Web Speech API — Voice Capture

```typescript
// lib/speechCapture.ts

export function startListening(
  onResult: (transcript: string, confidence: number) => void,
  onError: (error: string) => void
): SpeechRecognition {
  const recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();

  recognition.lang = "en-CA"; // Canadian English specifically
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;

  recognition.onresult = (event) => {
    const result = event.results[0][0];
    onResult(result.transcript.toLowerCase(), result.confidence);
  };

  recognition.onerror = (event) => onError(event.error);
  recognition.start();
  return recognition;
}
```

---

## Word Banks — All 5 Target Sounds

Clinically ordered: initial position → medial → final (how real SLPs do it)

```typescript
// lib/wordBanks.ts

export const wordBanks = {
  r: {
    initial: [
      { word: "rabbit", emoji: "🐰" },
      { word: "rainbow", emoji: "🌈" },
      { word: "rocket", emoji: "🚀" },
      { word: "ring", emoji: "💍" },
      { word: "river", emoji: "🏞️" },
    ],
    medial: [
      { word: "carrot", emoji: "🥕" },
      { word: "parrot", emoji: "🦜" },
      { word: "arrow", emoji: "🏹" },
      { word: "mirror", emoji: "🪞" },
      { word: "berry", emoji: "🍓" },
    ],
    final: [
      { word: "star", emoji: "⭐" },
      { word: "bear", emoji: "🐻" },
      { word: "car", emoji: "🚗" },
      { word: "door", emoji: "🚪" },
      { word: "four", emoji: "4️⃣" },
    ],
  },
  s: {
    initial: [
      { word: "sun", emoji: "☀️" },
      { word: "sock", emoji: "🧦" },
      { word: "sandwich", emoji: "🥪" },
      { word: "seven", emoji: "7️⃣" },
      { word: "soap", emoji: "🧼" },
    ],
    medial: [
      { word: "pencil", emoji: "✏️" },
      { word: "basket", emoji: "🧺" },
      { word: "castle", emoji: "🏰" },
      { word: "bison", emoji: "🦬" },
      { word: "whisper", emoji: "🤫" },
    ],
    final: [
      { word: "bus", emoji: "🚌" },
      { word: "grass", emoji: "🌿" },
      { word: "mouse", emoji: "🐭" },
      { word: "house", emoji: "🏠" },
      { word: "dress", emoji: "👗" },
    ],
  },
  th: {
    initial: [
      { word: "thumb", emoji: "👍" },
      { word: "three", emoji: "3️⃣" },
      { word: "thunder", emoji: "⛈️" },
      { word: "think", emoji: "💭" },
      { word: "thorn", emoji: "🌹" },
    ],
    medial: [
      { word: "feather", emoji: "🪶" },
      { word: "mother", emoji: "👩" },
      { word: "brother", emoji: "👦" },
      { word: "bathtub", emoji: "🛁" },
      { word: "birthday", emoji: "🎂" },
    ],
    final: [
      { word: "bath", emoji: "🛁" },
      { word: "teeth", emoji: "🦷" },
      { word: "mouth", emoji: "👄" },
      { word: "earth", emoji: "🌍" },
      { word: "north", emoji: "🧭" },
    ],
  },
  l: {
    initial: [
      { word: "lion", emoji: "🦁" },
      { word: "lemon", emoji: "🍋" },
      { word: "leaf", emoji: "🍃" },
      { word: "lamp", emoji: "💡" },
      { word: "lake", emoji: "🏞️" },
    ],
    medial: [
      { word: "balloon", emoji: "🎈" },
      { word: "jelly", emoji: "🍮" },
      { word: "pillow", emoji: "🛏️" },
      { word: "yellow", emoji: "💛" },
      { word: "melon", emoji: "🍈" },
    ],
    final: [
      { word: "ball", emoji: "⚽" },
      { word: "bell", emoji: "🔔" },
      { word: "shell", emoji: "🐚" },
      { word: "hill", emoji: "⛰️" },
      { word: "owl", emoji: "🦉" },
    ],
  },
  fluency: {
    phrases: [
      { word: "The big brown bear", emoji: "🐻" },
      { word: "I like to play outside", emoji: "🌳" },
      { word: "My dog is very friendly", emoji: "🐶" },
      { word: "The sun is shining today", emoji: "☀️" },
      { word: "I want some apple juice", emoji: "🍎" },
    ],
  },
};
```

---

## Build Order (Hackathon Timeline)

Follow this order strictly — each step produces something demoable.

### Hour 1–2: Foundation
- `npx create-next-app@latest echo --typescript --tailwind --app`
- Install Auth0: `npm install @auth0/nextjs-auth0`
- Set up Google Sign-In via Auth0 dashboard
- Create `/parent` and `/kid` routes
- Basic layout: two different pages load after login

**Checkpoint:** Can log in with Google and see two separate pages ✓

### Hour 3–4: Kid Side UI (no AI yet)
- Build `WordCard.tsx` — word + emoji, big and friendly
- Build `MicButton.tsx` — large circular button, purple, mic icon
- Build `Nova.tsx` — placeholder image or basic Lottie
- Wire up basic session state: current word, word index, score

**Checkpoint:** Kid side looks great, button works visually ✓

### Hour 5–6: Core AI Loop
- Wire up Web Speech API in `speechCapture.ts`
- Call Gemini with Prompt 1 after each attempt
- Parse JSON response, update score state
- Show simple text feedback (no Nova voice yet)

**Checkpoint:** Speak a word, get a real score back from Gemini ✓

### Hour 7–8: Nova's Voice + Celebrations
- Wire up ElevenLabs in `elevenlabs.ts`
- Nova speaks the word before child attempts
- Nova gives voiced feedback after attempt
- Add `CelebrationBurst.tsx` — confetti/stars on correct
- Add `MouthDiagram.tsx` — simple SVG showing tongue placement

**Checkpoint:** Full kid-side loop works end to end ✓

### Hour 9–10: Parent Dashboard
- Set up Firebase Firestore
- Write session data after each session completes
- Build `ProgressChart.tsx` with Recharts
- Call Gemini Prompt 2 for predicted improvement
- Display prediction: "X weeks to mastery"

**Checkpoint:** Parent can see real charts with real data ✓

### Hour 11–12: Polish + Gamification
- Streak counter logic
- Badge system (3 badges per sound)
- Nova outfit variation by day
- Onboarding flow cleanup
- Mobile responsive check

### Final 2 Hours: Ship It
- Deploy to Vercel: `vercel --prod`
- Record demo video (see demo script below)
- Write README (see template below)
- Submit on Devpost
- Post 3 LinkedIn updates via Stanley (Stan prize)

---

## Demo Script (90 seconds for judges)

1. Open app — show landing page
2. Sign in with Google as parent
3. Show onboarding: "My daughter Maya, age 6, struggles with R sounds"
4. Switch to kid view — Nova animates in, greets Maya
5. Word appears: RABBIT 🐰
6. Nova speaks: *"Can you say... rabbit?"*
7. Speak "wabbit" into mic — waveform appears
8. Nova gently redirects, mouth diagram appears
9. Speak "rabbit" correctly — stars explode, XP goes up
10. Switch to parent dashboard — show accuracy chart going up
11. Point to prediction: *"At this pace: 3 weeks to mastery"*
12. **Say this:** "This is what $200/hour of speech therapy looks like — free, available at 2am, with infinite patience."

---

## README Template

```markdown
# Echo 🌟 — Speech Therapy Companion for Kids

> Because no child should wait 18 months to learn to say their own name.

## The Problem
6.5 million Canadians lack a family doctor. For children with speech disorders,
public SLP waitlists stretch 12–18 months across every province.
750,000 Canadian kids have speech or language disorders.
The early intervention window — ages 2–7 — closes while families wait.

## What Echo Does
Echo gives kids a warm, patient, game-like companion named Nova who listens to
how they speak, identifies specific phoneme errors, and guides them toward
correct pronunciation — one word at a time.

Parents get a real-time dashboard with accuracy trends and predicted improvement
timelines they can share directly with their SLP.

## How It Works
1. Parent signs in with Google, sets up child profile + target sounds
2. Kid side: Nova guides a 5-minute daily session (8–10 words)
3. Child speaks into mic — Web Speech API captures the attempt
4. Gemini analyzes the phoneme accuracy in real time
5. ElevenLabs voices Nova's warm, specific feedback
6. Firebase stores every session — parent dashboard shows progress over time
7. Gemini predicts weeks to mastery based on improvement rate

## Tech Stack
- Next.js + TypeScript
- Gemini API (phoneme analysis + predictions)
- ElevenLabs (Nova's voice)
- Auth0 (Google Sign-In)
- Firebase Firestore
- Web Speech API
- Recharts + Lottie

## Target Sounds
R • S • TH • L • Fluency/Stuttering

## Try It
[Live Demo Link]

## Team
[Your names]
```

---

## Environment Variables Needed

```bash
# .env.local
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
AUTH0_SECRET=
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://YOUR_DOMAIN.auth0.com
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

---

## Key Design Rules (Do Not Break These)

- **Nova never says "wrong" or "no"** — only redirects warmly
- **Sessions are max 5 minutes** — kids with speech issues often have attention challenges too
- **Zero failure states** — no red X, no buzzer, no score shown to child (only XP)
- **Parents see accuracy, kids see XP** — same data, framed differently
- **This is NOT a replacement for SLP** — always frame as a bridge/supplement
- **Canadian English specifically** — Web Speech API lang = "en-CA"

---

*Built at Hack Canada 2026. Echo is a prototype — not a medical device.*
