"use client";
import { useRouter } from "next/navigation";

export default function ChangeUserButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/onboarding")}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        background: "rgba(57,0,82,0.07)",
        border: "1.5px solid rgba(57,0,82,0.15)",
        borderRadius: 20, padding: "5px 14px",
        cursor: "pointer", fontSize: "0.78rem",
        fontWeight: 700, color: "#390052",
        fontFamily: "inherit", transition: "background 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(57,0,82,0.13)")}
      onMouseLeave={e => (e.currentTarget.style.background = "rgba(57,0,82,0.07)")}
    >
      👤 Change User
    </button>
  );
}
