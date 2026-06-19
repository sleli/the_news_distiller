import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * US-024 — Demo Scenario: utente vede il messaggio d'errore specifico nella pagina di dettaglio
 *
 * Demonstrates: Un utente con un job FAILED apre la pagina di dettaglio e vede
 * il messaggio d'errore specifico (es. "Nessun articolo trovato per il topic X")
 * nel box "Note dalla Redazione" sotto l'etichetta "Dettaglio errore".
 *
 * Prerequisiti:
 * - Dev server running at http://localhost:3000
 * - TEST_USER_EMAIL e TEST_USER_PASSWORD env vars impostati
 *
 * Video registrato in docs/test-results/US-024/
 */

test.use({
  video: "on",
  launchOptions: { slowMo: 300 },
  viewport: { width: 1280, height: 720 },
});

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

async function signIn(page: import("@playwright/test").Page) {
  const res = await page.request.post("/api/auth/signin", {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
}

async function getTestUserId(userEmail: string): Promise<string> {
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) throw new Error(`Utente non trovato: ${userEmail}`);
    return user.id;
  } finally {
    await prisma.$disconnect();
  }
}

async function createFailedJob(
  userId: string,
  errorText: string
): Promise<string> {
  const prisma = new PrismaClient();
  try {
    const job = await prisma.distillJob.create({
      data: {
        userId,
        topic: "Test Demo US-024 FAILED job",
        tone: "neutro",
        status: "FAILED",
        result: { error: errorText },
      },
    });
    return job.id;
  } finally {
    await prisma.$disconnect();
  }
}

async function deleteJob(jobId: string): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await prisma.distillJob.delete({ where: { id: jobId } });
  } catch {
    // ignore cleanup errors
  } finally {
    await prisma.$disconnect();
  }
}

test("demo__utente-vede-dettaglio-errore-job-FAILED", async ({ page }) => {
  if (!email || !password) {
    test.skip(true, "TEST_USER_EMAIL e TEST_USER_PASSWORD non impostati — skip demo");
    return;
  }

  const userId = await getTestUserId(email);
  const errorText = "Nessun articolo trovato per il topic X";
  const jobId = await createFailedJob(userId, errorText);

  try {
    // Step 1: Autenticazione
    await signIn(page);

    // Step 2: Stato iniziale — mostra la pagina distill (partenza pulita)
    await page.goto("/distill");
    await expect(page.locator(".np-masthead-title")).toBeVisible();

    // Step 3: Naviga sulla pagina di dettaglio del job FAILED
    await page.goto(`/distill/${jobId}`);

    // Step 4: Verifica che lo stato FAILED sia visibile
    await expect(page.getByTestId("job-status")).toBeVisible();

    // Step 5: Verifica che il dettaglio errore sia visibile con il testo corretto
    await expect(page.getByTestId("error-detail")).toBeVisible();
    await expect(page.getByTestId("error-detail")).toContainText(errorText);

    // Step 6: Pausa finale per mostrare il risultato al revisore
    await expect(page.getByTestId("error-detail")).toBeVisible();
    await page.waitForTimeout(1500);
  } finally {
    await deleteJob(jobId);
  }
});
