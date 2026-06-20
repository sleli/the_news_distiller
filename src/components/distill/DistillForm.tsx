"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@prisma/client";
import { getStatusLabel } from "@/lib/distill-status";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export interface JobSummary {
  id: string;
  topic: string;
  tone: string;
  status: string;
  createdAt: string;
}

const TONES = {
  neutro: {
    name: "◉ Neutro",
    desc: "Fattuale, bilanciato, senza giudizi di valore. Default.",
    preview:
      "Il distillato presenterà le posizioni in modo fattuale e bilanciato, senza enfatizzare alcun punto di vista. Ideale per formarsi un'opinione autonoma.",
  },
  analitico: {
    name: "◉ Analitico",
    desc: "Dati, prove, ragionamento. Per chi vuole capire il perché.",
    preview:
      "Il distillato si concentrerà su dati, prove e catene di ragionamento. Ogni posizione sarà valutata sulla base delle evidenze citate dalle fonti.",
  },
  divulgativo: {
    name: "◉ Divulgativo",
    desc: "Accessibile e semplificato. Perfetto per chi parte da zero.",
    preview:
      "Il distillato sarà accessibile e semplificato, con spiegazioni dei concetti chiave. Adatto a chi si avvicina al tema per la prima volta.",
  },
  critico: {
    name: "◉ Critico",
    desc: "Mette in luce contraddizioni, omissioni e punti deboli.",
    preview:
      "Il distillato metterà in evidenza contraddizioni, omissioni e punti deboli di ogni posizione. Utile per approfondire e contestare le narrative dominanti.",
  },
} as const;

type ToneKey = keyof typeof TONES;

function italianDate() {
  const now = new Date();
  const days = [
    "Domenica",
    "Lunedì",
    "Martedì",
    "Mercoledì",
    "Giovedì",
    "Venerdì",
    "Sabato",
  ];
  const months = [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre",
  ];
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

interface DistillFormProps {
  user: User;
  jobs?: JobSummary[];
}

export function DistillForm({ user, jobs = [] }: DistillFormProps) {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<ToneKey>("neutro");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobList, setJobList] = useState(jobs);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isFetchingTrending, setIsFetchingTrending] = useState(false);
  const [pendingTrendingTopic, setPendingTrendingTopic] = useState<string | null>(null);

  const charCount = topic.length;
  const charClass =
    charCount >= 280 ? "danger" : charCount >= 200 ? "warning" : "";
  const isSubmitDisabled = topic.trim() === "" || isSubmitting;
  const displayName = user.name ?? user.email;

  async function handleTrending() {
    setIsFetchingTrending(true);
    try {
      const response = await fetch("/api/distill/trending");
      if (!response.ok) {
        throw new Error("API error");
      }
      const data = await response.json();
      const fetchedTopic: string = typeof data.topic === "string" && data.topic ? data.topic : "";

      if (!fetchedTopic) {
        throw new Error("Topic non disponibile");
      }

      if (topic.trim() !== "") {
        setPendingTrendingTopic(fetchedTopic);
      } else {
        setTopic(fetchedTopic);
      }
    } catch {
      toast.error("Impossibile recuperare il trending topic. Riprova più tardi.");
    } finally {
      setIsFetchingTrending(false);
    }
  }

  function handleConfirmOverwrite() {
    if (pendingTrendingTopic !== null) {
      setTopic(pendingTrendingTopic);
      setPendingTrendingTopic(null);
    }
  }

  function handleCancelOverwrite() {
    setPendingTrendingTopic(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Sei sicuro? Questa azione è irreversibile.")) return;

    const original = jobList;
    setDeleteError(null);
    setJobList((prev) => prev.filter((j) => j.id !== id));

    try {
      const response = await fetch("/api/distill/" + id, { method: "DELETE" });
      if (!response.ok) {
        setJobList(original);
        setDeleteError("Impossibile eliminare. Riprova.");
      }
    } catch {
      setJobList(original);
      setDeleteError("Impossibile eliminare. Riprova.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/distill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone }),
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.jobId) {
          setSubmitError("Si è verificato un errore. Riprova più tardi.");
          setIsSubmitting(false);
          return;
        }
        router.push("/distill/" + data.jobId);
      } else {
        setSubmitError("Si è verificato un errore. Riprova più tardi.");
        setIsSubmitting(false);
      }
    } catch {
      setSubmitError("Si è verificato un errore. Riprova più tardi.");
      setIsSubmitting(false);
    }
  }

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
          <a href="/archivio">Archivio</a>
          <a href="/settings">Impostazioni</a>
        </div>
        <div className="np-navbar-user">
          {displayName} —{" "}
          <form
            action="/auth/signout"
            method="post"
            style={{ display: "inline" }}
          >
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
        <span className="np-hl-kicker">Redazione — Invio Segnalazione</span>
        <div className="np-hl-mega" style={{ lineHeight: 1 }}>
          Invia la Tua
          <br />
          Richiesta
        </div>
        <p className="np-hl-deck">
          Il Distillatore raccoglierà le notizie più fresche, le analizzerà e
          ti recapiterà il riassunto per email. Solitamente in meno di 5
          minuti.
        </p>
        <div className="np-byline">
          Accesso riservato agli abbonati — {displayName}
        </div>
        <div
          className="np-rule"
          style={{ marginTop: ".6rem", marginBottom: ".6rem" }}
        />

        <div className="np-col-2">
          {/* LEFT: form */}
          <div className="np-col">
            <form onSubmit={handleSubmit}>
              <div className="np-form-group">
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}>
                  <label className="np-form-label" htmlFor="topic">
                    ★ Argomento da distillare
                  </label>
                  <button
                    type="button"
                    data-testid="trending-btn"
                    onClick={handleTrending}
                    disabled={isFetchingTrending}
                    style={{
                      fontFamily: "var(--font-deck, 'Arial Narrow', sans-serif)",
                      fontSize: ".62rem",
                      textTransform: "uppercase",
                      letterSpacing: ".1em",
                      border: "1px solid var(--ink)",
                      background: "none",
                      cursor: isFetchingTrending ? "not-allowed" : "pointer",
                      padding: ".2rem .5rem",
                      opacity: isFetchingTrending ? 0.6 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: ".3rem",
                      color: "var(--ink)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isFetchingTrending ? (
                      <>
                        <svg
                          data-testid="trending-spinner"
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          style={{ animation: "spin 1s linear infinite" }}
                        >
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Ricerca in corso…
                      </>
                    ) : (
                      "★ Argomento del giorno"
                    )}
                  </button>
                </div>
                <textarea
                  id="topic"
                  className="np-form-textarea"
                  placeholder="Es. «Riforma pensioni 2024», «Intelligenza artificiale e lavoro», «Politica estera italiana»..."
                  maxLength={300}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  style={{ minHeight: "80px" }}
                  data-testid="topic-input"
                />
                <div className={`np-char-count ${charClass}`}>
                  {charCount} / 300 caratteri
                </div>
              </div>

              {/* Dialog di conferma sovrascrittura */}
              <Dialog open={pendingTrendingTopic !== null} onOpenChange={(open) => { if (!open) handleCancelOverwrite(); }}>
                <DialogContent data-testid="overwrite-dialog">
                  <DialogHeader>
                    <DialogTitle>Sovrascrivere il topic?</DialogTitle>
                    <DialogDescription>
                      Il campo topic è già valorizzato. Vuoi sostituirlo con il trending topic del momento?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <button
                      type="button"
                      data-testid="cancel-overwrite-btn"
                      onClick={handleCancelOverwrite}
                      style={{
                        fontFamily: "var(--font-deck, 'Arial Narrow', sans-serif)",
                        fontSize: ".62rem",
                        textTransform: "uppercase",
                        letterSpacing: ".1em",
                        border: "1px solid var(--ink)",
                        background: "none",
                        cursor: "pointer",
                        padding: ".3rem .7rem",
                        color: "var(--ink)",
                      }}
                    >
                      Annulla
                    </button>
                    <button
                      type="button"
                      data-testid="confirm-overwrite-btn"
                      onClick={handleConfirmOverwrite}
                      style={{
                        fontFamily: "var(--font-deck, 'Arial Narrow', sans-serif)",
                        fontSize: ".62rem",
                        textTransform: "uppercase",
                        letterSpacing: ".1em",
                        border: "1px solid var(--ink)",
                        background: "var(--ink)",
                        color: "var(--paper, #fff)",
                        cursor: "pointer",
                        padding: ".3rem .7rem",
                      }}
                    >
                      Sovrascrivi
                    </button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <div className="np-form-group">
                <label className="np-form-label">Tono del distillato</label>
                <div className="np-tone-grid">
                  {(Object.keys(TONES) as ToneKey[]).map((key) => (
                    <label
                      key={key}
                      className={`np-tone-label ${tone === key ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="tone"
                        value={key}
                        checked={tone === key}
                        onChange={() => setTone(key)}
                        style={{ display: "none" }}
                      />
                      <span className="np-tone-name">{TONES[key].name}</span>
                      <span className="np-tone-desc">{TONES[key].desc}</span>
                    </label>
                  ))}
                </div>

                <div className="np-tone-preview" data-testid="tone-preview">
                  <strong
                    style={{
                      fontFamily: "var(--font-deck, 'Arial Narrow', sans-serif)",
                      fontSize: ".62rem",
                      textTransform: "uppercase",
                      letterSpacing: ".12em",
                      fontStyle: "normal",
                      color: "var(--ink)",
                    }}
                  >
                    Tono selezionato: {tone.toUpperCase()}
                  </strong>
                  <br />
                  {TONES[tone].preview}
                </div>
              </div>

              <div className="np-submit-area">
                {submitError && (
                  <p className="np-error-msg">{submitError}</p>
                )}
                <button
                  type="submit"
                  className="np-btn red xl"
                  disabled={isSubmitDisabled}
                  data-testid="submit-button"
                >
                  {isSubmitting
                    ? "Invio in corso..."
                    : "★ Invia al Distillatore ★"}
                </button>
                <p className="np-submit-note">
                  Riceverai la conferma immediata. Il distillato arriverà per
                  email quando pronto.
                </p>
              </div>
            </form>
          </div>

          {/* RIGHT: sidebar */}
          <div className="np-col">
            <div className="np-sidebar-label">
              Suggerimenti dalla Redazione
            </div>

            <div className="np-sidebar-tip">
              <strong>Sii specifico:</strong> "Intelligenza artificiale" è
              vago. "Impatto dell&apos;IA sul mercato del lavoro in Italia"
              produce un distillato molto più ricco.
            </div>
            <div className="np-sidebar-tip">
              <strong>Argomenti di attualità:</strong> Il Distillatore lavora
              meglio su notizie recenti. Temi storici potrebbero produrre
              risultati meno aggiornati.
            </div>
            <div className="np-sidebar-tip">
              <strong>Usa il tono critico con cautela:</strong> Evidenzia le
              contraddizioni — utile per approfondire, meno adatto a chi si
              avvicina per la prima volta.
            </div>

            <div className="np-rule-thin" />

            <div
              className="np-sidebar-label"
              style={{ margin: ".6rem 0 .4rem" }}
            >
              Le Tue Ultime Richieste
            </div>

            {deleteError && (
              <p className="np-error-msg">{deleteError}</p>
            )}

            {jobList.length === 0 ? (
              <div className="np-empty">Nessuna richiesta recente.</div>
            ) : (
              <ul
                data-testid="history-list"
                style={{ listStyle: "none", padding: 0, margin: 0 }}
              >
                {jobList.map((job) => {
                  const label = getStatusLabel(job.status);
                  const date = new Date(job.createdAt).toLocaleDateString(
                    "it-IT",
                    { day: "2-digit", month: "short", year: "numeric" }
                  );
                  const isFailed = job.status === "FAILED";
                  const isDone = job.status === "DONE";

                  return (
                    <li
                      key={job.id}
                      data-testid="history-item"
                      style={{
                        borderBottom: "1px solid var(--ink-light, #ccc)",
                        padding: ".45rem 0",
                        fontSize: ".78rem",
                        fontFamily: "var(--font-body, Georgia, serif)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: ".5rem",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontStyle: "italic",
                            marginBottom: ".2rem",
                            lineHeight: 1.3,
                          }}
                        >
                          {isDone || isFailed ? (
                            <a
                              href={`/distill/${job.id}`}
                              style={{ color: "var(--ink)", textDecoration: "underline" }}
                            >
                              {job.topic}
                            </a>
                          ) : (
                            job.topic
                          )}
                        </div>
                        <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
                          <span
                            data-testid="status-badge"
                            style={{
                              fontFamily: "var(--font-deck, 'Arial Narrow', sans-serif)",
                              fontSize: ".58rem",
                              textTransform: "uppercase",
                              letterSpacing: ".1em",
                              color: isFailed ? "#cc2200" : "#555",
                              border: `1px solid ${isFailed ? "#cc2200" : "#bbb"}`,
                              padding: ".1rem .35rem",
                            }}
                          >
                            {label}
                          </span>
                          <span style={{ color: "var(--ink-mid, #888)", fontSize: ".68rem" }}>
                            {date}
                          </span>
                          <span style={{ color: "var(--ink-mid, #888)", fontSize: ".68rem", textTransform: "capitalize" }}>
                            {job.tone}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        data-testid="delete-btn"
                        aria-label="Elimina distillato"
                        onClick={() => handleDelete(job.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: ".15rem",
                          color: "var(--ink-mid, #888)",
                          flexShrink: 0,
                          lineHeight: 1,
                          opacity: 0.7,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="1" y1="3" x2="13" y2="3"/>
                          <path d="M4 3V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
                          <path d="M2 3l1 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-9"/>
                          <line x1="5" y1="6" x2="5" y2="10"/>
                          <line x1="9" y1="6" x2="9" y2="10"/>
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
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
