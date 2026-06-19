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
}

export function ArchiveCard({ job }: ArchiveCardProps) {
  const borderColor = STATUS_BORDER[job.status] ?? "#7A6035";
  const statusLabel = STATUS_LABEL[job.status] ?? job.status;
  const isDone = job.status === "DONE";
  const isRunning = job.status === "RUNNING";

  const cardStyle: React.CSSProperties = {
    borderLeft: `4px solid ${borderColor}`,
    border: `2px solid #160E02`,
    borderLeftWidth: "4px",
    borderLeftColor: borderColor,
    padding: ".6rem .75rem",
    marginBottom: ".75rem",
    background: "var(--paper)",
    position: "relative",
    transition: "box-shadow .12s",
  };

  return (
    <article data-testid="archive-card" data-status={job.status} style={cardStyle}>
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
        }}
      >
        {isDone ? (
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
        {isDone && (
          <Link
            href={`/distill/${job.id}`}
            data-testid="card-read-link"
            style={{ color: "var(--np-red)", textDecoration: "none", fontWeight: 700 }}
          >
            Leggi →
          </Link>
        )}
      </div>
    </article>
  );
}
