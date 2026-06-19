import { test, expect } from "@playwright/test";

/**
 * US-023 — E2E Tests: Bottone "Argomento del giorno"
 *
 * Uses page.route() to mock /api/distill/trending so tests run
 * without a real Tavily API key.
 *
 * Authentication tests require TEST_USER_EMAIL and TEST_USER_PASSWORD.
 */

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

async function signIn(page: import("@playwright/test").Page) {
  const res = await page.request.post("/api/auth/signin", {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
}

async function mockTrendingOk(page: import("@playwright/test").Page, topic: string) {
  await page.route("**/api/distill/trending", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ topic }),
    });
  });
}

async function mockTrendingError(page: import("@playwright/test").Page) {
  await page.route("**/api/distill/trending", (route) => {
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Errore Tavily" }),
    });
  });
}

// --- Scenario 1: Pre-compilazione diretta (campo vuoto) ---
test("pre-compilazione diretta: campo vuoto → click bottone → topic pre-compilato", async ({ page }) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  await signIn(page);
  await mockTrendingOk(page, "Intelligenza artificiale e lavoro");

  await page.goto("/distill");
  await expect(page).toHaveURL(/\/distill/);

  const topicInput = page.getByTestId("topic-input");
  await expect(topicInput).toHaveValue("");

  const trendingBtn = page.getByTestId("trending-btn");
  await expect(trendingBtn).toBeVisible();
  await trendingBtn.click();

  await expect(topicInput).toHaveValue("Intelligenza artificiale e lavoro");
});

// --- Scenario 2: Dialog + Sovrascrivi ---
test("dialog di conferma: campo valorizzato → click bottone → dialog → Sovrascrivi → topic aggiornato", async ({ page }) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  await signIn(page);
  await mockTrendingOk(page, "Trending topic del giorno");

  await page.goto("/distill");
  await expect(page).toHaveURL(/\/distill/);

  const topicInput = page.getByTestId("topic-input");
  await topicInput.fill("Argomento già inserito");

  const trendingBtn = page.getByTestId("trending-btn");
  await trendingBtn.click();

  // Dialog deve apparire
  const dialog = page.getByTestId("overwrite-dialog");
  await expect(dialog).toBeVisible();

  // Il campo non è ancora cambiato
  expect(await topicInput.inputValue()).toBe("Argomento già inserito");

  // Clicca Sovrascrivi
  const confirmBtn = page.getByTestId("confirm-overwrite-btn");
  await confirmBtn.click();

  // Il campo viene aggiornato e il dialog chiuso
  await expect(topicInput).toHaveValue("Trending topic del giorno");
  await expect(dialog).not.toBeVisible();
});

// --- Scenario 3: Dialog + Annulla ---
test("dialog di conferma: Annulla → topic invariato e dialog chiuso", async ({ page }) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  await signIn(page);
  await mockTrendingOk(page, "Trending topic del giorno");

  await page.goto("/distill");
  await expect(page).toHaveURL(/\/distill/);

  const topicInput = page.getByTestId("topic-input");
  await topicInput.fill("Argomento già inserito");

  const trendingBtn = page.getByTestId("trending-btn");
  await trendingBtn.click();

  const dialog = page.getByTestId("overwrite-dialog");
  await expect(dialog).toBeVisible();

  const cancelBtn = page.getByTestId("cancel-overwrite-btn");
  await cancelBtn.click();

  await expect(dialog).not.toBeVisible();
  expect(await topicInput.inputValue()).toBe("Argomento già inserito");
});

// --- Scenario 4: Errore API + toast ---
test("errore API: toast di errore mostrato, campo invariato", async ({ page }) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  await signIn(page);
  await mockTrendingError(page);

  await page.goto("/distill");
  await expect(page).toHaveURL(/\/distill/);

  const topicInput = page.getByTestId("topic-input");
  await expect(topicInput).toHaveValue("");

  const trendingBtn = page.getByTestId("trending-btn");
  await trendingBtn.click();

  // Toast di errore deve essere visibile
  await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5000 });

  // Il campo rimane vuoto
  expect(await topicInput.inputValue()).toBe("");
});
