"use client";

import { useEffect, useCallback } from "react";

export function useBrowserNotification() {
  useEffect(() => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      void Notification.requestPermission(); // fire-and-forget
    }
  }, []);

  const notify = useCallback((topic: string, status: "DONE" | "FAILED", jobId: string) => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    const body = status === "DONE" ? "Distillato pronto" : "Elaborazione fallita";
    const n = new Notification(topic, { body, tag: jobId });
    // full reload intenzionale: Notification.onclick è fuori dal contesto React Router
    n.onclick = () => {
      window.focus();
      window.location.href = `/distill/${jobId}`;
    };
  }, []);

  return { notify };
}
