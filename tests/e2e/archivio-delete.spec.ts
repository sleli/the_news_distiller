import { test, expect } from "@playwright/test";

/**
 * US-026 — Bottone cestino vintage nelle card dell'archivio storico
 *
 * Scenari testati:
 * 1. Eliminazione con successo — card scompare senza reload
 * 2. Annullamento dialog — card rimane
 * 3. Errore API intercettato → rollback e messaggio di errore
 * 4. Bottone delete-btn visibile su card di stati diversi
 */

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

async function signIn(page: import("@playwright/test").Page) {
  const res = await page.request.post("/api/auth/signin", {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
}

// --- Scenario 1: Eliminazione con successo senza reload ---
test("eliminazione card da archivio: scompare dalla griglia senza ricaricare la pagina", async ({
  page,
}) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  await signIn(page);

  // Crea un job di test per garantire almeno un item nell'archivio
  const createRes = await page.request.post("/api/distill", {
    data: { topic: "Test eliminazione archivio E2E", tone: "neutro" },
  });
  if (!createRes.ok()) {
    test.skip(true, "Impossibile creare job di test — skip");
    return;
  }

  await page.goto("/archivio");
  await expect(page).toHaveURL(/\/archivio/);

  const grid = page.getByTestId("archive-grid");
  await expect(grid).toBeVisible();

  const cards = page.getByTestId("archive-card");
  const countBefore = await cards.count();
  expect(countBefore).toBeGreaterThan(0);

  // Verifica che il bottone cestino sia presente sulla prima card
  const firstDeleteBtn = cards.first().getByTestId("delete-btn");
  await expect(firstDeleteBtn).toBeVisible();

  // Registra il listener PRIMA del click per auto-confermare
  page.on("dialog", (dialog) => dialog.accept());

  await firstDeleteBtn.click();

  // La griglia deve avere una card in meno senza reload
  await expect(cards).toHaveCount(countBefore - 1);
});

// --- Scenario 2: Annullamento dialog — card rimane ---
test("annullamento dialog eliminazione: la card rimane in archivio", async ({
  page,
}) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  await signIn(page);

  const createRes = await page.request.post("/api/distill", {
    data: { topic: "Test annullamento eliminazione archivio E2E", tone: "neutro" },
  });
  if (!createRes.ok()) {
    test.skip(true, "Impossibile creare job di test — skip");
    return;
  }

  await page.goto("/archivio");
  await expect(page).toHaveURL(/\/archivio/);

  const grid = page.getByTestId("archive-grid");
  await expect(grid).toBeVisible();

  const cards = page.getByTestId("archive-card");
  const countBefore = await cards.count();
  expect(countBefore).toBeGreaterThan(0);

  const firstDeleteBtn = cards.first().getByTestId("delete-btn");
  await expect(firstDeleteBtn).toBeVisible();

  // Registra il listener per annullare il dialog
  page.on("dialog", (dialog) => dialog.dismiss());

  await firstDeleteBtn.click();

  // Il contatore deve essere invariato
  await expect(cards).toHaveCount(countBefore);
});

// --- Scenario 3: Errore API intercettato → rollback e messaggio di errore ---
test("errore API eliminazione archivio: rollback della card e messaggio deleteError", async ({
  page,
}) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  await signIn(page);

  const createRes = await page.request.post("/api/distill", {
    data: { topic: "Test errore eliminazione archivio E2E", tone: "neutro" },
  });
  if (!createRes.ok()) {
    test.skip(true, "Impossibile creare job di test — skip");
    return;
  }

  await page.goto("/archivio");
  await expect(page).toHaveURL(/\/archivio/);

  const grid = page.getByTestId("archive-grid");
  await expect(grid).toBeVisible();

  const cards = page.getByTestId("archive-card");
  const countBefore = await cards.count();
  expect(countBefore).toBeGreaterThan(0);

  // Intercetta DELETE verso /api/distill/* → risposta 500
  await page.route("**/api/distill/**", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({ status: 500, body: "Internal Server Error" });
    } else {
      await route.continue();
    }
  });

  // Registra il listener per auto-confermare
  page.on("dialog", (dialog) => dialog.accept());

  const firstDeleteBtn = cards.first().getByTestId("delete-btn");
  await firstDeleteBtn.click();

  // Dopo rollback, le card tornano al conteggio iniziale
  await expect(cards).toHaveCount(countBefore);

  // Il banner di errore deve essere visibile
  const deleteErrorBanner = page.getByTestId("delete-error");
  await expect(deleteErrorBanner).toBeVisible();
  await expect(deleteErrorBanner).toContainText("Impossibile eliminare");
});

// --- Scenario 4: Bottone delete-btn visibile su card di stati diversi ---
test("bottone delete-btn visibile su tutte le card dell'archivio indipendentemente dallo stato", async ({
  page,
}) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  await signIn(page);

  await page.goto("/archivio");
  await expect(page).toHaveURL(/\/archivio/);

  // Seleziona "Tutti" per vedere card di qualsiasi stato
  const filterAll = page.getByTestId("filter-all");
  await filterAll.click();

  const cards = page.getByTestId("archive-card");
  const count = await cards.count();

  if (count === 0) {
    // Nessuna card — test passa silenziosamente (archivio vuoto)
    return;
  }

  // Verifica che ogni card abbia il bottone delete-btn
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const deleteBtn = card.getByTestId("delete-btn");
    await expect(deleteBtn).toBeVisible();
  }
});
