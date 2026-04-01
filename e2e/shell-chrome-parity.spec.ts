import { expect, test, type Page } from '@playwright/test';

const MOBILE_NAV_ITEMS = ['Home', 'Projects', 'Research', 'Insights', 'Contact'] as const;

async function gotoContactWithTheme(page: Page, theme: 'light' | 'dark') {
  await page.goto('/contact');
  await expect(page.getByRole('heading', { level: 1, name: 'Contact' })).toBeVisible();

  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));

  if (theme === 'light' && isDark) {
    await page.getByRole('button', { name: /switch to light mode/i }).first().click();
  }

  if (theme === 'dark' && !isDark) {
    await page.getByRole('button', { name: /switch to dark mode/i }).first().click();
  }

  await expect
    .poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(theme === 'dark');
}

test('desktop /contact chrome parity in light theme', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only parity check');

  await gotoContactWithTheme(page, 'light');

  const desktopNav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(desktopNav).toBeVisible();
  await expect(desktopNav.locator('[data-brand-mark="true"]')).toBeVisible();
  await expect(desktopNav.getByRole('button', { name: 'Ask Thomas AI' })).toBeVisible();
});

test('desktop /contact chrome parity in dark theme', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only parity check');

  await gotoContactWithTheme(page, 'dark');

  const desktopNav = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(desktopNav).toBeVisible();
  await expect(desktopNav.locator('[data-brand-mark="true"]')).toBeVisible();
  await expect(desktopNav.getByRole('button', { name: 'Ask Thomas AI' })).toBeVisible();
});

test('mobile /contact chrome parity in light theme', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only parity check');

  await gotoContactWithTheme(page, 'light');

  const header = page.getByRole('banner');
  await expect(header).toBeVisible();
  await expect(header.locator('[data-brand-mark="true"]')).toBeVisible();

  const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(mobileNav).toBeVisible();
  await expect(mobileNav.getByRole('link')).toHaveCount(MOBILE_NAV_ITEMS.length);

  for (const itemName of MOBILE_NAV_ITEMS) {
    const item = mobileNav.getByRole('link', { name: itemName });
    await expect(item).toBeVisible();
    await expect(item.locator('[data-testid="mobile-nav-icon"]')).toBeVisible();
  }
});

test('mobile /contact chrome parity in dark theme', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only parity check');

  await gotoContactWithTheme(page, 'dark');

  const header = page.getByRole('banner');
  await expect(header).toBeVisible();
  await expect(header.locator('[data-brand-mark="true"]')).toBeVisible();

  const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
  await expect(mobileNav).toBeVisible();
  await expect(mobileNav.getByRole('link')).toHaveCount(MOBILE_NAV_ITEMS.length);

  for (const itemName of MOBILE_NAV_ITEMS) {
    const item = mobileNav.getByRole('link', { name: itemName });
    await expect(item).toBeVisible();
    await expect(item.locator('[data-testid="mobile-nav-icon"]')).toBeVisible();
  }
});
