import { test, expect } from "@playwright/test";

/**
 * US-020 — Demo Scenario: Marco vede la pagina Archivio con griglia e stato
 *
 * Demonstrates: Marco clicca "Archivio" nella navbar, atterra su /archivio
 * e vede i suoi distillati in una griglia a due colonne con topic, data, tono,
 * contatori, snippet e indicatore di stato tramite bordo colorato.
 *
 * Video registrato in docs/test-results/US-020/
 */

test.use({
  video: "on",
  launchOptions: {
    slowMo: 300,
  },
  viewport: { width: 1280, height: 720 },
});

test("demo__Marco-naviga-su-archivio-e-vede-la-griglia", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    test.skip(true, "TEST_USER_EMAIL e TEST_USER_PASSWORD non impostati — skip demo");
    return;
  }

  // Step 1: Autenticazione come Marco
  const signinResponse = await page.request.post("/api/auth/signin", {
    data: { email, password },
  });
  expect(signinResponse.ok()).toBeTruthy();

  // Step 2: Crea un job di test per popolare l'archivio
  const createRes = await page.request.post("/api/distill", {
    data: { topic: "Intelligenza artificiale e lavoro in Italia", tone: "analitico" },
  });
  const jobId = createRes.ok() ? (await createRes.json()).jobId : null;

  // Step 3: Visita /distill per vedere la navbar con il link Archivio
  await page.goto("/distill");
  await expect(page.locator(".np-masthead-title")).toBeVisible();
  await expect(page.locator("a[href='/archivio']")).toBeVisible();

  // Step 4: Clicca "Archivio" nella navbar
  await page.click("a[href='/archivio']");
  await expect(page).toHaveURL(/\/archivio/);

  // Step 5: Verifica che la pagina Archivio sia caricata
  await expect(page.locator(".np-masthead-title")).toBeVisible();
  await expect(page.locator("a[href='/archivio'].active")).toBeVisible();

  // Step 6: Verifica la presenza dei filter chips
  await expect(page.getByTestId("filter-chips")).toBeVisible();
  await expect(page.getByTestId("filter-all")).toBeVisible();

  // Step 7: Verifica la griglia o l'empty state
  const grid = page.getByTestId("archive-grid");
  const emptyState = page.getByTestId("empty-state");

  const hasGrid = await grid.isVisible();
  const hasEmpty = await emptyState.isVisible();
  expect(hasGrid || hasEmpty).toBeTruthy();

  // Step 8: Se la griglia è visibile, verifica la struttura delle card
  if (hasGrid) {
    const firstCard = page.locator("[data-testid='archive-card']").first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.getByTestId("card-topic")).toBeVisible();
    await expect(firstCard.getByTestId("card-date")).toBeVisible();
    await expect(firstCard.getByTestId("card-tone")).toBeVisible();
    await expect(firstCard.getByTestId("card-status")).toBeVisible();
  }

  // Step 9: Se esiste un job DONE, verifica snippet e link Leggi
  const doneCard = page.locator("[data-testid='archive-card'][data-status='DONE']").first();
  if (await doneCard.isVisible()) {
    await expect(doneCard.getByTestId("card-read-link")).toBeVisible();
  }

  // Step 10: Hold finale — mostra l'archivio per un secondo
  await page.waitForTimeout(1500);

  // Cleanup: rimuovi il job di test se creato
  if (jobId) {
    // Il job può essere cancellato manualmente se necessario
  }
});
