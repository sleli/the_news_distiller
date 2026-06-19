import { test, expect } from '@playwright/test';

/**
 * US-018 — Demo scenario
 *
 * Demonstrates: Marco visita /settings, seleziona "Claude CLI (subprocess)",
 * salva e vede la conferma. La scelta è persistita dopo ricarica.
 *
 * Requires TEST_USER_EMAIL and TEST_USER_PASSWORD.
 */
test.use({
  video: 'on',
  launchOptions: { slowMo: 300 },
  viewport: { width: 1280, height: 720 },
});

test('demo__settings-claude-mode — Marco configura la modalità Claude CLI e salva', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    test.skip();
    return;
  }

  // Authenticate
  const signinRes = await page.request.post('/api/auth/signin', {
    data: { email, password },
  });
  expect(signinRes.ok()).toBeTruthy();

  // Reset to API_KEY so the change is visible
  await page.request.patch('/api/settings', {
    data: { claudeMode: 'API_KEY' },
  });

  // Navigate to settings page
  await page.goto('/settings');
  await expect(page.locator('h1')).toContainText('Pannello di Controllo');

  // Verify initial state — API_KEY selected
  await expect(page.getByTestId('card-api-key')).toHaveClass(/selected/);

  // Select CLI_SUBPROCESS
  await page.getByTestId('card-cli').click();
  await expect(page.getByTestId('card-cli')).toHaveClass(/selected/);
  await expect(page.getByTestId('card-api-key')).not.toHaveClass(/selected/);

  // Save
  await page.getByTestId('save-button').click();

  // Verify confirmation feedback
  await expect(page.getByTestId('feedback-success')).toBeVisible();

  // Reload and verify persistence
  await page.reload();
  await expect(page.getByTestId('card-cli')).toHaveClass(/selected/);

  // Hold end state
  await page.waitForTimeout(1500);
});
