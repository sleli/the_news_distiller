import { test, expect } from "@playwright/test";

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

async function signIn(page: import("@playwright/test").Page) {
  const res = await page.request.post("/api/auth/signin", {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
}

// --- Scenario 1: Eliminazione con successo senza reload ---
test("eliminazione distillato: scompare dalla lista senza ricaricare la pagina", async ({
  page,
}) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  await signIn(page);

  // Crea un job di test per avere almeno un item cancellabile
  const createRes = await page.request.post("/api/distill", {
    data: { topic: "Test eliminazione E2E", tone: "neutro" },
  });
  if (!createRes.ok()) {
    test.skip(true, "Impossibile creare job di test — skip");
    return;
  }

  await page.goto("/distill");
  await expect(page).toHaveURL(/\/distill/);

  const historyList = page.getByTestId("history-list");
  await expect(historyList).toBeVisible();

  const items = page.getByTestId("history-item");
  const countBefore = await items.count();
  expect(countBefore).toBeGreaterThan(0);

  // Registra il listener PRIMA del click che genera il dialog
  page.on("dialog", (dialog) => dialog.accept());

  await items.first().getByTestId("delete-btn").click();

  // Verifica che il contatore sia diminuito di 1 senza ricaricare
  await expect(items).toHaveCount(countBefore - 1);
});

// --- Scenario 2: Annullamento dialog, la riga rimane ---
test("annullamento dialog: il distillato rimane nella lista", async ({
  page,
}) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  await signIn(page);

  // Crea un job di test
  const createRes = await page.request.post("/api/distill", {
    data: { topic: "Test annullamento delete E2E", tone: "neutro" },
  });
  if (!createRes.ok()) {
    test.skip(true, "Impossibile creare job di test — skip");
    return;
  }

  await page.goto("/distill");
  await expect(page).toHaveURL(/\/distill/);

  const historyList = page.getByTestId("history-list");
  await expect(historyList).toBeVisible();

  const items = page.getByTestId("history-item");
  const countBefore = await items.count();
  expect(countBefore).toBeGreaterThan(0);

  // Registra il listener PRIMA del click — annulla il dialog
  page.on("dialog", (dialog) => dialog.dismiss());

  await items.first().getByTestId("delete-btn").click();

  // Il contatore deve essere invariato
  await expect(items).toHaveCount(countBefore);
});

// --- Scenario 3: Errore API con rollback e messaggio ---
test("errore API durante eliminazione: rollback della riga e messaggio di errore", async ({
  page,
}) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  await signIn(page);

  // Crea un job di test
  const createRes = await page.request.post("/api/distill", {
    data: { topic: "Test errore delete E2E", tone: "neutro" },
  });
  if (!createRes.ok()) {
    test.skip(true, "Impossibile creare job di test — skip");
    return;
  }

  await page.goto("/distill");
  await expect(page).toHaveURL(/\/distill/);

  const historyList = page.getByTestId("history-list");
  await expect(historyList).toBeVisible();

  const items = page.getByTestId("history-item");
  const countBefore = await items.count();
  expect(countBefore).toBeGreaterThan(0);

  // Intercetta le chiamate DELETE verso /api/distill/* e forza risposta 500
  await page.route("**/api/distill/**", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({ status: 500, body: "Internal Server Error" });
    } else {
      await route.continue();
    }
  });

  // Registra il listener PRIMA del click
  page.on("dialog", (dialog) => dialog.accept());

  await items.first().getByTestId("delete-btn").click();

  // La riga deve essere ancora presente dopo il rollback
  await expect(items).toHaveCount(countBefore);

  // Deve essere visibile un messaggio di errore
  const errorMsg = page.locator(".np-error-msg");
  const errorText = page.getByText("Impossibile eliminare");
  const hasErrorClass = await errorMsg.isVisible().catch(() => false);
  const hasErrorText = await errorText.isVisible().catch(() => false);
  expect(hasErrorClass || hasErrorText).toBeTruthy();
});
