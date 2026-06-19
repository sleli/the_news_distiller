"use client";

import { useState } from "react";

type ClaudeMode = "API_KEY" | "CLI_SUBPROCESS";

interface SettingsFormProps {
  initialMode: ClaudeMode;
}

export function SettingsForm({ initialMode }: SettingsFormProps) {
  const [selectedMode, setSelectedMode] = useState<ClaudeMode>(initialMode);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claudeMode: selectedMode }),
      });

      if (res.ok) {
        setFeedback("success");
      } else {
        setFeedback("error");
      }
    } catch {
      setFeedback("error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave}>
      {feedback === "success" && (
        <div
          data-testid="feedback-success"
          className="np-settings-toast np-settings-toast-success"
        >
          <span>✓</span>
          Configurazione salvata — il Distillatore userà la nuova modalità dal prossimo avvio.
        </div>
      )}
      {feedback === "error" && (
        <div
          data-testid="feedback-error"
          className="np-settings-toast np-settings-toast-error"
        >
          <span>✗</span>
          Errore: impossibile salvare. Verifica la configurazione e riprova.
        </div>
      )}

      {/* Section header */}
      <div className="np-settings-section-header">
        <span className="np-settings-section-kicker">EP-005 · Motore AI</span>
        <h2 className="np-settings-section-title">Modalità Claude</h2>
        <p className="np-settings-section-desc">
          Scegli come il Distillatore comunica con Claude per generare le sintesi. Ogni modalità ha
          requisiti diversi — seleziona quella adatta al tuo ambiente.
        </p>
      </div>

      {/* Mode selector cards */}
      <div className="np-settings-mode-cards" role="radiogroup" aria-label="Modalità Claude">
        {/* Card 1: API Key */}
        <label
          className={`np-settings-mode-card${selectedMode === "API_KEY" ? " selected" : ""}`}
          data-testid="card-api-key"
        >
          <input
            type="radio"
            name="claude-mode"
            value="API_KEY"
            checked={selectedMode === "API_KEY"}
            onChange={() => setSelectedMode("API_KEY")}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          />
          <div className="np-settings-mode-card-check">
            {selectedMode === "API_KEY" ? "✓" : ""}
          </div>
          <span className="np-settings-mode-card-badge">Predefinito</span>
          <span className="np-settings-mode-card-name">
            Chiave API
            <br />
            Anthropic
          </span>
          <p className="np-settings-mode-card-desc">
            Chiama direttamente le API di Anthropic con una chiave personale. Massima stabilità e
            velocità.
          </p>
          <div className="np-settings-mode-card-requirement">
            Richiede: chiave API valida · Connessione a internet · Account Anthropic Console
          </div>
        </label>

        {/* Card 2: CLI */}
        <label
          className={`np-settings-mode-card${selectedMode === "CLI_SUBPROCESS" ? " selected" : ""}`}
          data-testid="card-cli"
        >
          <input
            type="radio"
            name="claude-mode"
            value="CLI_SUBPROCESS"
            checked={selectedMode === "CLI_SUBPROCESS"}
            onChange={() => setSelectedMode("CLI_SUBPROCESS")}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          />
          <div className="np-settings-mode-card-check">
            {selectedMode === "CLI_SUBPROCESS" ? "✓" : ""}
          </div>
          <span className="np-settings-mode-card-badge">Avanzato</span>
          <span className="np-settings-mode-card-name">
            Claude CLI
            <br />
            <code style={{ fontSize: ".65em", opacity: 0.8 }}>claude&nbsp;-p</code>
          </span>
          <p className="np-settings-mode-card-desc">
            Usa il client CLI installato localmente tramite il flag{" "}
            <code style={{ fontSize: ".8em" }}>-p</code> (print). Nessuna chiave API richiesta.
          </p>
          <div className="np-settings-mode-card-requirement">
            Richiede: CLI installato · <code style={{ fontSize: ".85em" }}>claude</code> nel PATH ·
            Auth CLI attiva
          </div>
        </label>
      </div>

      <div className="np-rule" style={{ marginTop: ".8rem", marginBottom: ".8rem" }} />

      {/* Submit area */}
      <div className="np-settings-submit-area">
        <button
          type="submit"
          className="np-btn"
          disabled={isSaving}
          data-testid="save-button"
        >
          {isSaving ? "Salvataggio…" : "Salva Impostazioni"}
        </button>
      </div>
    </form>
  );
}
