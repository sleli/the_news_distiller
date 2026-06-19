"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Props {
  jobId: string;
  topic: string;
  initialStatus: string;
}

type PermissionState = "granted" | "denied" | "default" | "unsupported";

function getPermission(): PermissionState {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export function JobStatusPoller({ jobId, topic, initialStatus }: Props) {
  const router = useRouter();
  const statusRef = useRef(initialStatus);
  const [permission, setPermission] = useState<PermissionState>(getPermission);

  const isLive = initialStatus === "PENDING" || initialStatus === "RUNNING";

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, []);

  const notify = useCallback(
    (status: "DONE" | "FAILED") => {
      if (permission !== "granted") return;
      const body = status === "DONE" ? "Distillato pronto" : "Elaborazione fallita";
      const n = new Notification(topic, { body, tag: jobId });
      n.onclick = () => {
        window.focus();
        window.location.href = `/distill/${jobId}`;
      };
    },
    [permission, topic, jobId]
  );

  useEffect(() => {
    if (!isLive) return;

    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/distill/${jobId}`);
        if (!res.ok) return;
        const data: { status: string } = await res.json();
        if (data.status !== statusRef.current) {
          statusRef.current = data.status;
          if (data.status === "DONE" || data.status === "FAILED") {
            notify(data.status);
            router.refresh();
          }
        }
      } catch {
        // retry next tick
      }
    }, 5000);

    return () => clearInterval(id);
  }, [isLive, jobId, notify, router]);

  if (!isLive || permission === "granted" || permission === "unsupported" || permission === "denied") {
    return null;
  }

  return (
    <div
      data-testid="notification-prompt"
      style={{
        marginTop: ".8rem",
        padding: ".5rem .75rem",
        background: "var(--paper)",
        border: "1px solid var(--ink-light, #ccc)",
        borderLeft: "3px solid #0055B8",
        fontFamily: "var(--font-body, Georgia, serif)",
        fontSize: ".78rem",
        color: "var(--ink-mid)",
        display: "flex",
        alignItems: "center",
        gap: ".75rem",
        flexWrap: "wrap",
      }}
    >
      <span>Abilita le notifiche browser per sapere quando il distillato è pronto.</span>
      <button
        onClick={requestPermission}
        style={{
          fontFamily: "var(--font-deck, 'Arial Narrow', sans-serif)",
          fontSize: ".6rem",
          textTransform: "uppercase",
          letterSpacing: ".08em",
          border: "1px solid #0055B8",
          background: "#0055B8",
          color: "#fff",
          padding: ".2rem .55rem",
          cursor: "pointer",
        }}
      >
        Abilita
      </button>
    </div>
  );
}
