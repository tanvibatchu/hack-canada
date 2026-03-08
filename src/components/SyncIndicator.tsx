"use client";
import { useDashboard } from "@/context/DashboardContext";

export default function SyncIndicator() {
  const { syncStatus, lastSynced } = useDashboard();
  const config = {
    online:  { dot: "#58CC02", label: "Live",     pulse: false },
    syncing: { dot: "#FFC800", label: "Syncing…", pulse: true  },
    offline: { dot: "#FF4B4B", label: "Offline",  pulse: false },
  }[syncStatus];
  const timeStr = lastSynced ? lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", fontWeight: 600, color: "#945F95", fontFamily: "inherit" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: config.dot, display: "inline-block", animation: config.pulse ? "sync-pulse 1.2s ease-in-out infinite" : "none" }} />
      <span>{config.label}</span>
      {timeStr && syncStatus === "online" && <span style={{ opacity: 0.6 }}>· {timeStr}</span>}
      <style>{`@keyframes sync-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}
