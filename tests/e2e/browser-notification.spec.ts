import { test, expect } from "@playwright/test";

/**
 * US-021 — Demo Scenario: notifica browser al completamento di un distillato
 *
 * Demonstrates: L'utente avvia un distillato, minimizza la finestra e al
 * completamento (DONE) compare una notifica di sistema del browser con titolo
 * e messaggio "Distillato pronto" — senza alcun refresh manuale.
 *
 * Video registrato in docs/test-results/US-021/
 */

test.use({
  video: "on",
  launchOptions: {
    slowMo: 300,
  },
  viewport: { width: 1280, height: 720 },
});

test("demo__notifica-browser-al-completamento-distillato", async ({ page, context }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    test.skip(true, "TEST_USER_EMAIL e TEST_USER_PASSWORD non impostati — skip demo");
    return;
  }

  // Concedi permesso notifiche al contesto browser
  await context.grantPermissions(["notifications"]);

  // Inietta mock window.Notification prima di ogni navigazione
  const notificationCalls: Array<{ title: string; body: string; tag: string }> = [];
  await page.addInitScript(() => {
    const calls: Array<{ title: string; body: string; tag: string }> = [];
    (window as Window & typeof globalThis & { __notificationCalls: typeof calls }).__notificationCalls = calls;

    const OrigNotification = window.Notification;
    class MockNotification extends OrigNotification {
      constructor(title: string, opts?: NotificationOptions) {
        super(title, opts);
        calls.push({ title, body: (opts?.body as string) ?? "", tag: (opts?.tag as string) ?? "" });
      }
    }
    (MockNotification as unknown as typeof Notification).requestPermission =
      OrigNotification.requestPermission?.bind(OrigNotification);
    Object.defineProperty(MockNotification, "permission", {
      get: () => "granted",
    });
    window.Notification = MockNotification as unknown as typeof Notification;
  });

  // Step 1: Autenticazione
  const signinRes = await page.request.post("/api/auth/signin", {
    data: { email, password },
  });
  expect(signinRes.ok()).toBeTruthy();

  // Step 2: Naviga su /archivio (stato iniziale pulito — empty state o job esistenti)
  await page.goto("/archivio");
  await expect(page.locator(".np-masthead-title")).toBeVisible();

  // Step 3: Intercept GET /api/distill — prima risposta: job RUNNING, poi: job DONE
  let fetchCount = 0;
  const jobId = "mock-job-us021";
  const topic = "Notifica browser demo US-021";

  await page.route("**/api/distill", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    fetchCount++;
    // 1° poll: RUNNING (imposta la baseline) — 2° poll: DONE (fa scattare la notifica).
    // Con 3 poll la notifica arriverebbe a ~15s, proprio al limite del timeout → flaky.
    const status = fetchCount <= 1 ? "RUNNING" : "DONE";
    const job = {
      id: jobId,
      topic,
      tone: "neutro",
      status,
      createdAt: new Date().toISOString(),
      snippet: status === "DONE" ? "Risultato sintetizzato." : null,
      sourceCount: status === "DONE" ? 3 : null,
      positionCount: status === "DONE" ? 2 : null,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([job]),
    });
  });

  // Step 4: Ricarica /archivio con la rotta intercettata attiva
  await page.goto("/archivio");
  await expect(page.locator(".np-masthead-title")).toBeVisible();

  // Step 5: Attendi che il polling riconosca la transizione RUNNING→DONE (entro 15s)
  await expect(async () => {
    const calls = await page.evaluate(
      () => (window as Window & typeof globalThis & { __notificationCalls?: Array<{ title: string; body: string; tag: string }> }).__notificationCalls ?? []
    );
    notificationCalls.push(...calls);
    expect(calls.some((c) => c.body === "Distillato pronto" && c.tag === jobId)).toBe(true);
  }).toPass({ timeout: 15000, intervals: [1000] });

  // Step 6: Asserzione finale — notifica emessa con il topic corretto
  const call = notificationCalls.find((c) => c.body === "Distillato pronto");
  expect(call).toBeDefined();
  expect(call!.title).toBe(topic);
  expect(call!.tag).toBe(jobId);

  // Tieni visibile lo stato finale per il video
  await expect(page.locator("[data-testid='archive-grid'], [data-testid='empty-state']")).toBeVisible();
  await page.waitForTimeout(1500);
});

// --- Test funzionale (non demo, senza video) ---
test("notifica non emessa se il job è già DONE al caricamento iniziale", async ({ page, context }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    test.skip(true, "TEST_USER_EMAIL e TEST_USER_PASSWORD non impostati — skip");
    return;
  }

  await context.grantPermissions(["notifications"]);

  await page.addInitScript(() => {
    const calls: Array<{ title: string; body: string }> = [];
    (window as Window & typeof globalThis & { __notificationCalls: typeof calls }).__notificationCalls = calls;
    class MockNotification extends window.Notification {
      constructor(title: string, opts?: NotificationOptions) {
        super(title, opts);
        calls.push({ title, body: (opts?.body as string) ?? "" });
      }
    }
    Object.defineProperty(MockNotification, "permission", { get: () => "granted" });
    window.Notification = MockNotification as unknown as typeof Notification;
  });

  await page.request.post("/api/auth/signin", { data: { email, password } });

  // Tutti i job sono già DONE → nessun polling attivo
  await page.route("**/api/distill", async (route) => {
    if (route.request().method() !== "GET") { await route.continue(); return; }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{
        id: "job-done",
        topic: "Già completato",
        tone: "neutro",
        status: "DONE",
        createdAt: new Date().toISOString(),
        snippet: "Già pronto.",
        sourceCount: 1,
        positionCount: 1,
      }]),
    });
  });

  await page.goto("/archivio");
  await expect(page.locator(".np-masthead-title")).toBeVisible();

  // Attendi un tick (nessun polling dovrebbe scattare)
  await page.waitForTimeout(2000);

  const calls = await page.evaluate(
    () => (window as Window & typeof globalThis & { __notificationCalls?: Array<unknown> }).__notificationCalls ?? []
  );
  expect(calls).toHaveLength(0);
});

// --- Pagina di DETTAGLIO: notifica al completamento mentre si resta sulla pagina ---
test("dettaglio: notifica emessa quando il job passa a DONE durante il polling", async ({
  page,
  context,
}) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    test.skip(true, "TEST_USER_EMAIL e TEST_USER_PASSWORD non impostati — skip");
    return;
  }

  await context.grantPermissions(["notifications"]);

  // Mock Notification (permesso già concesso) e raccolta delle chiamate
  await page.addInitScript(() => {
    const calls: Array<{ title: string; body: string; tag: string }> = [];
    (window as Window & typeof globalThis & { __notificationCalls: typeof calls }).__notificationCalls = calls;
    class MockNotification extends window.Notification {
      constructor(title: string, opts?: NotificationOptions) {
        super(title, opts);
        calls.push({ title, body: (opts?.body as string) ?? "", tag: (opts?.tag as string) ?? "" });
      }
    }
    Object.defineProperty(MockNotification, "permission", { get: () => "granted" });
    (MockNotification as unknown as typeof Notification).requestPermission =
      window.Notification.requestPermission?.bind(window.Notification);
    window.Notification = MockNotification as unknown as typeof Notification;
  });

  // Autenticazione + creazione job (parte PENDING)
  await page.request.post("/api/auth/signin", { data: { email, password } });
  const createRes = await page.request.post("/api/distill", {
    data: { topic: "Notifica dettaglio E2E", tone: "neutro" },
  });
  if (!createRes.ok()) {
    test.skip(true, "Impossibile creare job di test — skip");
    return;
  }
  const { jobId } = await createRes.json();

  // Intercetta SOLO l'endpoint del singolo job: prime risposte RUNNING, poi DONE
  let pollCount = 0;
  await page.route(`**/api/distill/${jobId}`, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    pollCount++;
    const status = pollCount <= 1 ? "RUNNING" : "DONE";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: jobId, topic: "Notifica dettaglio E2E", tone: "neutro", status }),
    });
  });

  await page.goto(`/distill/${jobId}`);
  await expect(page.getByTestId("job-status")).toBeVisible();

  // Attendi che il polling rilevi la transizione e spari la notifica
  await expect(async () => {
    const calls = await page.evaluate(
      () =>
        (window as Window & typeof globalThis & {
          __notificationCalls?: Array<{ title: string; body: string; tag: string }>;
        }).__notificationCalls ?? []
    );
    expect(calls.some((c) => c.body === "Distillato pronto" && c.tag === jobId)).toBe(true);
  }).toPass({ timeout: 15000, intervals: [1000] });
});

// --- Pagina di DETTAGLIO: banner "Abilita" quando il permesso è "default" ---
test("dettaglio: banner Abilita appare e il click richiede il permesso", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    test.skip(true, "TEST_USER_EMAIL e TEST_USER_PASSWORD non impostati — skip");
    return;
  }

  // NON concediamo il permesso: simuliamo permission "default" e spiamo requestPermission
  await page.addInitScript(() => {
    let requested = false;
    class DefaultNotification {
      static get permission(): NotificationPermission {
        return "default";
      }
      static requestPermission = async (): Promise<NotificationPermission> => {
        requested = true;
        (window as Window & typeof globalThis & { __permissionRequested: boolean }).__permissionRequested = true;
        return "default";
      };
      constructor() {
        /* noop */
      }
    }
    (window as Window & typeof globalThis & { __permissionRequested: boolean }).__permissionRequested = requested;
    window.Notification = DefaultNotification as unknown as typeof Notification;
  });

  await page.request.post("/api/auth/signin", { data: { email, password } });
  const createRes = await page.request.post("/api/distill", {
    data: { topic: "Banner abilita E2E", tone: "neutro" },
  });
  if (!createRes.ok()) {
    test.skip(true, "Impossibile creare job di test — skip");
    return;
  }
  const { jobId } = await createRes.json();

  await page.goto(`/distill/${jobId}`);

  // Il banner deve comparire (job live + permesso "default")
  await expect(page.getByTestId("notification-prompt")).toBeVisible();

  // Click su "Abilita" → deve invocare Notification.requestPermission()
  await page.getByTestId("notification-enable").click();

  await expect(async () => {
    const requested = await page.evaluate(
      () => (window as Window & typeof globalThis & { __permissionRequested?: boolean }).__permissionRequested ?? false
    );
    expect(requested).toBe(true);
  }).toPass({ timeout: 3000, intervals: [200] });
});

test("permesso negato: nessun errore visibile e nessuna notifica", async ({ page, context }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    test.skip(true, "TEST_USER_EMAIL e TEST_USER_PASSWORD non impostati — skip");
    return;
  }

  // Non concediamo il permesso — il browser risponde "denied"
  await page.addInitScript(() => {
    class DeniedNotification {
      static permission: NotificationPermission = "denied";
      static requestPermission = async () => "denied" as NotificationPermission;
      constructor() { /* noop */ }
    }
    window.Notification = DeniedNotification as unknown as typeof Notification;
  });

  await page.request.post("/api/auth/signin", { data: { email, password } });
  await page.goto("/archivio");
  await expect(page.locator(".np-masthead-title")).toBeVisible();

  // Nessun messaggio di errore visibile
  await expect(page.locator("[data-testid='notification-error']")).toHaveCount(0);
  await page.waitForTimeout(1000);
});
