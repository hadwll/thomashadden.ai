import { expect, test, type Page } from '@playwright/test';

type ThemeMode = 'dark' | 'light';

async function ensureTheme(page: Page, mode: ThemeMode) {
  const html = page.locator('html');
  const isDark = await html.evaluate((element) => element.classList.contains('dark'));

  if ((mode === 'dark' && isDark) || (mode === 'light' && !isDark)) {
    return;
  }

  const toggleName = mode === 'dark' ? /switch to dark mode/i : /switch to light mode/i;
  const toggle = page.getByRole('button', { name: toggleName }).first();

  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect
    .poll(async () => html.evaluate((element) => element.classList.contains('dark')))
    .toBe(mode === 'dark');
}

async function assertAtmosphereState(
  page: Page,
  options: { mode: ThemeMode; mobile: boolean }
) {
  const atmosphere = page.getByTestId('background-atmosphere');
  const textureLayer = page.locator('[data-atmosphere-layer="texture"]');
  const baseLayer = page.locator('[data-atmosphere-layer="base"]');
  const heroSupportLayer = page.locator('[data-support-region="hero"]');

  await expect(atmosphere).toBeVisible();
  await expect(baseLayer).toBeVisible();
  await expect(textureLayer).toBeVisible();
  await expect(heroSupportLayer).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Contact' })).toBeVisible();

  const baseBackgroundImage = await baseLayer.evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(baseBackgroundImage).not.toBe('none');

  const textureBackgroundImage = await textureLayer.evaluate((element) => getComputedStyle(element).backgroundImage);
  if (options.mode === 'dark') {
    expect(textureBackgroundImage).toContain('circuit-texture-dark-bg.svg');
  } else {
    expect(textureBackgroundImage).toContain('circuit-texture-light-bg.svg');
  }

  const desktopOnlyGlow = page.locator('[data-glow-anchor="mid-band"]');
  if (options.mobile) {
    await expect(desktopOnlyGlow).toBeHidden();
  } else {
    await expect(desktopOnlyGlow).toBeVisible();
  }
}

test('desktop /contact renders dark atmosphere depth and texture wiring', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only scenario');

  await page.goto('/contact');
  await ensureTheme(page, 'dark');
  await assertAtmosphereState(page, { mode: 'dark', mobile: false });
});

test('desktop /contact renders light luminous atmosphere and texture wiring', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only scenario');

  await page.goto('/contact');
  await ensureTheme(page, 'light');
  await assertAtmosphereState(page, { mode: 'light', mobile: false });
});

test('mobile /contact renders simplified dark atmosphere', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only scenario');

  await page.goto('/contact');
  await ensureTheme(page, 'dark');
  await assertAtmosphereState(page, { mode: 'dark', mobile: true });
});

test('mobile /contact renders simplified light atmosphere', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only scenario');

  await page.goto('/contact');
  await ensureTheme(page, 'light');
  await assertAtmosphereState(page, { mode: 'light', mobile: true });
});
