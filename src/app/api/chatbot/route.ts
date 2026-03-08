import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth0";
import { searchAcademicSources } from "@/lib/academicSearch";
import { getCachedAnswer, setCachedAnswer } from "@/lib/chatbotCache";
import { classifyQuery, checkRateLimit } from "@/lib/chatbotClassifier";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { allowed, remaining } = await checkRateLimit(user.userId);
    if (!allowed) return NextResponse.json({ error: "Daily question limit reached (20/day). Please try again tomorrow." }, { status: 429 });

    const { question } = await request.json();
    if (!question || typeof question !== "string" || question.trim().length < 5)
      return NextResponse.json({ error: "Please ask a complete question." }, { status: 400 });

    const q = question.trim().slice(0, 500);

    const classification = classifyQuery(q);
    if (!classification.relevant) return NextResponse.json({ answer: classification.rejection, sources: [], cached: false, remaining });

    const cached = await getCachedAnswer(q);
    if (cached) return NextResponse.json({ answer: cached.answer, sources: cached.sources, cached: true, remaining });

    const sources = await searchAcademicSources(q);
    if (sources.length === 0) return NextResponse.json({
      answer: "I couldn't find peer-reviewed research on that specific question in our journal collection. Please consult a licensed Speech-Language Pathologist for personalised advice.",
      sources: [], cached: false, remaining,
    });

    const sourceBlocks = sources.map((s, i) =>
      `[${i + 1}] "${s.title}" — ${s.authors} (${s.year}), ${s.journal}\nAbstract: ${s.abstract}`
    ).join("\n\n");

    const prompt = `You are a warm assistant helping parents of children with speech and language disorders.
Answer using ONLY the research abstracts below. Be empathetic and clear. Never diagnose.

PARENT QUESTION: ${q}

PEER-REVIEWED RESEARCH:
${sourceBlocks}

RULES:
- Answer in 4-6 sentences max
- Reference papers by number e.g. [1]
- Use simple, warm language
- End with: "Please consult a licensed Speech-Language Pathologist for advice tailored to your child."
- Do NOT invent information not in the abstracts`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    await setCachedAnswer(q, answer, sources);
    return NextResponse.json({ answer, sources, cached: false, remaining });

  } catch (error) {
    console.error("Chatbot error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
