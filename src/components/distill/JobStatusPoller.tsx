"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useBrowserNotification } from "@/hooks/useBrowserNotification";

interface Props {
  jobId: string;
  topic: string;
  initialStatus: string;
}

export function JobStatusPoller({ jobId, topic, initialStatus }: Props) {
  const router = useRouter();
  const { notify, permission, requestPermission } = useBrowserNotification();
  const statusRef = useRef(initialStatus);

  const isLive = initialStatus === "PENDING" || initialStatus === "RUNNING";

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
            notify(topic, data.status, jobId);
            router.refresh();
          }
        }
      } catch {
        // retry next tick
      }
    }, 5000);

    return () => clearInterval(id);
  }, [isLive, jobId, topic, notify, router]);

  if (!isLive || permission !== "default") {
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
        data-testid="notification-enable"
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
