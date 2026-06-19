import { test, expect } from "@playwright/test";

/**
 * US-022 — Demo Scenario: Marco elimina un distillato dallo storico
 *
 * Demonstrates: Marco apre la pagina storico, vede l'icona cestino accanto a
 * ciascun distillato, clicca su quella di un job, conferma l'eliminazione nel
 * dialog e il job scompare dalla lista senza ricaricare la pagina.
 *
 * Video registrato in docs/test-results/US-022/
 *
 * Prerequisites:
 * - Dev server running at http://localhost:3000
 * - TEST_USER_EMAIL e TEST_USER_PASSWORD env vars impostati
 */

test.use({
  video: "on",
  launchOptions: {
    slowMo: 300,
  },
  viewport: { width: 1280, height: 720 },
});

test("demo__Marco-elimina-distillato-dallo-storico", async ({ page }) => {
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
    data: { topic: "Demo eliminazione distillato", tone: "neutro" },
  });
  if (!createRes.ok()) {
    test.skip(true, "Impossibile creare job di test — skip demo");
    return;
  }

  // Step 3: Naviga a /distill
  await page.goto("/distill");
  await expect(page).toHaveURL(/\/distill/);

  // Step 4: Verifica che la pagina sia caricata
  await expect(page.locator(".np-masthead-title")).toBeVisible();

  // Step 5: Verifica che la lista storico sia visibile con almeno un item
  const historyList = page.getByTestId("history-list");
  await expect(historyList).toBeVisible();

  const items = page.getByTestId("history-item");
  await expect(items.first()).toBeVisible();

  const countBefore = await items.count();

  // Step 6: Verifica che il bottone cestino sia visibile accanto al primo item
  const firstDeleteBtn = items.first().getByTestId("delete-btn");
  await expect(firstDeleteBtn).toBeVisible();

  // Step 7: Registra il listener per auto-confermare il dialog PRIMA del click
  page.on("dialog", (dialog) => dialog.accept());

  // Step 8: Clicca il bottone cestino del primo item
  await firstDeleteBtn.click();

  // Step 9: Verifica che il job sia scomparso dalla lista
  await expect(items).toHaveCount(countBefore - 1);

  // Tieni visibile lo stato finale per 1500ms
  await page.waitForTimeout(1500);
});
