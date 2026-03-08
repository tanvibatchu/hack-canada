"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/context/DashboardContext";
import type { UserMode } from "@/context/DashboardContext";

export default function ModeSwitcher({ compact = false }: { compact?: boolean }) {
  const { mode, setMode } = useDashboard();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pendingMode, setPendingMode] = useState<UserMode | null>(null);

  function requestSwitch(target: UserMode) {
    if (target === mode) return;
    setPendingMode(target);
    setConfirming(true);
  }

  function confirmSwitch() {
    if (!pendingMode) return;
    setMode(pendingMode);
    setConfirming(false);
    router.push(pendingMode === "parent" ? "/Parent?from=switch" : "/kid?from=switch");
  }

  function cancelSwitch() { setConfirming(false); setPendingMode(null); }

  if (compact) {
    return (
      <>
        {confirming && <ConfirmDialog mode={pendingMode!} onConfirm={confirmSwitch} onCancel={cancelSwitch} />}
        <button onClick={() => requestSwitch(mode === "kid" ? "parent" : "kid")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(57,0,82,0.08)", border: "1.5px solid rgba(57,0,82,0.15)", borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, color: "#390052", fontFamily: "inherit" }}>
          {mode === "kid" ? "👨‍👩‍👧 Parent View" : "🧒 Kid View"}
        </button>
      </>
    );
  }

  return (
    <>
      {confirming && <ConfirmDialog mode={pendingMode!} onConfirm={confirmSwitch} onCancel={cancelSwitch} />}
      <div style={{ display: "flex", alignItems: "center", background: "rgba(57,0,82,0.06)", border: "1.5px solid rgba(57,0,82,0.12)", borderRadius: 24, padding: 4, gap: 2 }}>
        {(["kid", "parent"] as UserMode[]).map((m) => (
          <button key={m} onClick={() => requestSwitch(m)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 20, border: "none", cursor: m === mode ? "default" : "pointer", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 700, background: m === mode ? (m === "kid" ? "#CE7DA5" : "#631D76") : "transparent", color: m === mode ? "#fff" : "#945F95" }}>
            {m === "kid" ? "🧒 Kid" : "👨‍👩‍👧 Parent"}
          </button>
        ))}
      </div>
    </>
  );
}

function ConfirmDialog({ mode, onConfirm, onCancel }: { mode: UserMode; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(57,0,82,0.35)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 32, maxWidth: 380, width: "90%", boxShadow: "0 24px 80px rgba(57,0,82,0.2)", textAlign: "center", fontFamily: "inherit" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>{mode === "parent" ? "👨‍👩‍👧" : "🧒"}</div>
        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#390052", marginBottom: 8 }}>Switch to {mode === "parent" ? "Parent" : "Kid"} Dashboard?</div>
        <p style={{ fontSize: "0.9rem", color: "#945F95", fontWeight: 500, lineHeight: 1.5, marginBottom: 24 }}>
          {mode === "parent" ? "You'll see the parent overview with progress data and goals." : "You'll switch to the kid's practice view."}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ padding: "10px 24px", borderRadius: 12, border: "1.5px solid rgba(57,0,82,0.15)", background: "#F9F4F1", color: "#945F95", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "10px 24px", borderRadius: 12, border: "none", background: mode === "parent" ? "#631D76" : "#CE7DA5", color: "#fff", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer", fontFamily: "inherit" }}>Switch →</button>
        </div>
      </div>
    </div>
  );
}
