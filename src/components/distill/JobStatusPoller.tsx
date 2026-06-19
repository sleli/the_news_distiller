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
  const { notify } = useBrowserNotification();
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

  return null;
}
