import { expect, type Page, test } from '@playwright/test';

const READINESS_RESULT_CTA_LABEL = 'Start with a conversation — get in touch';
const READINESS_CONTACT_URL = '/contact?source=readiness_check&result=early_stage';
const AUTH_NAME = 'Jane Reviewer';
const AUTH_EMAIL = 'jane@example.com';

function readinessResultHtml() {
  return `<!doctype html>
    <html lang="en">
      <body>
        <main>
          <a href="${READINESS_CONTACT_URL}">${READINESS_RESULT_CTA_LABEL}</a>
        </main>
      </body>
    </html>`;
}

async function mockReadinessResultScreen(page: Page) {
  await page.route('**/readiness/result**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: readinessResultHtml()
    });
  });
}

async function mockSupabaseUser(page: Page, authenticated: boolean) {
  await page.route('**/auth/v1/user**', async (route) => {
    if (!authenticated) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Auth session missing'
        })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user_123',
        email: AUTH_EMAIL,
        user_metadata: {
          name: AUTH_NAME
        }
      })
    });
  });
}

async function goThroughMockedReadinessCta(page: Page) {
  const response = await page.goto('/readiness/result');

  expect(response, '/readiness/result should respond').not.toBeNull();
  expect(response?.ok(), '/readiness/result should respond with OK').toBeTruthy();

  const cta = page.getByRole('link', { name: READINESS_RESULT_CTA_LABEL });
  await expect(cta).toHaveAttribute('href', READINESS_CONTACT_URL);

  await Promise.all([
    page.waitForURL((url) => url.pathname === '/contact' && url.search === '?source=readiness_check&result=early_stage'),
    cta.click()
  ]);

  await expect(page).toHaveURL(/\/contact\?source=readiness_check&result=early_stage$/);
  const url = new URL(page.url());

  expect(url.searchParams.get('source')).toBe('readiness_check');
  expect(url.searchParams.get('result')).toBe('early_stage');
  expect(url.searchParams.has('name')).toBe(false);
  expect(url.searchParams.has('email')).toBe(false);
}

test.describe('readiness to contact bridge', () => {
  test('desktop CTA lands on contact with readiness context and auth-backed prefill', async ({
    page,
    isMobile
  }) => {
    test.skip(isMobile, 'desktop-only coverage');

    await mockReadinessResultScreen(page);
    await mockSupabaseUser(page, true);

    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await goThroughMockedReadinessCta(page);

    await expect(page.getByRole('heading', { level: 1, name: 'Contact' })).toBeVisible();
    await expect(page.getByTestId('contact-form-shell')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue(AUTH_NAME);
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue(AUTH_EMAIL);
    await expect(page.getByLabel('Subject')).toHaveValue('AI Readiness follow-up');
    await expect(page.getByLabel('Enquiry type')).toHaveValue('business_enquiry');
  });

  test('mobile CTA lands on contact with readiness context and leaves identity blank without auth', async ({
    page,
    isMobile
  }) => {
    test.skip(!isMobile, 'mobile-only coverage');

    await mockReadinessResultScreen(page);
    await mockSupabaseUser(page, false);

    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await goThroughMockedReadinessCta(page);

    await expect(page.getByRole('heading', { level: 1, name: 'Contact' })).toBeVisible();
    await expect(page.getByTestId('contact-form-shell')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('');
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue('');
    await expect(page.getByLabel('Subject')).toHaveValue('AI Readiness follow-up');
    await expect(page.getByLabel('Enquiry type')).toHaveValue('business_enquiry');
  });
});
