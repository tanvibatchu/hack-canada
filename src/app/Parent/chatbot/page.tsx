"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface Source {
  title: string; authors: string; year: number | string;
  journal: string; abstract: string; url: string;
  source: "pubmed" | "semantic" | "eric" | "openalex"; openAccess: boolean;
}
interface Message {
  id: string; role: "user" | "assistant"; content: string;
  sources?: Source[]; cached?: boolean; loading?: boolean;
}

const SOURCE_META = {
  pubmed:   { label: "PubMed",           color: "#1CB0F6", bg: "#e8f7fd" },
  semantic: { label: "Semantic Scholar", color: "#631D76", bg: "#f3eaf6" },
  eric:     { label: "ERIC",             color: "#58CC02", bg: "#eef9e6" },
  openalex: { label: "OpenAlex",         color: "#FF9600", bg: "#fff5e6" },
};

const SUGGESTED = [
  "What is childhood apraxia of speech and how is it treated?",
  "How effective is DTTC therapy for children with apraxia?",
  "What are signs of a phonological disorder in a 4-year-old?",
  "How can I help my child practice speech sounds at home?",
  "What does research say about early intervention for language delays?",
  "How does stuttering develop in young children?",
];

function SourceCard({ source, index }: { source: Source; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SOURCE_META[source.source];
  return (
    <div style={{ background: "#fff", border: "1.5px solid rgba(57,0,82,0.1)", borderRadius: 14, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
        <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "#390052", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 800, color: "#fff" }}>{index + 1}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#390052", textDecoration: "none", lineHeight: 1.35, display: "block" }}>{source.title}</a>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "#945F95", fontWeight: 600 }}>{source.authors} · {source.year}</span>
            <span style={{ fontSize: "0.7rem", fontWeight: 700, background: meta.bg, color: meta.color, borderRadius: 6, padding: "2px 8px" }}>{meta.label}</span>
            {source.openAccess && <span style={{ fontSize: "0.7rem", fontWeight: 700, background: "#eef9e6", color: "#58CC02", borderRadius: 6, padding: "2px 8px" }}>Open Access</span>}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#945F95", marginTop: 3, fontStyle: "italic" }}>{source.journal}</div>
        </div>
      </div>
      {source.abstract && (
        <>
          <button onClick={() => setExpanded(!expanded)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700, color: "#945F95", padding: "4px 0", fontFamily: "inherit" }}>
            {expanded ? "▲ Hide abstract" : "▼ Show abstract"}
          </button>
          {expanded && <p style={{ fontSize: "0.8rem", color: "#631D76", lineHeight: 1.55, marginTop: 6, padding: "10px 12px", background: "#f9f4f1", borderRadius: 8 }}>{source.abstract}</p>}
        </>
      )}
      <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: "0.78rem", fontWeight: 700, color: "#1CB0F6", textDecoration: "none" }}>Read article →</a>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  if (message.loading) return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16 }}>
      <div style={{ background: "#fff", border: "1.5px solid rgba(57,0,82,0.1)", borderRadius: "18px 18px 18px 4px", padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#945F95", animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
        </div>
      </div>
    </div>
  );
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 20 }}>
      <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: isUser ? "#631D76" : "#fff", color: isUser ? "#fff" : "#390052", border: isUser ? "none" : "1.5px solid rgba(57,0,82,0.1)", borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "14px 18px", fontSize: "0.92rem", lineHeight: 1.6, fontWeight: 500 }}>
          {message.content.split(/(\[\d+\])/).map((part, i) => /^\[\d+\]$/.test(part) ? <strong key={i} style={{ color: isUser ? "#CE7DA5" : "#631D76" }}>{part}</strong> : part)}
          {message.cached && <span style={{ display: "block", fontSize: "0.65rem", marginTop: 6, opacity: 0.6 }}>⚡ Cached response</span>}
        </div>
        {message.sources && message.sources.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 800, color: "#945F95", textTransform: "uppercase", letterSpacing: "0.06em" }}>📚 Peer-reviewed sources</p>
            {message.sources.map((s, i) => <SourceCard key={i} source={s} index={i} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([{ id: "welcome", role: "assistant", content: "Hi! I'm ArtiCue's research assistant. I answer questions about speech and language therapy using only peer-reviewed academic research — every answer includes direct links to the source articles. What would you like to know?" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage(question?: string) {
    const q = (question ?? input).trim();
    if (!q || loading) return;
    setInput(""); setLoading(true);
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "user", content: q }, { id: crypto.randomUUID(), role: "assistant", content: "", loading: true }]);
    try {
      const res = await fetch("/api/chatbot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q }) });
      const data = await res.json();
      if (data.remaining !== undefined) setRemaining(data.remaining);
      setMessages(prev => [...prev.slice(0, -1), { id: crypto.randomUUID(), role: "assistant", content: data.error ?? data.answer ?? "Sorry, something went wrong.", sources: data.sources ?? [], cached: data.cached ?? false }]);
    } catch {
      setMessages(prev => [...prev.slice(0, -1), { id: crypto.randomUUID(), role: "assistant", content: "Sorry, I couldn't reach the research database. Please try again." }]);
    } finally { setLoading(false); inputRef.current?.focus(); }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Nunito', sans-serif; }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-6px);opacity:1} }
        textarea:focus { outline: none; }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#F9F4F1" }}>
        <header style={{ background: "#fff", borderBottom: "1.5px solid rgba(57,0,82,0.1)", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/Parent" style={{ fontSize: "1.4rem", color: "#945F95", textDecoration: "none" }}>←</Link>
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#390052" }}>📚 Research Assistant</div>
              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "#945F95", letterSpacing: "0.04em" }}>PEER-REVIEWED SOURCES ONLY</div>
            </div>
          </div>
          {remaining !== null && <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#945F95", background: "rgba(57,0,82,0.06)", borderRadius: 10, padding: "4px 10px" }}>{remaining} questions left today</div>}
        </header>
        <div style={{ background: "rgba(255,200,0,0.12)", borderBottom: "1px solid rgba(255,200,0,0.3)", padding: "8px 24px", fontSize: "0.75rem", fontWeight: 600, color: "#7a5c00", textAlign: "center", flexShrink: 0 }}>
          ⚠️ For educational purposes only — not a replacement for a licensed Speech-Language Pathologist.
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 8px" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
            {messages.length === 1 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: "0.75rem", fontWeight: 800, color: "#945F95", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Suggested questions</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {SUGGESTED.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q)} style={{ background: "#fff", border: "1.5px solid rgba(57,0,82,0.1)", borderRadius: 12, padding: "10px 14px", textAlign: "left", cursor: "pointer", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 600, color: "#390052" }}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
        <div style={{ background: "#fff", borderTop: "1.5px solid rgba(57,0,82,0.1)", padding: "16px 24px", flexShrink: 0 }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }}} placeholder="Ask about speech therapy, milestones, techniques…" rows={2} disabled={loading}
              style={{ flex: 1, border: "1.5px solid rgba(57,0,82,0.15)", borderRadius: 14, padding: "12px 16px", fontSize: "0.9rem", fontFamily: "inherit", fontWeight: 500, color: "#390052", background: "#F9F4F1", resize: "none", lineHeight: 1.5 }} />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              style={{ width: 46, height: 46, borderRadius: 12, border: "none", background: loading || !input.trim() ? "rgba(57,0,82,0.1)" : "#631D76", color: loading || !input.trim() ? "#945F95" : "#fff", cursor: loading || !input.trim() ? "not-allowed" : "pointer", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {loading ? "⏳" : "→"}
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: "0.68rem", color: "#945F95", marginTop: 8, fontWeight: 600 }}>Searches PubMed · Semantic Scholar · E.R.I.C · OpenAlex — peer-reviewed journals only</p>
        </div>
      </div>
    </>
  );
}
