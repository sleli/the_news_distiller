"use client";

import { useState, useEffect, useCallback } from "react";
import { ArchiveCard, type ArchiveJobData } from "./ArchiveCard";

type FilterKey = "all" | "DONE" | "RUNNING" | "PENDING" | "FAILED";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Tutti" },
  { key: "DONE", label: "Completati" },
  { key: "RUNNING", label: "In elaborazione" },
  { key: "PENDING", label: "In coda" },
  { key: "FAILED", label: "Errori" },
];

interface ArchiveGridProps {
  initialJobs: ArchiveJobData[];
}

export function ArchiveGrid({ initialJobs }: ArchiveGridProps) {
  const [jobs, setJobs] = useState<ArchiveJobData[]>(initialJobs);
  const [filter, setFilter] = useState<FilterKey>("all");

  const hasLive = jobs.some((j) => j.status === "RUNNING" || j.status === "PENDING");

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/distill");
      if (!res.ok) return;
      const data: ArchiveJobData[] = await res.json();
      setJobs(data);
    } catch {
      // silently ignore — next tick will retry
    }
  }, []);

  useEffect(() => {
    if (!hasLive) return;
    const id = setInterval(fetchJobs, 5000);
    return () => clearInterval(id);
  }, [hasLive, fetchJobs]);

  const filtered = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  return (
    <div>
      {/* Filter chips */}
      <div
        data-testid="filter-chips"
        style={{
          display: "flex",
          gap: ".4rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            data-testid={`filter-${f.key}`}
            onClick={() => setFilter(f.key)}
            style={{
              fontFamily: "var(--font-stamp, 'Courier New', monospace)",
              fontSize: ".6rem",
              textTransform: "uppercase",
              letterSpacing: ".08em",
              border: `1px solid var(--ink)`,
              background: filter === f.key ? "var(--ink)" : "var(--paper)",
              color: filter === f.key ? "var(--paper)" : "var(--ink)",
              padding: ".2rem .55rem",
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
        {hasLive && (
          <span
            data-testid="polling-indicator"
            style={{
              fontFamily: "var(--font-stamp, 'Courier New', monospace)",
              fontSize: ".6rem",
              color: "#0055B8",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              alignSelf: "center",
            }}
          >
            ↻ Aggiornamento automatico attivo
          </span>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div data-testid="empty-state" className="np-rule-double" style={{ paddingTop: "1.5rem" }}>
          <span className="np-hl-kicker">Archivio vuoto</span>
          <p
            style={{
              fontFamily: "var(--font-body, Georgia, serif)",
              fontSize: ".88rem",
              margin: ".5rem 0 .8rem",
            }}
          >
            {filter === "all"
              ? "Non hai ancora nessun distillato. Crea la tua prima richiesta."
              : "Nessun distillato con questo stato."}
          </p>
          {filter === "all" && (
            <a
              href="/distill"
              data-testid="empty-cta"
              className="np-btn red"
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              ★ Crea il primo distillato
            </a>
          )}
        </div>
      )}

      {/* Grid */}
      {filtered.length > 0 && (
        <div
          data-testid="archive-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: ".75rem",
          }}
          className="np-archive-grid"
        >
          {filtered.map((job) => (
            <ArchiveCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
