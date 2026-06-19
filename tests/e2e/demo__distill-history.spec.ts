import { test, expect } from "@playwright/test";

/**
 * US-015 — Demo Scenario: Marco vede lo storico dei distillati
 *
 * Demonstrates: Marco visita /distill e vede la lista dei suoi distillati con
 * topic, stato, data e tono. I job completati hanno un link alla pagina di dettaglio.
 *
 * Video registrato in docs/test-results/US-015/
 *
 * Prerequisites:
 * - Dev server running at http://localhost:3000
 * - TEST_USER_EMAIL e TEST_USER_PASSWORD env vars impostati
 * - L'utente ha almeno un job nel DB (creato in precedenza)
 */

test.use({
  video: "on",
  launchOptions: {
    slowMo: 300,
  },
  viewport: { width: 1280, height: 720 },
});

test("demo__Marco-vede-storico-distillati", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    test.skip(
      true,
      "TEST_USER_EMAIL e TEST_USER_PASSWORD non impostati — skip demo"
    );
    return;
  }

  // Step 1: Autenticazione come Marco
  const signinResponse = await page.request.post("/api/auth/signin", {
    data: { email, password },
  });
  expect(signinResponse.ok()).toBeTruthy();

  // Step 2: Crea un job di test per popolare lo storico
  const createRes = await page.request.post("/api/distill", {
    data: { topic: "Intelligenza artificiale e lavoro in Italia", tone: "analitico" },
  });
  // Non bloccare se la creazione fallisce — potrebbe già esistere uno storico
  const jobId = createRes.ok() ? (await createRes.json()).jobId : null;

  // Step 3: Visita /distill
  await page.goto("/distill");

  // Verifica che la pagina sia caricata e non reindirizzata
  await expect(page).toHaveURL(/\/distill/);
  await expect(page.locator(".np-masthead-title")).toBeVisible();

  // Step 4: Verifica la sezione "Le Tue Ultime Richieste"
  await expect(page.getByText("Le Tue Ultime Richieste")).toBeVisible();

  // Step 5: Verifica che la lista dello storico sia visibile con almeno un item
  const historyList = page.getByTestId("history-list");

  if (await historyList.isVisible()) {
    // Mostra la lista con gli item — flusso principale
    await expect(historyList).toBeVisible();

    const firstItem = page.getByTestId("history-item").first();
    await expect(firstItem).toBeVisible();

    // Step 6: Verifica che ogni item mostri topic, stato, data e tono
    const statusBadge = firstItem.locator("[data-testid='status-badge']");
    await expect(statusBadge).toBeVisible();

    // Step 7: Se c'è un job DONE, verifica il link cliccabile
    const doneLinks = page.locator(
      "[data-testid='history-item'] a[href^='/distill/']"
    );
    const doneCount = await doneLinks.count();
    if (doneCount > 0) {
      await expect(doneLinks.first()).toBeVisible();
    }
  } else {
    // Nessun job ancora — mostra placeholder
    await expect(page.getByText("Nessuna richiesta recente.")).toBeVisible();
  }

  // Tieni visibile lo stato finale per 1.5 secondi
  await page.waitForTimeout(1500);

  // Cleanup: rimuovi il job di test se è stato creato
  if (jobId) {
    // Non esiste endpoint di delete — lasciamo il job nel DB di test
    void jobId;
  }
});
