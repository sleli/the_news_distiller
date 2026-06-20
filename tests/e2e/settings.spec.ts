import { test, expect } from '@playwright/test';

test('US-028 — redirige gli utenti non autenticati al login', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/settings');
  await expect(page).toHaveURL(/\/auth\/signin/);
});

test.describe('US-028 — Settings page autenticata', () => {
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

  test('la pagina settings non mostra il selettore Modalità Claude', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('h1')).toContainText('Pannello di Controllo');

    await expect(page.getByTestId('card-api-key')).not.toBeVisible();
    await expect(page.getByTestId('card-cli')).not.toBeVisible();
    await expect(page.getByTestId('save-button')).not.toBeVisible();
    await expect(page.locator('text=Modalità Claude')).not.toBeVisible();
  });

  test('la pagina mostra la tabella delle variabili d\'ambiente', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('text=AI_PROVIDER')).toBeVisible();
    await expect(page.locator('text=Configurazione Provider')).toBeVisible();
  });
});
