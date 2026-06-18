# News Distiller - Documento dei Requisiti di Prodotto

**Autore:** ARchetipo
**Data:** 2026-06-18
**Versione:** 1.0

---

## Elevator Pitch

> Per **cittadini curiosi e informati**, che hanno il problema di **essere sommersi da fonti di notizie parziali o contraddittorie senza riuscire a capire dove e perché divergono**, **News Distiller** è una **web application** che **produce un riassunto distillato e pluralistico delle notizie fresche su qualsiasi argomento, evidenziando esplicitamente le differenze tra le posizioni presenti nelle varie fonti**. A differenza degli **aggregatori di notizie tradizionali**, il nostro prodotto **rende visibili e verificabili le divergenze interpretative, con fonti citate e cliccabili**.

---

## Visione

News Distiller nasce dall'idea che essere informati non significhi leggere più notizie, ma capire meglio quelle che esistono. In un ecosistema mediatico frammentato e polarizzato, la vera sfida non è trovare le notizie — è capire come interpretazioni diverse dello stesso evento convivono, si contraddicono, e si completano.

Il prodotto ambisce a diventare il punto di riferimento per chi vuole formarsi un'opinione autonoma e consapevole: non una voce in più nel coro, ma uno strumento che mostra il coro per quello che è.

### Differenziatore

News Distiller non aggrega — **distilla**. Non si limita a raccogliere titoli o riassumere singoli articoli: identifica attivamente dove le fonti divergono, struttura le posizioni in modo leggibile, e cita ogni affermazione con la fonte originale cliccabile. Il tono del distillato è configurabile dall'utente, ma rimane neutro per default per garantire pluralismo autentico.

---

## Personas

### Persona 1: Marco

**Ruolo:** Impiegato nel settore assicurativo
**Età:** 38 anni | **Background:** Laurea triennale in economia, appassionato di attualità, legge notizie ogni mattina prima del lavoro. Usa lo smartphone per tutto, si fida poco dei social, segue alcuni quotidiani online ma sente di non avere mai il quadro completo.

**Obiettivi:**
- Capire un tema di attualità in pochi minuti senza aprire decine di tab
- Formarsi un'opinione propria, non ricevere quella del giornale
- Avere la certezza di aver visto "tutti i lati" prima di discuterne con colleghi o amici

**Pain Point:**
- Fonti diverse raccontano la stessa storia in modi contraddittori senza spiegare perché
- Non ha tempo per approfondire, ma vuole qualità — non superficialità
- Teme di finire in una camera d'eco senza accorgersene

**Comportamenti e strumenti:**
- Apre le notizie alle 7:30 prima del lavoro
- Usa Google News, qualche newsletter, e a volte Twitter
- Ha smesso di leggere certi giornali perché li percepisce come schierati

**Motivazioni:** Essere un interlocutore informato e autonomo nelle conversazioni quotidiane
**Familiarità tecnologica:** Media — usa app digitali senza problemi, non è uno sviluppatore

#### Customer Journey — Marco

| Fase | Azione | Pensiero | Emozione | Opportunità |
|---|---|---|---|---|
| Awareness | Sente parlare di News Distiller da un amico o sui social | "Finalmente qualcosa che non mi dice cosa pensare" | Curiosità | Messaggi che enfatizzano la neutralità e il pluralismo |
| Considerazione | Prova a inserire un argomento che conosce già bene | "Vediamo se è davvero neutro o se prende posizione" | Scetticismo costruttivo | Mostrare subito le fonti e la struttura delle posizioni |
| Primo utilizzo | Inserisce il primo argomento, sceglie il tono neutro, aspetta la mail | "Ok, mi fido — ma voglio poter verificare" | Incertezza + attesa | Email chiara con anteprima e link alle fonti |
| Utilizzo regolare | Usa News Distiller ogni mattina per 2-3 argomenti diversi | "Questo mi fa risparmiare tempo e mi fa sentire più preparato" | Soddisfazione | Funzionalità di storico e salvataggio |
| Advocacy | Condivide un distillato con un collega durante una discussione | "Guarda, invece di litigare su chi ha ragione, leggiamo questo" | Orgoglio | Funzione di condivisione del distillato |

---

### Persona 2: Elena

**Ruolo:** Insegnante di storia e filosofia al liceo
**Età:** 47 anni | **Background:** Laurea magistrale in filosofia, insegna da vent'anni. Usa l'attualità come spunto per le lezioni — cerca materiali che stimolino il pensiero critico negli studenti, non semplici riassunti.

**Obiettivi:**
- Trovare rapidamente materiale pluralistico su un tema attuale da portare in classe
- Mostrare agli studenti che la stessa notizia può essere letta in modi diversi
- Risparmiare il tempo che spende ad aggregare manualmente fonti diverse

**Pain Point:**
- I materiali didattici sull'attualità sono spesso schierati o superficiali
- Aggregare fonti diverse richiede ore di ricerca che non ha
- Gli studenti si fermano al primo titolo che leggono su Instagram

**Comportamenti e strumenti:**
- Prepara le lezioni la sera o nel weekend
- Cerca attivamente fonti di qualità su temi come politica, etica, economia
- Sarebbe disposta a condividere il distillato con gli studenti come materiale di lettura

**Motivazioni:** Insegnare a pensare in modo critico e autonomo, non a ripetere un'opinione
**Familiarità tecnologica:** Media-alta — usa strumenti digitali professionalmente, ma non è tech-first

#### Customer Journey — Elena

| Fase | Azione | Pensiero | Emozione | Opportunità |
|---|---|---|---|---|
| Awareness | Trova News Distiller cercando "materiale pluralistico attualità scuola" | "Potrebbe essere utile per le lezioni" | Interesse pratico | SEO e contenuti orientati all'uso educativo |
| Considerazione | Testa l'app su un argomento che ha già affrontato in classe | "La struttura è buona — ma è davvero neutro?" | Valutazione critica | Trasparenza sulla metodologia e sulle fonti |
| Primo utilizzo | Genera un distillato per la lezione del giorno dopo | "Questo mi fa risparmiare due ore di lavoro" | Sollievo + soddisfazione | Template "tono divulgativo" preselezionato |
| Utilizzo regolare | Usa il distillato come base per la discussione in classe | "Gli studenti hanno visto le fonti — ora possono discutere" | Entusiasmo professionale | Funzionalità di condivisione e salvataggio |
| Advocacy | Consiglia l'app ai colleghi del dipartimento | "Dovremmo usarla tutti per le lezioni di cittadinanza" | Senso di scoperta | Programma referral o piano educativo |

---

## Insights dal Brainstorming

> Scoperte chiave e direzioni alternative esplorate durante la sessione di inception.

### Assunzioni Sfidate

**"L'utente vuole vedere le differenze tra posizioni"** — È stata verificata, ma non è universale. Esiste un segmento (fact-checker, ricercatori) che vuole una risposta definitiva, non il pluralismo. La scelta di rendere il pluralismo il valore centrale implica un target consapevole: chi cerca già attivamente più punti di vista. Gli utenti che vogliono una sola risposta non sono il target primario di questo MVP.

**"Il distillato deve essere prodotto in tempo reale"** — L'elaborazione asincrona è risultata non solo accettabile, ma preferibile: riduce la pressione tecnica sul real-time, migliora la qualità del risultato AI, e si adatta alla routine dell'utente (inserisco la mattina, leggo quando ho tempo).

### Nuove Direzioni Scoperte

**Uso educativo (Audience Flip):** Immaginando un insegnante come utente, emerge un caso d'uso non previsto: il distillato come materiale didattico. Questo suggerisce funzionalità future come il tono "divulgativo" ottimizzato per la classe, la condivisione del distillato, e un potenziale piano educativo.

**Distillato collaborativo (What if):** L'idea che l'utente possa segnalare un distillato come "sbilanciato" e richiedere una rigenerazione con più fonti di un certo tipo apre una direzione di prodotto collaborativa per le versioni future.

**Anti-problema — Rischi identificati:** Il prodotto diventerebbe inutile se le fonti fossero sempre le stesse, se il riassunto nascondesse le divergenze invece di evidenziarle, o se il tono non fosse rispettato nei prompt. Questi sono i rischi tecnici prioritari da presidiare nell'implementazione.

---

## Scope del Prodotto

### MVP — Minimum Viable Product

- Inserimento di un argomento testuale libero da parte dell'utente
- Scelta del tono del distillato: **neutro** (default) / analitico / divulgativo / critico
- Creazione di un job asincrono con conferma immediata all'utente ("in elaborazione")
- Harvesting di articoli recenti tramite Tavily API
- Distillazione AI tramite Claude (Anthropic): sintesi generale + sezioni per posizione identificata + fonti citate con URL cliccabili
- Notifica via email al completamento, con distillato completo e link alle fonti
- Storico dei distillati con stato visibile (in coda / in elaborazione / completato / errore)
- Consultazione del distillato completato nella web app

### Funzionalità Growth (Post-MVP)

- Topic salvati con aggiornamento periodico automatico
- Feedback utente sul distillato ("questo sembra sbilanciato") con rigenerazione
- Condivisione del distillato via link pubblico
- Selezione delle fonti preferite o esclusione di fonti specifiche
- Notifica push (oltre all'email)

### Visione Futura

- Supporto multilingua
- Modalità educativa per insegnanti con template ottimizzati per la classe
- Alert su topic monitorati (notify me when there's news on X)
- Dashboard analitica: come cambiano le posizioni su un topic nel tempo
- API pubblica per integrazioni esterne

---

## Architettura Tecnica

> **Proposta da:** Leonardo (Architetto)

### Architettura del Sistema

Il sistema segue un pattern **request → job → worker → notify**: l'utente avvia una richiesta che viene messa in coda sul database, un processo worker in background la preleva, esegue l'elaborazione (harvesting + AI), e notifica l'utente via email al termine.

```
[Browser] → POST /api/distill    → crea DistillJob su DB → risponde "in coda"
[Worker]  → polling DB ogni N s  → esegue Job            → aggiorna stato → invia email
[Browser] → GET /api/distill/[id] → legge stato e risultato dal DB
```

**Pattern Architetturale:** Async Job Queue con DB-backed polling

**Componenti Principali:**
- **Frontend Next.js** — form di richiesta, pagina storico, pagina dettaglio distillato
- **API Routes** — creazione job (`POST /api/distill`), stato e risultato (`GET /api/distill/[id]`), lista job (`GET /api/distill`)
- **Worker Node.js** — processo separato che fa polling sul DB, chiama Tavily, chiama Claude, invia email via Resend
- **Database SQLite/Prisma** — gestisce User, Session (boilerplate), DistillJob, DistillSource
- **Tavily API** — ricerca web + estrazione contenuto articoli
- **Claude API (Anthropic)** — distillazione AI con prompt strutturato e tono parametrizzato
- **Resend** — invio email transazionale

### Stack Tecnologico

| Layer | Tecnologia | Versione | Motivazione |
|---|---|---|---|
| Linguaggio | TypeScript | 5.x | Type safety, ecosistema Next.js |
| Backend Framework | Next.js (App Router) | 15.x | Boilerplate esistente già configurato |
| Frontend Framework | Next.js (React) | 15.x | Boilerplate esistente, SSR nativo |
| Database | SQLite | 3.x | Boilerplate esistente, sufficiente per MVP |
| ORM | Prisma | 5.x | Boilerplate esistente |
| Auth | Custom email/password | — | Boilerplate esistente (sessioni su DB, cookie httpOnly) |
| UI Components | shadcn/ui + Tailwind CSS v4 | — | Boilerplate esistente |
| News Harvesting | Tavily API | — | Search + content extraction in una sola chiamata API |
| AI Distillation | Anthropic Claude API | claude-sonnet-4-6 | Qualità di sintesi e ragionamento sulle posizioni |
| Email | Resend | — | API semplice, ottima deliverability per MVP |
| Testing | Jest + Testing Library | — | Standard Next.js |

### Struttura del Progetto

**Pattern di organizzazione:** Feature-based dentro `src/app/`, servizi condivisi in `src/lib/`, worker separato nella cartella `worker/`

```text
src/
  app/
    layout.tsx
    page.tsx
    providers.tsx
    globals.css
    dashboard/
      page.tsx              # Dashboard utente (protetta)
    distill/
      page.tsx              # Form nuova richiesta distillato
      [id]/
        page.tsx            # Dettaglio distillato (stato + risultato)
    auth/
      signin/page.tsx
      signout/route.ts
    api/
      distill/
        route.ts            # POST: crea job | GET: lista job utente
        [id]/
          route.ts          # GET: stato e risultato job specifico
      auth/
        signup/route.ts
        signin/route.ts
  components/
    ui/                     # shadcn/ui components
    distill/
      DistillForm.tsx       # Form argomento + scelta tono
      DistillCard.tsx       # Card nella lista storico
      DistillResult.tsx     # Vista distillato con posizioni e fonti
  lib/
    prisma.ts               # Prisma client singleton
    auth.ts                 # hashPassword, verifyPassword, createSession, getCurrentUser, destroySession
    utils.ts                # cn() utility
    tavily.ts               # Tavily API client + funzione di search
    claude.ts               # Anthropic client + buildPrompt(topic, tone, articles)
    email.ts                # Resend client + sendDistillEmail()
    tones.ts                # Costanti toni disponibili e descrizioni per il prompt
  middleware.ts             # Protegge /dashboard e /distill
worker/
  index.ts                  # Polling loop: preleva PENDING jobs, processa, aggiorna stato
  processor.ts              # Logica di elaborazione: harvest → distill → notify
prisma/
  schema.prisma             # User, Session, DistillJob, DistillSource
```

### Ambiente di Sviluppo

Il progetto richiede due processi in esecuzione contemporanea in locale: il server Next.js e il worker di background.

```bash
# Terminale 1 — server Next.js
npm run dev

# Terminale 2 — worker di background
npm run worker
```

**Strumenti richiesti:** Node.js 20+, npm, SQLite (incluso via Prisma)

### CI/CD e Deployment

**Build tool:** Next.js build (`npm run build`)

**Pipeline:** build + type check + test

**Deployment:** Il progetto **non è compatibile con piattaforme serverless-only** (es. Vercel functions) perché il worker è un processo Node.js a esecuzione continua. Usare piattaforme che supportano processi persistenti: **Railway**, **Render**, **Fly.io**, o un VPS classico.

**Target infrastruttura:** Singolo server Node.js con due processi (web + worker), SQLite come file locale o volume persistente.

### Architecture Decision Records (ADR)

**ADR-01 — DB-backed queue vs Redis/BullMQ**
SQLite è già il database del progetto. Aggiungere Redis aumenterebbe la complessità operativa per un MVP con traffico limitato. Trade-off: minore throughput e no priority queue — accettabile per MVP. Da rivalutare in fase di crescita.

**ADR-02 — Tavily vs Serper + scraping custom**
Tavily fornisce sia la ricerca che l'estrazione del contenuto in una singola chiamata API, eliminando la necessità di uno scraper custom. Riduce il surface area tecnico per il MVP.

**ADR-03 — Worker come processo separato**
Le API route di Next.js sono stateless e non possono mantenere un loop di polling. Il worker deve essere un processo Node.js autonomo. Conseguenza: il deployment richiede una piattaforma che supporti processi persistenti.

**ADR-04 — Struttura output AI definita**
Il prompt inviato a Claude deve specificare esplicitamente la struttura dell'output attesa (non lasciata a discrezione del modello), per garantire coerenza tra le richieste. Il tono è un parametro del prompt, non hardcoded — gestito tramite la costante in `src/lib/tones.ts`.

---

## Requisiti Funzionali

### Autenticazione *(extends boilerplate esistente)*

- **FR-01** — Il sistema supporta registrazione e login tramite email e password. *(Extends existing boilerplate: auth)*
- **FR-02** — Le pagine `/dashboard` e `/distill` sono protette dal middleware che verifica il cookie di sessione. *(Extends existing boilerplate: session middleware)*

### Richiesta Distillato

- **FR-03** — L'utente autenticato può inserire un argomento testuale libero nella form di richiesta.
- **FR-04** — L'utente può scegliere il tono del distillato tra: **neutro** (default), analitico, divulgativo, critico. La selezione del tono è esplicita nell'interfaccia; se non modificata, il sistema applica il tono neutro.
- **FR-05** — Al submit della form, il sistema crea un job asincrono (`DistillJob`) con stato `PENDING` e restituisce immediatamente una conferma all'utente ("Richiesta in coda, riceverai una email al completamento").

### Harvesting

- **FR-06** — Il worker interroga l'API Tavily per recuperare N articoli recenti (N configurabile, default: 10) pertinenti all'argomento specificato.
- **FR-07** — Per ogni articolo, il sistema estrae e persiste: titolo, URL, testo rilevante estratto.

### Distillazione AI

- **FR-08** — Il sistema invia gli articoli raccolti a Claude (Anthropic) tramite un prompt strutturato che produce un output con: (1) sintesi generale del tema, (2) sezioni distinte per ogni posizione/punto di vista identificato nelle fonti, (3) lista fonti citate con titolo e URL cliccabile.
- **FR-09** — Il prompt rispetta il tono scelto dall'utente come parametro esplicito, definito in `src/lib/tones.ts`. Il tono neutro non aggiunge giudizi di valore né enfatizza una posizione sull'altra.

### Notifica

- **FR-10** — Al completamento del job, il sistema invia una email all'indirizzo registrato dell'utente contenente il distillato completo.
- **FR-11** — L'email include i link originali alle fonti, cliccabili, per consentire la verifica diretta.

### Storico e Consultazione

- **FR-12** — L'utente autenticato può visualizzare la lista di tutti i distillati richiesti, con stato aggiornato: in coda / in elaborazione / completato / errore.
- **FR-13** — L'utente può aprire un distillato completato e consultarlo nella web app, con le sezioni delle posizioni e i link alle fonti cliccabili.

---

## Requisiti Non Funzionali

### Sicurezza

- **SEC-01** — Ogni `DistillJob` è associato all'`userId` dell'utente autenticato. Le API routes verificano che l'utente richiedente sia il proprietario del job prima di restituire dati o risultati.
- **SEC-02** — Le API key esterne (`TAVILY_API_KEY`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`) sono variabili d'ambiente server-side e non vengono mai esposte al bundle client.
- **SEC-03** — L'autenticazione utilizza sessioni su DB con cookie httpOnly (pattern boilerplate esistente). Le sessioni sono invalidate al logout.

### Integrazioni

- **INT-01 — Tavily API:** utilizzata dal worker per la ricerca e l'estrazione del contenuto degli articoli. Chiave configurata via `TAVILY_API_KEY`.
- **INT-02 — Anthropic Claude API:** utilizzata dal worker per la distillazione AI. Chiave configurata via `ANTHROPIC_API_KEY`. Modello di default: `claude-sonnet-4-6`.
- **INT-03 — Resend:** utilizzato dal worker per l'invio dell'email di notifica al completamento del distillato. Chiave configurata via `RESEND_API_KEY`.

---

## Prossimi Passi

1. **Backlog** — Esegui `/archetipo-spec` per trasformare questo PRD in un backlog di user stories
2. **Design** — Esegui `/archetipo-design` per i mockup UI (form di richiesta, vista distillato, storico)
3. **Validazione** — Verifica la struttura del prompt AI su un esempio reale prima di implementare il worker

---

_PRD generato tramite ARchetipo Product Inception — 2026-06-18_
_Sessione condotta da: Alessandro Giardina con il team ARchetipo_
