import { test, expect } from '@playwright/test';

/**
 * US-007 — Demo Scenario: Marco requests a distillato
 *
 * This spec records a video of Marco's full interaction with the /distill form.
 * Video is stored in docs/test-results/US-007/
 *
 * Prerequisites:
 * - Dev server running at http://localhost:3000
 * - TEST_USER_EMAIL and TEST_USER_PASSWORD env vars set
 *   (or the test will skip gracefully)
 */

test.use({
  video: 'on',
  launchOptions: {
    slowMo: 300,
  },
});

test('Marco visits /distill, enters topic, selects tone, and submits', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    test.skip(true, 'TEST_USER_EMAIL and TEST_USER_PASSWORD not set — skipping demo');
    return;
  }

  // Step 1: Sign in as Marco
  const signinResponse = await page.request.post('/api/auth/signin', {
    data: { email, password },
  });
  expect(signinResponse.ok()).toBeTruthy();

  // Step 2: Navigate to /distill
  await page.goto('/distill');

  // Verify the page loaded correctly (not redirected)
  await expect(page).toHaveURL(/\/distill/);
  await expect(page.locator('h1')).toContainText('Distillatore');

  // Step 3: Enter topic "riforma pensioni"
  const textarea = page.locator('textarea#topic');
  await textarea.click();
  await textarea.fill('riforma pensioni');

  // Verify character counter updated
  await expect(page.locator('text=/\\d+ \\/ 300 caratteri/')).toBeVisible();

  // Step 4: Select "analitico" tone
  await page.click('label:has(input[value="analitico"])');

  // Step 5: Verify tone description is shown
  await expect(page.getByTestId('tone-preview')).toContainText('dati, prove e catene di ragionamento');

  // Step 6: Verify submit button is now active (enabled)
  const submitBtn = page.getByTestId('submit-button');
  await expect(submitBtn).toBeEnabled();
  await expect(submitBtn).toContainText('Distilla');

  // Step 7: Submit the form and verify the API response
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes('/api/distill') && res.request().method() === 'POST'),
    submitBtn.click(),
  ]);

  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(typeof body.jobId).toBe('string');
  expect(body.jobId).toBeTruthy();
  expect(typeof body.message).toBe('string');

  // Hold end state visible so the video captures the outcome
  await page.waitForTimeout(1500);
});
