"use client";
import { useEffect, useRef, useCallback } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { useDashboard } from "@/context/DashboardContext";
import { toast } from "@/components/Toast";

export function useDashboardSync() {
  const { user } = useUser();
  const { setUserId, syncStatus } = useDashboard();
  const prevStatus = useRef(syncStatus);

  useEffect(() => {
    if (user?.sub) setUserId(user.sub);
  }, [user?.sub, setUserId]);

  useEffect(() => {
    if (prevStatus.current === syncStatus) return;
    if (syncStatus === "offline" && prevStatus.current === "online") {
      toast({ type: "error", message: "Lost connection — changes will sync when reconnected." });
    }
    if (syncStatus === "online" && prevStatus.current === "offline") {
      toast({ type: "success", message: "Back online — data synced!" });
    }
    prevStatus.current = syncStatus;
  }, [syncStatus]);
}

export function useDebounced<T extends (...args: Parameters<T>) => void>(fn: T, delay = 600) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  return useCallback((...args: Parameters<T>) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}
