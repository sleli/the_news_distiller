# The News Distiller

The News Distiller è un'applicazione web che trasforma qualsiasi argomento di attualità in una
sintesi strutturata e tonalmente coerente. Inserisci un topic, scegli il tono di lettura e
lascia che il sistema raccolga gli articoli, li analizzi con AI e restituisca un digest con
riepilogo, punti di vista distinti e fonti citate.

## Funzionalità principali

- **Distillazione su richiesta** — Inserisci un argomento e scegli tra quattro toni: neutro,
  analitico, didattico o critico.
- **Raccolta automatica degli articoli** — Il sistema interroga Tavily per trovare le notizie
  recenti più rilevanti sul topic.
- **Analisi AI** — Claude (Anthropic) sintetizza gli articoli in un riepilogo generale e
  identifica le posizioni/punti di vista presenti nel dibattito, con relative fonti.
- **Job asincroni** — Le elaborazioni girano in background; ricevi una notifica email quando
  il tuo digest è pronto.
- **Archivio storico** — Consulta e gestisci tutte le distillazioni precedenti con tracciamento
  dello stato (in coda, in elaborazione, completato, fallito).
- **Argomento del giorno** — Il sistema suggerisce automaticamente un topic di tendenza per
  ispirare la prossima ricerca.
- **Configurazione backend AI** — Possibilità di alternare tra Anthropic API e Claude CLI in
  base all'ambiente di esecuzione.

## Stack tecnico

| Layer | Tecnologia |
|---|---|
| Frontend / SSR | Next.js 15 (App Router, Turbopack) |
| Database | SQLite via Prisma |
| Auth | Custom email/password, sessioni su DB, cookie httpOnly |
| UI | Tailwind CSS v4 + shadcn/ui |
| News retrieval | Tavily API |
| AI analysis | Anthropic Claude (API o CLI subprocess) |
| Email | Resend |

## Sviluppo

### Prerequisiti

- Node.js v18+
- Chiavi API: `TAVILY_API_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`

### Setup

```bash
cp .env.example .env   # configura le variabili d'ambiente
npm install            # installa dipendenze e genera il Prisma Client
npm run dev            # avvia su http://localhost:3000
```

### Variabili d'ambiente principali

| Variabile | Descrizione |
|---|---|
| `DATABASE_URL` | Connessione SQLite (es. `file:./dev.db`) |
| `TAVILY_API_KEY` | Chiave Tavily per la ricerca articoli |
| `ANTHROPIC_API_KEY` | Chiave Anthropic per l'analisi AI |
| `RESEND_API_KEY` | Chiave Resend per le email transazionali |

### Comandi utili

```bash
npm run dev          # server di sviluppo con Turbopack
npm run build        # build di produzione
npm run db:push      # applica modifiche allo schema Prisma
```

## Metodologia di sviluppo

Le funzionalità di questo progetto sono pianificate e implementate con
[Archetipo](https://github.com/techreloaded-ar/archetipo), un framework metodologico per
lo sviluppo AI-assisted. Il backlog, i piani tecnici e lo stato di avanzamento vivono
in `.archetipo/`.

## Note sul deploy

SQLite usa il filesystem locale. Su ambienti serverless (es. Vercel) i dati non sono
persistenti tra deploy. Per la produzione si consiglia di sostituire `DATABASE_URL` con
un database persistente (PostgreSQL, Turso/libSQL).
