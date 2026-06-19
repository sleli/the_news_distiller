import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStatusLabel } from "@/lib/distill-status";
import { DistillResultView } from "@/components/distill/DistillResultView";
import type { DistillResult } from "@/lib/claude";

function italianDate() {
  const now = new Date();
  const days = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DistillJobPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  const { id } = await params;

  const job = await prisma.distillJob.findUnique({
    where: { id },
    include: { sources: true },
  });

  const displayName = user.name ?? user.email;

  // Neutral error for not found or wrong user — same message, no info leak
  if (!job || job.userId !== user.id) {
    return (
      <div className="np-paper">
        <PageShell displayName={displayName} />
        <div className="np-content">
          <div data-testid="error-page" className="np-rule-double" style={{ paddingTop: "2rem" }}>
            <span className="np-hl-kicker">Errore</span>
            <div className="np-hl-mega" style={{ lineHeight: 1 }}>
              Pagina non trovata
            </div>
            <p className="np-hl-deck">
              Il distillato richiesto non esiste o non è accessibile.
            </p>
            <a href="/distill" className="np-btn red" style={{ textDecoration: "none", display: "inline-block" }}>
              ← Torna alla Redazione
            </a>
          </div>
        </div>
        <PageFooter />
      </div>
    );
  }

  return (
    <div className="np-paper">
      <PageShell displayName={displayName} />
      <div className="np-content">
        {job.status === "DONE" ? (
          <DistillResultView
            result={job.result as unknown as DistillResult}
            topic={job.topic}
            tone={job.tone}
          />
        ) : (
          <JobStatusView job={job} displayName={displayName} />
        )}
      </div>
      <PageFooter />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function PageShell({ displayName }: { displayName: string }) {
  return (
    <>
      <header className="np-masthead">
        <div className="np-masthead-rule-top" />
        <div className="np-masthead-rule-thin" />
        <div className="np-masthead-meta">
          <span>Vol. 1 — No. 1</span>
          <span>{italianDate()}</span>
          <span>Abbonato</span>
        </div>
        <div className="np-masthead-title">
          The <em>News</em> Distiller
        </div>
        <div className="np-masthead-tagline">
          La verità in tutte le sue contraddizioni — ogni giorno, senza filtri
        </div>
      </header>

      <nav className="np-navbar">
        <div className="np-navbar-links">
          <a href="/distill">Nuova Richiesta</a>
          <a href="/settings">Impostazioni</a>
        </div>
        <div className="np-navbar-user">
          {displayName} —{" "}
          <form action="/auth/signout" method="post" style={{ display: "inline" }}>
            <button
              type="submit"
              style={{
                color: "inherit",
                background: "none",
                border: "none",
                cursor: "pointer",
                font: "inherit",
                letterSpacing: "inherit",
                textTransform: "inherit",
              }}
            >
              Esci
            </button>
          </form>
        </div>
      </nav>

      <div className="np-ticker">
        <span className="np-ticker-inner">
          ULTIME ORE: Il Distillatore analizza fonti in tempo reale
          &nbsp;★&nbsp; Tono critico: rivela ciò che i giornali non dicono
          &nbsp;★&nbsp; Risultati via email in meno di 5 minuti &nbsp;★&nbsp;
          Argomenti in italiano, inglese, spagnolo e altre lingue &nbsp;★&nbsp;
        </span>
      </div>
    </>
  );
}

function PageFooter() {
  return (
    <footer className="np-footer">
      <span>© 1974 The News Distiller</span>
      <span>Il Distillatore è una macchina — tu sei il giudice</span>
      <span>Milano, Italia</span>
    </footer>
  );
}

interface JobStatusViewProps {
  job: {
    topic: string;
    tone: string;
    status: string;
  };
  displayName: string;
}

function JobStatusView({ job, displayName }: JobStatusViewProps) {
  const statusLabel = getStatusLabel(job.status);
  const isFailed = job.status === "FAILED";

  return (
    <>
      <div className="np-rule-double" />
      <span className="np-hl-kicker">Redazione — Conferma Richiesta</span>
      <div className="np-hl-mega" style={{ lineHeight: 1 }}>
        {isFailed ? (
          <>Elaborazione<br />Fallita</>
        ) : (
          <>Richiesta<br />in Elaborazione</>
        )}
      </div>
      <p className="np-hl-deck">
        {isFailed
          ? "Si è verificato un errore durante l'elaborazione del distillato."
          : "La tua segnalazione è stata ricevuta. Il Distillatore sta raccogliendo le fonti e preparerà il riassunto al più presto."}
      </p>
      <div className="np-byline">Accesso riservato agli abbonati — {displayName}</div>
      <div className="np-rule" style={{ marginTop: ".6rem", marginBottom: ".6rem" }} />

      <div className="np-col-2">
        <div className="np-col">
          <div className="np-form-group">
            <div className="np-sidebar-label" style={{ marginBottom: ".4rem" }}>
              Argomento richiesto
            </div>
            <div
              style={{
                fontFamily: "var(--font-body, Georgia, serif)",
                fontSize: "1.1rem",
                fontStyle: "italic",
                color: "var(--ink)",
                lineHeight: 1.4,
                marginBottom: ".8rem",
              }}
            >
              &ldquo;{job.topic}&rdquo;
            </div>
          </div>

          <div className="np-form-group">
            <div className="np-sidebar-label" style={{ marginBottom: ".4rem" }}>
              Stato
            </div>
            <div
              data-testid="job-status"
              style={{
                display: "inline-block",
                fontFamily: "var(--font-deck, 'Arial Narrow', sans-serif)",
                fontSize: ".65rem",
                textTransform: "uppercase",
                letterSpacing: ".14em",
                color: isFailed ? "#cc2200" : "#006622",
                border: `1px solid ${isFailed ? "#cc2200" : "#006622"}`,
                padding: ".2rem .5rem",
                marginBottom: ".8rem",
              }}
            >
              {statusLabel}
            </div>
          </div>

          {!isFailed && (
            <div
              data-testid="email-message"
              style={{
                fontFamily: "var(--font-body, Georgia, serif)",
                fontSize: ".8rem",
                fontStyle: "italic",
                color: "var(--ink-mid)",
                borderLeft: "2px solid var(--ink-light, #ccc)",
                paddingLeft: ".8rem",
                marginBottom: "1.2rem",
              }}
            >
              Riceverai una email quando il distillato è pronto.
            </div>
          )}

          <a href="/distill" className="np-btn red" style={{ textDecoration: "none", display: "inline-block" }}>
            ★ Nuova Richiesta
          </a>
        </div>

        <div className="np-col">
          <div className="np-sidebar-label">Note dalla Redazione</div>
          {isFailed ? (
            <div className="np-sidebar-tip">
              <strong>Errore di elaborazione:</strong> Il Distillatore non è riuscito a completare l&apos;analisi. Puoi provare a inviare una nuova richiesta.
            </div>
          ) : (
            <>
              <div className="np-sidebar-tip">
                <strong>Tempi di elaborazione:</strong> Il Distillatore raccoglie e analizza le fonti in tempo reale. In genere il processo richiede meno di 5 minuti.
              </div>
              <div className="np-sidebar-tip">
                <strong>Email di notifica:</strong> Riceverai un&apos;email all&apos;indirizzo associato al tuo account non appena il distillato è pronto.
              </div>
              <div className="np-sidebar-tip">
                <strong>Nuova richiesta:</strong> Puoi inviare un&apos;altra richiesta in qualsiasi momento cliccando &ldquo;Nuova Richiesta&rdquo;.
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
