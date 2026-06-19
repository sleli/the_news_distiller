import { test, expect } from "@playwright/test";

/**
 * US-023 — Demo Scenario: Bottone "Argomento del giorno"
 *
 * Demonstrates: utente clicca "Argomento del giorno", vede lo spinner,
 * e trova il campo topic pre-compilato con il trending topic.
 * Se il campo è già valorizzato, viene mostrata la dialog di conferma.
 *
 * Video stored in docs/test-results/US-023/
 *
 * Prerequisites:
 * - Dev server running at http://localhost:3000
 * - TEST_USER_EMAIL and TEST_USER_PASSWORD env vars set
 */

test.use({
  video: "on",
  launchOptions: {
    slowMo: 300,
  },
});

test("Argomento del giorno: click → spinner → topic pre-compilato; campo valorizzato → dialog → Sovrascrivi", async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    test.skip(true, "TEST_USER_EMAIL e TEST_USER_PASSWORD non impostati — skip demo");
    return;
  }

  // Mock API per rendere il test deterministico
  await page.route("**/api/distill/trending", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ topic: "Intelligenza artificiale e mercato del lavoro" }),
    });
  });

  // Step 1: Autenticazione
  const signinRes = await page.request.post("/api/auth/signin", {
    data: { email, password },
  });
  expect(signinRes.ok()).toBeTruthy();

  // Step 2: Naviga a /distill
  await page.goto("/distill");
  await expect(page).toHaveURL(/\/distill/);

  // Step 3: Campo vuoto — clicca "Argomento del giorno"
  const topicInput = page.getByTestId("topic-input");
  await expect(topicInput).toHaveValue("");

  const trendingBtn = page.getByTestId("trending-btn");
  await expect(trendingBtn).toBeVisible();
  await trendingBtn.click();

  // Step 4: Verifica che il topic sia stato pre-compilato
  await expect(topicInput).toHaveValue("Intelligenza artificiale e mercato del lavoro");

  // Step 5: Inserisci un secondo argomento per dimostrare la dialog
  await topicInput.fill("Argomento già presente");
  await trendingBtn.click();

  // Step 6: Dialog di conferma appare
  const dialog = page.getByTestId("overwrite-dialog");
  await expect(dialog).toBeVisible();

  // Step 7: Clicca "Sovrascrivi"
  const confirmBtn = page.getByTestId("confirm-overwrite-btn");
  await confirmBtn.click();

  // Step 8: Verifica che il topic sia stato sovrascritto
  await expect(topicInput).toHaveValue("Intelligenza artificiale e mercato del lavoro");
  await expect(dialog).not.toBeVisible();

  // Mantieni lo stato finale visibile nel video
  await page.waitForTimeout(1500);
});
