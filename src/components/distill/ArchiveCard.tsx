"use client";

import Link from "next/link";

export interface ArchiveJobData {
  id: string;
  topic: string;
  tone: string;
  status: string;
  createdAt: string;
  snippet: string | null;
  sourceCount: number | null;
  positionCount: number | null;
}

const STATUS_BORDER: Record<string, string> = {
  PENDING: "#C8A000",
  RUNNING: "#0055B8",
  DONE: "#007A2F",
  FAILED: "#B80019",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "In coda",
  RUNNING: "In elaborazione",
  DONE: "Completato",
  FAILED: "Errore",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface ArchiveCardProps {
  job: ArchiveJobData;
  onDelete?: (id: string) => void;
}

export function ArchiveCard({ job, onDelete }: ArchiveCardProps) {
  const borderColor = STATUS_BORDER[job.status] ?? "#7A6035";
  const statusLabel = STATUS_LABEL[job.status] ?? job.status;
  const isDone = job.status === "DONE";
  const isFailed = job.status === "FAILED";
  const isRunning = job.status === "RUNNING";

  const cardStyle: React.CSSProperties = {
    borderTop: `2px solid #160E02`,
    borderRight: `2px solid #160E02`,
    borderBottom: `2px solid #160E02`,
    borderLeft: `4px solid ${borderColor}`,
    padding: ".6rem .75rem",
    marginBottom: ".75rem",
    background: "var(--paper)",
    position: "relative",
    transition: "box-shadow .12s",
  };

  return (
    <article data-testid="archive-card" data-status={job.status} style={cardStyle}>
      {/* Bottone cestino vintage */}
      {onDelete && (
        <button
          data-testid="delete-btn"
          onClick={() => onDelete(job.id)}
          title="Elimina distillato"
          style={{
            position: "absolute",
            top: ".4rem",
            right: ".4rem",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px",
            color: "var(--ink-faded)",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--np-red, #B80019)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-faded)";
          }}
        >
          {/* SVG cestino vintage stroke-only 14x16px */}
          <svg
            width="14"
            height="16"
            viewBox="0 0 14 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* Coperchio */}
            <polyline points="1,3 13,3" />
            <path d="M4,3 L4,1.5 C4,1.2 4.2,1 4.5,1 L9.5,1 C9.8,1 10,1.2 10,1.5 L10,3" />
            {/* Corpo */}
            <path d="M2,3 L2.7,14.2 C2.75,14.65 3.15,15 3.6,15 L10.4,15 C10.85,15 11.25,14.65 11.3,14.2 L12,3" />
            {/* Linee interne */}
            <line x1="5" y1="6" x2="5" y2="12" />
            <line x1="7" y1="6" x2="7" y2="12" />
            <line x1="9" y1="6" x2="9" y2="12" />
          </svg>
        </button>
      )}

      {/* Topic */}
      <div
        data-testid="card-topic"
        style={{
          fontFamily: "var(--font-head, 'Times New Roman', serif)",
          fontWeight: 900,
          fontSize: ".88rem",
          textTransform: "uppercase",
          lineHeight: 1.25,
          marginBottom: ".3rem",
          paddingRight: onDelete ? "1.5rem" : 0,
        }}
      >
        {isDone || isFailed ? (
          <Link
            href={`/distill/${job.id}`}
            data-testid="card-link"
            style={{ color: "var(--ink)", textDecoration: "underline" }}
          >
            {job.topic}
          </Link>
        ) : (
          job.topic
        )}
      </div>

      {/* Meta row */}
      <div
        style={{
          fontFamily: "var(--font-stamp, 'Courier New', monospace)",
          fontSize: ".6rem",
          color: "var(--ink-faded)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          display: "flex",
          gap: ".6rem",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: ".3rem",
        }}
      >
        <span data-testid="card-date">{formatDate(job.createdAt)}</span>
        <span>—</span>
        <span data-testid="card-tone">{job.tone}</span>
        <span>—</span>
        <span
          data-testid="card-status"
          style={{
            color: borderColor,
            border: `1px solid ${borderColor}`,
            padding: ".05rem .3rem",
          }}
        >
          {statusLabel}
        </span>
        {isDone && job.sourceCount !== null && job.positionCount !== null && (
          <>
            <span>—</span>
            <span data-testid="card-counts">
              {job.sourceCount} fonti — {job.positionCount} posizioni
            </span>
          </>
        )}
      </div>

      {/* Snippet for DONE */}
      {isDone && job.snippet && (
        <p
          data-testid="card-snippet"
          style={{
            fontFamily: "var(--font-body, Georgia, serif)",
            fontSize: ".78rem",
            lineHeight: 1.45,
            margin: ".3rem 0",
            color: "var(--ink-mid)",
          }}
        >
          {job.snippet}
        </p>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: ".4rem",
          fontFamily: "var(--font-deck, 'Arial Narrow', sans-serif)",
          fontSize: ".62rem",
          textTransform: "uppercase",
          letterSpacing: ".08em",
        }}
      >
        {isRunning && (
          <span data-testid="card-polling-label" style={{ color: "#0055B8" }}>
            ↻ Aggiornamento automatico in corso…
          </span>
        )}
        {(isDone || isFailed) && (
          <Link
            href={`/distill/${job.id}`}
            data-testid="card-read-link"
            style={{ color: "var(--np-red)", textDecoration: "none", fontWeight: 700 }}
          >
            {isFailed ? "Dettagli →" : "Leggi →"}
          </Link>
        )}
      </div>
    </article>
  );
}
