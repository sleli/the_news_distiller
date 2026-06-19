import { test, expect } from '@playwright/test';

/**
 * US-009 — Conferma in-app dopo l'invio della richiesta
 *
 * Scenario 1 (demo): sign-in → /distill → submit → redirect /distill/[id] → "In coda" + email message
 * Scenario 2: navigazione a /distill/id-inesistente → redirect a /distill
 * Scenario 3: GET /api/distill/[id] con sessione di utente diverso → 404
 *
 * Richiede: TEST_USER_EMAIL e TEST_USER_PASSWORD impostati come variabili d'ambiente.
 */

// ── Demo scenario (video on, slow motion) ──────────────────────────────────

test.describe('US-009 — Demo: flusso submit → pagina conferma', () => {
  test.use({
    video: 'on',
    launchOptions: { slowMo: 300 },
    viewport: { width: 1280, height: 720 },
  });

  test('Marco invia il form e viene portato alla pagina di conferma con status "In coda"', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'TEST_USER_EMAIL e TEST_USER_PASSWORD non impostati — skip demo');
      return;
    }

    // Step 1: Sign in
    const signinResponse = await page.request.post('/api/auth/signin', {
      data: { email, password },
    });
    expect(signinResponse.ok()).toBeTruthy();

    // Step 2: Navigate to /distill
    await page.goto('/distill');
    await expect(page).toHaveURL(/\/distill$/);

    // Step 3: Enter topic
    const textarea = page.getByTestId('topic-input');
    await textarea.click();
    await textarea.fill('Riforma pensioni 2025');

    // Step 4: Submit the form
    const submitBtn = page.getByTestId('submit-button');
    await expect(submitBtn).toBeEnabled();

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/distill') && res.request().method() === 'POST'),
      submitBtn.click(),
    ]);

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(typeof body.jobId).toBe('string');

    // Step 5: Verify redirect to /distill/[id]
    await expect(page).toHaveURL(new RegExp(`/distill/${body.jobId}`));

    // Step 6: Verify "In coda" status badge
    await expect(page.getByTestId('job-status')).toBeVisible();
    await expect(page.getByTestId('job-status')).toContainText('In coda');

    // Step 7: Verify email message
    await expect(page.getByTestId('email-message')).toBeVisible();
    await expect(page.getByTestId('email-message')).toContainText('email');

    // Hold end state visible for video
    await page.waitForTimeout(1500);
  });
});

// ── Non-demo scenarios ─────────────────────────────────────────────────────

test.describe('US-009 — Navigazione a job inesistente', () => {
  test('redireziona a /distill se l\'id non esiste', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'TEST_USER_EMAIL e TEST_USER_PASSWORD non impostati');
      return;
    }

    // Sign in
    const signinResponse = await page.request.post('/api/auth/signin', {
      data: { email, password },
    });
    expect(signinResponse.ok()).toBeTruthy();

    // Navigate to a non-existent job ID
    await page.goto('/distill/id-che-non-esiste-mai');

    // Should be redirected to /distill
    await expect(page).toHaveURL(/\/distill$/);
  });
});

test.describe('US-009 — GET /api/distill/[id] con utente diverso', () => {
  test('risponde 404 se il job appartiene a un altro utente', async ({ page, request, browser }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'TEST_USER_EMAIL e TEST_USER_PASSWORD non impostati');
      return;
    }

    // Step 1: Sign in as main user and create a job
    const signinResponse = await page.request.post('/api/auth/signin', {
      data: { email, password },
    });
    expect(signinResponse.ok()).toBeTruthy();

    const createResponse = await page.request.post('/api/distill', {
      data: { topic: 'Test ownership check', tone: 'neutro' },
    });
    expect(createResponse.ok()).toBeTruthy();
    const { jobId } = await createResponse.json();

    // Step 2: Sign up and sign in as a second user
    const otherEmail = `test-other-${Date.now()}@example.com`;
    const otherPassword = 'TestPassword123!';

    const signupResponse = await request.post('/api/auth/signup', {
      data: { email: otherEmail, password: otherPassword, name: 'Other User' },
    });
    expect(signupResponse.ok()).toBeTruthy();

    // Use a fresh request context for the second user to avoid cookie conflict
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();

    const otherSignin = await otherPage.request.post('/api/auth/signin', {
      data: { email: otherEmail, password: otherPassword },
    });
    expect(otherSignin.ok()).toBeTruthy();

    // Step 3: Try to access the job as the other user — expect 404
    const getResponse = await otherPage.request.get(`/api/distill/${jobId}`);
    expect(getResponse.status()).toBe(404);

    await otherContext.close();
  });
});
