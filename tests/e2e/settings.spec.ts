import { test, expect } from '@playwright/test';

/**
 * US-018 — Settings page E2E tests
 *
 * Authenticated tests require TEST_USER_EMAIL and TEST_USER_PASSWORD env vars.
 */

// --- Scenario 3: Unauthenticated redirect ---
test('US-018 — redirige gli utenti non autenticati al login', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/auth\/signin/);
});

/**
 * Authenticated flow — requires TEST_USER_EMAIL and TEST_USER_PASSWORD.
 */
test.describe('US-018 — Authenticated settings flow', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      test.skip();
      return;
    }
    const response = await page.request.post('/api/auth/signin', {
      data: { email, password },
    });
    expect(response.ok()).toBeTruthy();
  });

  // --- Scenario 1: Cambio modalità e persistenza ---
  test('cambia modalità in CLI_SUBPROCESS, salva, verifica conferma e persistenza', async ({ page }) => {
    // Reset to API_KEY first
    await page.request.patch('/api/settings', {
      data: { claudeMode: 'API_KEY' },
    });

    await page.goto('/settings');
    await expect(page.getByTestId('card-api-key')).toHaveClass(/selected/);

    await page.getByTestId('card-cli').click();
    await expect(page.getByTestId('card-cli')).toHaveClass(/selected/);
    await expect(page.getByTestId('card-api-key')).not.toHaveClass(/selected/);

    await page.getByTestId('save-button').click();
    await expect(page.getByTestId('feedback-success')).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await expect(page.getByTestId('card-cli')).toHaveClass(/selected/);
  });

  // --- Scenario 2: Persistenza dopo logout/login ---
  test('la scelta persiste dopo logout e nuovo login', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL!;
    const password = process.env.TEST_USER_PASSWORD!;

    // Set CLI_SUBPROCESS
    await page.request.patch('/api/settings', {
      data: { claudeMode: 'CLI_SUBPROCESS' },
    });

    // Logout
    await page.goto('/settings');
    await page.request.post('/auth/signout');
    await page.context().clearCookies();

    // Re-login
    await page.request.post('/api/auth/signin', { data: { email, password } });

    await page.goto('/settings');
    await expect(page.getByTestId('card-cli')).toHaveClass(/selected/);
  });
});
