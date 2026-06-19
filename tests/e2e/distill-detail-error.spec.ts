import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * US-024 — Pagina di dettaglio job FAILED
 *
 * Scenario 2 (non-demo): job FAILED con result null → nessun error-detail visibile.
 *
 * Prerequisiti:
 * - Dev server running at http://localhost:3000
 * - TEST_USER_EMAIL e TEST_USER_PASSWORD env vars impostati
 */

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
  resultPayload: Record<string, unknown> | null
): Promise<string> {
  const prisma = new PrismaClient();
  try {
    const job = await prisma.distillJob.create({
      data: {
        userId,
        topic: "Test E2E FAILED job US-024",
        tone: "neutro",
        status: "FAILED",
        result: resultPayload as object,
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

test("job FAILED con result null non mostra error-detail", async ({ page }) => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  const userId = await getTestUserId(email!);
  const jobId = await createFailedJob(userId, null);

  try {
    await signIn(page);
    await page.goto(`/distill/${jobId}`);

    await expect(page.getByTestId("job-status")).toBeVisible();
    await expect(page.getByTestId("error-detail")).not.toBeVisible();

    // Il testo generico nel sidebar deve essere presente
    await expect(page.locator(".np-sidebar-tip").first()).toContainText(
      "Errore di elaborazione"
    );
  } finally {
    await deleteJob(jobId);
  }
});
