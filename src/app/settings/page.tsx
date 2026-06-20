import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

function italianDate() {
  const now = new Date();
  const days = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
  ];
  return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  const displayName = user.name ?? user.email;

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
          <a href="/settings" className="active">Impostazioni</a>
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
          IMPOSTAZIONI ACCOUNT &nbsp;·&nbsp; PREFERENZE UTENTE &nbsp;·&nbsp;
          CONFIGURAZIONE AI VIA VARIABILI D&apos;AMBIENTE &nbsp;·&nbsp;
          IMPOSTAZIONI ACCOUNT &nbsp;·&nbsp; PREFERENZE UTENTE &nbsp;·&nbsp;
        </span>
      </div>

      {/* PAGE HERO */}
      <div className="np-settings-page-hero">
        <div>
          <span className="np-settings-page-hero-kicker">Impostazioni &amp; Configurazione</span>
          <h1 className="np-settings-page-hero-title">Pannello di Controllo</h1>
          <p className="np-settings-page-hero-deck">
            Configura il provider AI tramite le variabili d&apos;ambiente nel file <code>.env</code>.
          </p>
        </div>
        <div className="np-settings-page-hero-breadcrumb">
          <a href="/distill">Dashboard</a>
          <br />
          › Impostazioni
        </div>
      </div>

      {/* SETTINGS LAYOUT */}
      <div className="np-settings-layout">
        {/* SIDEBAR */}
        <aside className="np-settings-nav">
          <div className="np-settings-nav-label">Sezioni</div>
          <a href="/settings" className="np-settings-nav-item active">
            <span className="np-settings-nav-item-icon">⚙</span>
            Motore AI
          </a>
        </aside>

        {/* MAIN CONTENT */}
        <main className="np-settings-content">
          <div className="np-settings-section-header">
            <span className="np-settings-section-kicker">EP-005 · Motore AI</span>
            <h2 className="np-settings-section-title">Configurazione Provider</h2>
            <p className="np-settings-section-desc">
              Il provider AI è configurato tramite la variabile d&apos;ambiente <code>AI_PROVIDER</code> nel
              file <code>.env</code>. Valori supportati:
            </p>
          </div>

          <div style={{ marginTop: "1rem" }}>
            <table className="np-settings-env-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--np-border)" }}>
                  <th style={{ textAlign: "left", padding: ".4rem .6rem", fontWeight: 700 }}>Variabile</th>
                  <th style={{ textAlign: "left", padding: ".4rem .6rem", fontWeight: 700 }}>Descrizione</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--np-border)" }}>
                  <td style={{ padding: ".4rem .6rem" }}><code>AI_PROVIDER</code></td>
                  <td style={{ padding: ".4rem .6rem" }}>
                    <code>anthropic</code> · <code>openai_compatible</code> · <code>claude_subprocess</code> (default)
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--np-border)" }}>
                  <td style={{ padding: ".4rem .6rem" }}><code>ANTHROPIC_API_KEY</code></td>
                  <td style={{ padding: ".4rem .6rem" }}>Chiave API Anthropic (richiesta per <code>anthropic</code>)</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--np-border)" }}>
                  <td style={{ padding: ".4rem .6rem" }}><code>OPENAI_BASE_URL</code></td>
                  <td style={{ padding: ".4rem .6rem" }}>Endpoint base provider OpenAI-compatible</td>
                </tr>
                <tr style={{ borderBottom: "1px solid var(--np-border)" }}>
                  <td style={{ padding: ".4rem .6rem" }}><code>OPENAI_API_KEY</code></td>
                  <td style={{ padding: ".4rem .6rem" }}>Chiave API provider OpenAI-compatible</td>
                </tr>
                <tr>
                  <td style={{ padding: ".4rem .6rem" }}><code>OPENAI_MODEL</code></td>
                  <td style={{ padding: ".4rem .6rem" }}>Modello da usare (es. <code>openai/gpt-4o</code>)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="np-footer">
        <span>The News Distiller · Impostazioni</span>
        <span>US-028 · EP-005</span>
        <span>Sessione: {user.email}</span>
      </footer>
    </div>
  );
}
