import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArchiveGrid } from "@/components/distill/ArchiveGrid";
import type { ArchiveJobData } from "@/components/distill/ArchiveCard";

function italianDate() {
  const now = new Date();
  const days = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

export default async function ArchivioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  const displayName = user.name ?? user.email;

  const jobs = await prisma.distillJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      topic: true,
      tone: true,
      status: true,
      createdAt: true,
      result: true,
      sources: { select: { id: true, position: true } },
    },
  });

  const initialJobs: ArchiveJobData[] = jobs.map((job) => {
    let snippet: string | null = null;
    let sourceCount: number | null = null;
    let positionCount: number | null = null;

    if (job.status === "DONE") {
      try {
        const parsed = job.result as { summary?: string } | null;
        if (parsed?.summary) {
          snippet = parsed.summary.length > 120 ? parsed.summary.slice(0, 120) + "…" : parsed.summary;
        }
      } catch {
        // malformed — stay null
      }
      sourceCount = job.sources.length;
      positionCount = new Set(job.sources.map((s) => s.position)).size;
    }

    return {
      id: job.id,
      topic: job.topic,
      tone: job.tone,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      snippet,
      sourceCount,
      positionCount,
    };
  });

  return (
    <div className="np-paper">
      {/* MASTHEAD */}
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

      {/* NAVBAR */}
      <nav className="np-navbar">
        <div className="np-navbar-links">
          <a href="/distill">Nuova Richiesta</a>
          <a href="/archivio" className="active">Archivio</a>
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

      {/* TICKER */}
      <div className="np-ticker">
        <span className="np-ticker-inner">
          ULTIME ORE: Il Distillatore analizza fonti in tempo reale
          &nbsp;★&nbsp; Tono critico: rivela ciò che i giornali non dicono
          &nbsp;★&nbsp; Risultati via email in meno di 5 minuti &nbsp;★&nbsp;
          Argomenti in italiano, inglese, spagnolo e altre lingue &nbsp;★&nbsp;
        </span>
      </div>

      {/* PAGE CONTENT */}
      <div className="np-content">
        <div className="np-rule-double" />
        <span className="np-hl-kicker">Archivio — I Tuoi Distillati</span>
        <div className="np-hl-mega" style={{ lineHeight: 1 }}>
          Storico
          <br />
          Completo
        </div>
        <p className="np-hl-deck">
          Tutti i distillati richiesti, ordinati per data. Clicca su un distillato completato per leggere l&apos;analisi completa.
        </p>
        <div className="np-byline">Accesso riservato — {displayName}</div>
        <div className="np-rule" style={{ marginTop: ".6rem", marginBottom: ".6rem" }} />

        <ArchiveGrid initialJobs={initialJobs} />
      </div>

      {/* FOOTER */}
      <footer className="np-footer">
        <span>© 1974 The News Distiller</span>
        <span>Il Distillatore è una macchina — tu sei il giudice</span>
        <span>Milano, Italia</span>
      </footer>
    </div>
  );
}
