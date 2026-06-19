import { test, expect } from "@playwright/test";

/**
 * US-016 — Demo Scenario: Marco apre un distillato completato
 *
 * Demonstrates: Marco apre /distill/[id] per un job completato e vede:
 * la sintesi generale, almeno due sezioni di posizione con label e testo,
 * e una lista di fonti con URL che si aprono in un nuovo tab.
 *
 * Prerequisiti:
 * - Dev server running at http://localhost:3000
 * - TEST_USER_EMAIL e TEST_USER_PASSWORD env vars impostati
 * - TEST_DONE_JOB_ID: ID di un job DONE nel DB (con result JSON popolato)
 *
 * Video registrato in docs/test-results/US-016/
 */

test.use({
  video: "on",
  launchOptions: { slowMo: 300 },
  viewport: { width: 1280, height: 720 },
});

test("demo__Marco-apre-distillato-completato-con-fonti-cliccabili", async ({
  page,
}) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  const doneJobId = process.env.TEST_DONE_JOB_ID;

  if (!email || !password) {
    test.skip(true, "TEST_USER_EMAIL e TEST_USER_PASSWORD non impostati — skip demo");
    return;
  }

  if (!doneJobId) {
    test.skip(
      true,
      "TEST_DONE_JOB_ID non impostato — il demo richiede un job DONE nel DB. Skip."
    );
    return;
  }

  // Step 1: Autenticazione come Marco
  const signinResponse = await page.request.post("/api/auth/signin", {
    data: { email, password },
  });
  expect(signinResponse.ok()).toBeTruthy();

  // Step 2: Stato iniziale — visita /distill per mostrare lo storico
  await page.goto("/distill");
  await expect(page).toHaveURL(/\/distill/);
  await expect(page.locator(".np-masthead-title")).toBeVisible();

  // Step 3: Naviga direttamente alla pagina di dettaglio del job DONE
  await page.goto(`/distill/${doneJobId}`);

  // Step 4: Verifica che il distillato sia visibile
  await expect(page.getByTestId("distill-result")).toBeVisible();

  // Step 5: Verifica la sezione sintesi
  await expect(page.getByTestId("synthesis-section")).toBeVisible();

  // Step 6: Verifica almeno due sezioni di posizione
  const positions = page.getByTestId("position-section");
  await expect(positions.first()).toBeVisible();
  await expect(positions.nth(1)).toBeVisible();

  // Step 7: Verifica la lista fonti con link cliccabili
  await expect(page.getByTestId("sources-list")).toBeVisible();
  const firstSourceLink = page.getByTestId("source-link").first();
  await expect(firstSourceLink).toBeVisible();
  await expect(firstSourceLink).toHaveAttribute("target", "_blank");

  // Step 8: Pausa finale per mostrare il risultato al revisore
  await expect(page.getByTestId("distill-result")).toBeVisible();
  await page.waitForTimeout(1500);
});
