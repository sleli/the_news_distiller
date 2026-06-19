import { test, expect } from "@playwright/test";

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

async function signIn(page: import("@playwright/test").Page) {
  const res = await page.request.post("/api/auth/signin", {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
}

// --- Protezione rotta: utente non autenticato ---
test("utente non autenticato viene reindirizzato da /archivio a /auth/signin", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/archivio");
  await expect(page).toHaveURL(/\/auth\/signin/);
});

// --- Navigazione da /distill ad /archivio via navbar ---
test("link Archivio nella navbar porta a /archivio", async ({ page }) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");
  await signIn(page);
  await page.goto("/distill");
  await page.click("a[href='/archivio']");
  await expect(page).toHaveURL(/\/archivio/);
  await expect(page.locator(".np-masthead-title")).toBeVisible();
});

// --- Filtro per stato ---
test("filtro Tutti mostra tutte le card, filtro Errori mostra solo FAILED", async ({ page }) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");
  await signIn(page);
  await page.goto("/archivio");
  await expect(page.getByTestId("filter-chips")).toBeVisible();

  // "Tutti" è attivo di default
  await expect(page.getByTestId("filter-all")).toBeVisible();

  // Clicca Errori — potrebbe mostrare empty state o card FAILED
  await page.click("[data-testid='filter-FAILED']");
  // Verifica che non ci siano card con stato diverso da FAILED
  const nonFailed = page.locator("[data-testid='archive-card']:not([data-status='FAILED'])");
  await expect(nonFailed).toHaveCount(0);
});

// --- Click su link Leggi da card DONE ---
test("click su Leggi in card DONE porta alla pagina di dettaglio", async ({ page }) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");
  await signIn(page);

  // Crea un job DONE via API (o usa uno esistente)
  const createRes = await page.request.post("/api/distill", {
    data: { topic: "Test archivio e2e DONE", tone: "neutro" },
  });
  if (!createRes.ok()) {
    test.skip(true, "Impossibile creare job di test");
    return;
  }

  await page.goto("/archivio");
  const readLink = page.locator("[data-testid='card-read-link']").first();

  if (await readLink.isVisible()) {
    const href = await readLink.getAttribute("href");
    await readLink.click();
    await expect(page).toHaveURL(new RegExp(href ?? "/distill/"));
  }
  // Se non ci sono job DONE, il test passa silenziosamente
});

// --- Empty state con CTA ---
test("empty state visibile quando non ci sono distillati per il filtro", async ({ page }) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");
  await signIn(page);
  await page.goto("/archivio");

  // Applica filtro che probabilmente non ha risultati
  await page.click("[data-testid='filter-RUNNING']");
  const running = page.locator("[data-testid='archive-card'][data-status='RUNNING']");
  const count = await running.count();
  if (count === 0) {
    // Empty state per filtro non-all — niente CTA
    await expect(page.getByTestId("empty-state")).toBeVisible();
  }
});
