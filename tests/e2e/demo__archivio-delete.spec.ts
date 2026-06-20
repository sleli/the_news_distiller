import { test, expect } from "@playwright/test";

/**
 * US-026 — Demo Scenario: Marco elimina un distillato dall'archivio
 *
 * Demonstrates: Marco apre /archivio, vede il bottone cestino vintage su ogni card,
 * clicca su quello di un job, conferma l'eliminazione nel dialog e la card scompare
 * dalla griglia senza ricaricare la pagina.
 *
 * Video registrato in docs/test-results/US-026/
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

test("demo__Marco-elimina-distillato-da-archivio", async ({ page }) => {
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

  // Step 2: Crea un job di test per popolare l'archivio
  const createRes = await page.request.post("/api/distill", {
    data: { topic: "Demo eliminazione da archivio", tone: "neutro" },
  });
  if (!createRes.ok()) {
    test.skip(true, "Impossibile creare job di test — skip demo");
    return;
  }

  // Step 3: Naviga a /archivio
  await page.goto("/archivio");
  await expect(page).toHaveURL(/\/archivio/);

  // Step 4: Verifica che la pagina sia caricata
  await expect(page.locator(".np-masthead-title")).toBeVisible();

  // Step 5: Verifica che la griglia archivio sia visibile con almeno una card
  const grid = page.getByTestId("archive-grid");
  await expect(grid).toBeVisible();

  const cards = page.getByTestId("archive-card");
  await expect(cards.first()).toBeVisible();
  const countBefore = await cards.count();

  // Step 6: Verifica che il bottone cestino vintage sia visibile sulla prima card
  const firstDeleteBtn = cards.first().getByTestId("delete-btn");
  await expect(firstDeleteBtn).toBeVisible();

  // Step 7: Registra il listener per auto-confermare il dialog PRIMA del click
  page.on("dialog", (dialog) => dialog.accept());

  // Step 8: Clicca il bottone cestino della prima card
  await firstDeleteBtn.click();

  // Step 9: Verifica che la card sia scomparsa dalla griglia
  await expect(cards).toHaveCount(countBefore - 1);

  // Tieni visibile lo stato finale per 1500ms
  await page.waitForTimeout(1500);
});
