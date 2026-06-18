import { test, expect } from "@playwright/test";

/**
 * US-008 — API test per POST /api/distill
 *
 * Testa il route handler direttamente tramite la request fixture di Playwright.
 * Nel beforeAll crea un utente di test e ottiene il cookie di sessione.
 */

const TEST_EMAIL = `test-us008-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
const TEST_PASSWORD = "TestPassword123!";

test.describe("US-008 — POST /api/distill", () => {
  let sessionCookie: string;

  test.beforeAll(async ({ request }) => {
    // Registra utente di test — accetta anche 409 (già esistente da altro worker)
    const signup = await request.post("/api/auth/signup", {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    expect([200, 201, 409].includes(signup.status())).toBeTruthy();

    // Sign in per ottenere il cookie di sessione
    const signin = await request.post("/api/auth/signin", {
      data: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    expect(signin.ok()).toBeTruthy();

    // Estrai il cookie "session" dall'header Set-Cookie
    const setCookieHeader = signin.headers()["set-cookie"] ?? "";
    const match = setCookieHeader.match(/session=([^;]+)/);
    sessionCookie = match ? match[1] : "";
    expect(sessionCookie).toBeTruthy();
  });

  // --- 401 senza sessione ---
  test("restituisce 401 senza cookie di sessione", async ({ request }) => {
    const response = await request.post("/api/distill", {
      data: { topic: "riforma pensioni", tone: "neutro" },
    });
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  // --- 400 topic vuoto ---
  test("restituisce 400 con topic vuoto", async ({ request }) => {
    const response = await request.post("/api/distill", {
      headers: { Cookie: `session=${sessionCookie}` },
      data: { topic: "", tone: "neutro" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  // --- 400 tone non valido ---
  test("restituisce 400 con tone non valido", async ({ request }) => {
    const response = await request.post("/api/distill", {
      headers: { Cookie: `session=${sessionCookie}` },
      data: { topic: "riforma pensioni", tone: "sconosciuto" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  // --- 400 topic troppo lungo ---
  test("restituisce 400 con topic superiore a 300 caratteri", async ({ request }) => {
    const response = await request.post("/api/distill", {
      headers: { Cookie: `session=${sessionCookie}` },
      data: { topic: "a".repeat(301), tone: "neutro" },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  // --- 201 payload valido ---
  test("restituisce 201 con jobId e message per payload valido", async ({ request }) => {
    const response = await request.post("/api/distill", {
      headers: { Cookie: `session=${sessionCookie}` },
      data: { topic: "riforma pensioni", tone: "neutro" },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(typeof body.jobId).toBe("string");
    expect(body.jobId).toBeTruthy();
    expect(typeof body.message).toBe("string");
    expect(body.message).toBeTruthy();
  });

  // --- 201 con tutti i toni validi ---
  for (const tone of ["neutro", "analitico", "divulgativo", "critico"]) {
    test(`accetta il tono "${tone}"`, async ({ request }) => {
      const response = await request.post("/api/distill", {
        headers: { Cookie: `session=${sessionCookie}` },
        data: { topic: "cambiamento climatico", tone },
      });
      expect(response.status()).toBe(201);
    });
  }
});
