"use client";

import { useState } from "react";
import type { User } from "@prisma/client";

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
}

export function DistillForm({ user }: DistillFormProps) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<ToneKey>("neutro");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const charCount = topic.length;
  const charClass =
    charCount >= 280 ? "danger" : charCount >= 200 ? "warning" : "";
  const isSubmitDisabled = topic.trim() === "" || isSubmitting;
  const displayName = user.name ?? user.email;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitted(false);

    try {
      const response = await fetch("/api/distill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTopic("");
      } else {
        setSubmitError("Si è verificato un errore. Riprova più tardi.");
      }
    } catch {
      setSubmitError("Si è verificato un errore. Riprova più tardi.");
    } finally {
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
                <label className="np-form-label" htmlFor="topic">
                  ★ Argomento da distillare
                </label>
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
                {submitted && (
                  <div className="np-submit-confirm">
                    <p
                      style={{
                        fontFamily:
                          "var(--font-deck, 'Arial Narrow', sans-serif)",
                        fontSize: ".72rem",
                        textTransform: "uppercase",
                        letterSpacing: ".12em",
                        color: "#006622",
                        margin: 0,
                      }}
                    >
                      ★ Richiesta inviata con successo ★
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-body, Georgia, serif)",
                        fontSize: ".72rem",
                        fontStyle: "italic",
                        color: "var(--ink-mid)",
                        marginTop: ".3rem",
                        marginBottom: 0,
                      }}
                    >
                      Riceverai il distillato per email appena pronto.
                    </p>
                  </div>
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

            <div className="np-empty">Nessuna richiesta recente.</div>
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
