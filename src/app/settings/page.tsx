import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/components/settings/SettingsForm";

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

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const initialMode = (settings?.claudeMode ?? "API_KEY") as "API_KEY" | "CLI_SUBPROCESS";

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
          IMPOSTAZIONI ACCOUNT &nbsp;·&nbsp; CONFIGURAZIONE MOTORE AI &nbsp;·&nbsp;
          MODALITÀ CLAUDE: API KEY / CLI &nbsp;·&nbsp; PREFERENZE UTENTE &nbsp;·&nbsp;
          IMPOSTAZIONI ACCOUNT &nbsp;·&nbsp; CONFIGURAZIONE MOTORE AI &nbsp;·&nbsp;
        </span>
      </div>

      {/* PAGE HERO */}
      <div className="np-settings-page-hero">
        <div>
          <span className="np-settings-page-hero-kicker">Impostazioni &amp; Configurazione</span>
          <h1 className="np-settings-page-hero-title">Pannello di Controllo</h1>
          <p className="np-settings-page-hero-deck">
            Personalizza il comportamento del Distillatore — scegli come Claude elabora le tue notizie.
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
            Motore Claude
          </a>
        </aside>

        {/* MAIN CONTENT */}
        <main className="np-settings-content">
          <SettingsForm initialMode={initialMode} />
        </main>
      </div>

      {/* FOOTER */}
      <footer className="np-footer">
        <span>The News Distiller · Impostazioni</span>
        <span>US-018 · EP-005</span>
        <span>Sessione: {user.email}</span>
      </footer>
    </div>
  );
}
