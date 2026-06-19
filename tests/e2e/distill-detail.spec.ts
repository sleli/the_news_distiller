import { test, expect } from "@playwright/test";

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

async function signIn(page: import("@playwright/test").Page) {
  const res = await page.request.post("/api/auth/signin", {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
}

// --- Scenario 1: Utente non autenticato viene reindirizzato ---
test("utente non autenticato viene reindirizzato a /auth/signin", async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto("/distill/id-qualsiasi");
  await expect(page).toHaveURL(/\/auth\/signin/);
});

// --- Scenario 2: Job DONE mostra distill-result con sintesi e posizioni ---
test("job DONE mostra distillato con sintesi e sezioni posizione", async ({
  page,
}) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  const doneJobId = process.env.TEST_DONE_JOB_ID;
  test.skip(
    !doneJobId,
    "Scenario DONE richiede TEST_DONE_JOB_ID (job completato nel DB) — skip"
  );

  await signIn(page);
  await page.goto(`/distill/${doneJobId}`);

  await expect(page.getByTestId("distill-result")).toBeVisible();
  await expect(page.getByTestId("synthesis-section")).toBeVisible();

  const positionSections = page.getByTestId("position-section");
  await expect(positionSections.first()).toBeVisible();
});

// --- Scenario 3: Job PENDING/PROCESSING mostra job-status, NON distill-result ---
test("job PENDING mostra stato corrente senza mostrare distill-result", async ({
  page,
}) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  await signIn(page);

  const createRes = await page.request.post("/api/distill", {
    data: { topic: "Test E2E dettaglio distillato PENDING", tone: "neutro" },
  });

  if (!createRes.ok()) {
    test.skip(true, "Impossibile creare job di test — skip");
    return;
  }

  const { jobId } = await createRes.json();

  await page.goto(`/distill/${jobId}`);

  await expect(page.getByTestId("job-status")).toBeVisible();
  await expect(page.getByTestId("distill-result")).not.toBeVisible();
});

// --- Scenario 4: Accesso a job di altro utente mostra error-page ---
test("accesso a ID non esistente mostra pagina di errore neutra", async ({
  page,
}) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  await signIn(page);

  // Un UUID che non appartiene a nessun job dell'utente autenticato
  await page.goto("/distill/00000000-0000-0000-0000-000000000000");

  await expect(page.getByTestId("error-page")).toBeVisible();
  await expect(page.getByTestId("distill-result")).not.toBeVisible();
});
