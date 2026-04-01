import { expect, test } from '@playwright/test';

const DESKTOP_NAV_ITEMS = ['Home', 'About', 'Projects', 'Research', 'Insights', 'Contact'] as const;
const MOBILE_NAV_ITEMS = ['Home', 'Projects', 'Research', 'Insights', 'Contact'] as const;
const FOOTER_LINKS = ['About', 'Privacy', 'Cookies', 'Contact'] as const;

test('desktop home shell boots and supports shallow nav routing', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only smoke');

  const response = await page.goto('/');
  expect(response, 'home route should respond').not.toBeNull();
  expect(response?.ok(), 'home route should not hard-fail').toBeTruthy();

  const desktopNav = page.getByRole('navigation', { name: 'Main navigation' });

  await expect(desktopNav).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();

  for (const linkName of DESKTOP_NAV_ITEMS) {
    await expect(desktopNav.getByRole('link', { name: linkName })).toBeVisible();
  }

  await expect(desktopNav.getByRole('button', { name: 'Ask Thomas AI' })).toBeVisible();
  await expect(
    desktopNav.getByRole('button', {
      name: /switch to (light|dark) mode/i
    })
  ).toHaveCount(0);

  await Promise.all([
    page.waitForURL('**/about'),
    desktopNav.getByRole('link', { name: 'About' }).click()
  ]);

  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(page.locator('main')).toBeVisible();

  await Promise.all([
    page.waitForURL('**/projects'),
    page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Projects' }).click()
  ]);

  await expect(page).toHaveURL(/\/projects$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(page.locator('main')).toBeVisible();

  const footer = page.getByRole('contentinfo');
  await expect(footer).toBeVisible();

  for (const footerLink of FOOTER_LINKS) {
    await expect(footer.getByRole('link', { name: footerLink })).toBeVisible();
  }

  await expect(
    footer.getByRole('button', {
      name: /switch to (light|dark) mode/i
    })
  ).toBeVisible();
});

test('mobile home shell boots and exposes mobile chrome', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only smoke');

  const response = await page.goto('/');
  expect(response, 'home route should respond').not.toBeNull();
  expect(response?.ok(), 'home route should not hard-fail').toBeTruthy();

  const mobileHeader = page.getByRole('banner');

  await expect(mobileHeader).toBeVisible();
  await expect(mobileHeader.getByRole('link', { name: 'Thomas Hadden' })).toBeVisible();
  await expect(mobileHeader.getByRole('button', { name: 'Ask the AI assistant' })).toBeVisible();
  await expect(
    mobileHeader.getByRole('button', {
      name: /switch to (light|dark) mode/i
    })
  ).toBeVisible();

  const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });

  await expect(mobileNav).toBeVisible();
  await expect(mobileNav.getByRole('link')).toHaveCount(MOBILE_NAV_ITEMS.length);

  for (const itemName of MOBILE_NAV_ITEMS) {
    await expect(mobileNav.getByRole('link', { name: itemName })).toBeVisible();
  }

  await page.goto('/about');

  const footer = page.getByRole('contentinfo');
  await expect(footer).toBeVisible();

  for (const footerLink of FOOTER_LINKS) {
    await expect(footer.getByRole('link', { name: footerLink })).toBeVisible();
  }
});
