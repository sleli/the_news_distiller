"use client";

import { useState, useCallback } from "react";

type PermissionState = "granted" | "denied" | "default" | "unsupported";

function getPermission(): PermissionState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export function useBrowserNotification() {
  const [permission, setPermission] = useState<PermissionState>(getPermission);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const notify = useCallback(
    (topic: string, status: "DONE" | "FAILED", jobId: string) => {
      if (permission !== "granted") return;
      const body = status === "DONE" ? "Distillato pronto" : "Elaborazione fallita";
      const n = new Notification(topic, { body, tag: jobId });
      n.onclick = () => {
        window.focus();
        window.location.href = `/distill/${jobId}`;
      };
    },
    [permission]
  );

  return { notify, permission, requestPermission };
}
