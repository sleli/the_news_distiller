import { test, expect } from "@playwright/test";

test.describe("US-002 — Middleware protezione /distill", () => {
  test("utente non autenticato viene reindirizzato a /auth/signin", async ({
    page,
  }) => {
    await page.goto("/distill");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("utente non autenticato su /distill/[id] viene reindirizzato a /auth/signin", async ({
    page,
  }) => {
    await page.goto("/distill/some-job-id");
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

test.describe("US-002 — Accesso autenticato a /distill", () => {
  test.skip(!email || !password, "Richiede TEST_USER_EMAIL e TEST_USER_PASSWORD");

  test("utente autenticato accede a /distill senza redirect", async ({
    page,
  }) => {
    await page.goto("/auth/signin");
    await page.fill('input[type="email"]', email!);
    await page.fill('input[type="password"]', password!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard|\/distill/);

    await page.goto("/distill");
    await expect(page).toHaveURL(/\/distill/);
    await expect(page).not.toHaveURL(/\/auth\/signin/);
  });
});
