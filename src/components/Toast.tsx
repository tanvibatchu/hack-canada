"use client";
import { useEffect, useState } from "react";

export interface ToastMessage {
  id: string; type: "success" | "error" | "info" | "achievement"; message: string; duration?: number;
}

let toastListeners: ((msg: ToastMessage) => void)[] = [];

export function toast(msg: Omit<ToastMessage, "id">) {
  const full: ToastMessage = { ...msg, id: crypto.randomUUID() };
  toastListeners.forEach((fn) => fn(full));
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (msg: ToastMessage) => {
      setToasts((prev) => [...prev, msg]);
      setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== msg.id)); }, msg.duration ?? 3500);
    };
    toastListeners.push(handler);
    return () => { toastListeners = toastListeners.filter((fn) => fn !== handler); };
  }, []);

  const icons = { success: "✅", error: "❌", info: "ℹ️", achievement: "🏆" };
  const colors = { success: "#58CC02", error: "#FF4B4B", info: "#1CB0F6", achievement: "#FFC800" };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "#fff", border: `1.5px solid ${colors[t.type]}40`,
          borderLeft: `4px solid ${colors[t.type]}`, borderRadius: 12,
          padding: "12px 18px", boxShadow: "0 8px 32px rgba(57,0,82,0.12)",
          fontSize: "0.9rem", fontWeight: 600, color: "#390052",
          fontFamily: "inherit", animation: "toast-in 0.25s ease-out",
          pointerEvents: "auto", maxWidth: 320,
        }}>
          <span style={{ fontSize: "1.2rem" }}>{icons[t.type]}</span>
          {t.message}
        </div>
      ))}
      <style>{`@keyframes toast-in { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
    </div>
  );
}
