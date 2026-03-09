# ArtiCue
Demo Video: https://youtu.be/nndhehSQGhc

### Closing the gap in Canadian speech therapy.

> Because Canadian kids can't wait 3 years for a speech therapist.
---

## The Problem

1 in 5 Canadian preschoolers has a speech or language impediment. The average wait for a government-funded speech-language pathologist is 8 months. Private therapy costs up to **$4,000/month**. Rural and remote communities have almost no access at all.

While children wait, they fall behind in school, lose confidence, and miss the critical window where early intervention matters most.

ArtiCue bridges that gap.

---

## What It Does

ArtiCue is an AI-powered speech therapy companion that gives Canadian children daily, clinically-grounded practice at home -- no waitlist, no appointment required.

**For kids:**
- Practice with Nova, a friendly animated coach powered by ElevenLabs
- 5 clinically-based exercises targeting real phoneme disorders
- Real-time pronunciation feedback powered by Gemini 2.5 Flash
- XP, streaks, and celebrations to keep kids engaged

**For parents:**
- Dashboard with accuracy trends and session history
- Weekly improvement rate and weeks-to-mastery predictions
- AI research chatbot backed by peer-reviewed sources from PubMed, Semantic Scholar, and ERIC

---

## Exercises

| Exercise | Clinical Basis |
|---|---|
| 🎤 Word Practice | Core articulation therapy |
| 🔤 Blend It! | DTTC methodology for childhood apraxia |
| 🎵 Rhyme Time | Phonological awareness development |
| 📍 Sound Hunt | Semantic feature analysis |
| 🔊 Speak Up! | LSVT LOUD voice clarity training |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, Tailwind CSS |
| AI Analysis | Google Gemini 2.5 Flash |
| Voice | ElevenLabs |
| Authentication | Auth0 |
| Database | Firebase Firestore |
| Animation | Lottie |
| Data Viz | Recharts |
| Research APIs | PubMed, Semantic Scholar, ERIC, OpenAlex |
| Deployment | Vercel |

---

## Architecture

### Agentic Session Loop
```
Child holds mic
  → MediaRecorder captures raw audio
  → Audio encoded as base64
  → POST /api/analyze (Gemini 2.5 Flash via inlineData)
  → Gemini listens and scores pronunciation
  → ElevenLabs generates Nova's voice response
  → nova-speaking browser event fires
  → Nova's Lottie animation syncs to her voice
  → Attempt saved to Firebase Firestore
  → generateSessionCelebration() fires at session end
  → predictImprovement() calculates mastery timeline
```

### Gemini Functions
- `analyzePhoneme()` — age-calibrated phoneme grading with developmental rubrics
- `analyzePronunciationAudio()` — multimodal: sends raw base64 audio directly to Gemini
- `analyzeVoiceAttempt()` — volume and clarity scoring for Speak Up! mode
- `generateSessionCelebration()` — personalised end-of-session message
- `predictImprovement()` — weekly improvement rate and weeks-to-mastery from session history

### Research Chatbot Pipeline
```
Parent question
  → SLP keyword classifier (rejects off-topic queries)
  → Firestore cache check
  → Parallel queries: PubMed + Semantic Scholar + ERIC
  → OpenAlex fallback if < 2 results
  → Deduplication and journal-tier filtering
  → Gemini synthesises only verified abstracts
  → Cited, parent-friendly answer returned
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- npm

### Install
```bash
git clone https://github.com/tanvibatchu/articue
cd articue
npm install
```

### Environment Variables
Create a `.env.local` file in the root directory:

```env
# Auth0
AUTH0_SECRET=
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_DOMAIN=

# Firebase (Server)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# AI
GEMINI_API_KEY=
NEXT_PUBLIC_GEMINI_API_KEY=
ELEVENLABS_API_KEY=
```

### Run
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Auth0 Setup

In your Auth0 application settings, add the following:

- **Allowed Callback URLs:** `http://localhost:3000/api/auth/callback`
- **Allowed Logout URLs:** `http://localhost:3000`
- **Allowed Web Origins:** `http://localhost:3000`

For production, replace `http://localhost:3000` with your Vercel deployment URL.

---

## Deployment

Deployed on Vercel. Every push to `main` triggers an automatic redeploy.

Add all environment variables from `.env.local` to your Vercel project settings before deploying.

---

## Team

Built at **Hack Canada** by Paras, Tanvi, Poneesh, and Parneet.

---

## What's Next

- Native iOS app via Capacitor
- SLP portal for therapists to assign exercises and track patients remotely
- French Canadian support for Quebec families
- Offline mode for rural and remote communities
- Push for provincial health coverage as a recognized digital therapy tool

---

## License

MIT
