import { expect, test, type Page } from '@playwright/test';

async function gotoWithTheme(page: Page, path: string, theme: 'light' | 'dark') {
  await page.goto(path);
  await page.evaluate((selectedTheme: 'light' | 'dark') => {
    window.localStorage.setItem('theme', selectedTheme);
    document.documentElement.classList.toggle('dark', selectedTheme === 'dark');
  }, theme);

  await expect
    .poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark')))
    .toBe(theme === 'dark');
}

test('desktop / in dark theme keeps Home active and indicator visible', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only nav interaction check');

  await gotoWithTheme(page, '/', 'dark');

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const homeLink = nav.getByRole('link', { name: 'Home' });
  const indicator = nav.getByTestId('desktop-nav-indicator');

  await expect(nav).toBeVisible();
  await expect(homeLink).toHaveAttribute('aria-current', 'page');
  await expect(indicator).toHaveAttribute('data-target-href', '/');
  await expect(indicator).toHaveAttribute('data-visible', 'true');
});

test('desktop /about in dark theme keeps About active without Home highlight', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only nav interaction check');

  await gotoWithTheme(page, '/about', 'dark');

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const homeLink = nav.getByRole('link', { name: 'Home' });
  const aboutLink = nav.getByRole('link', { name: 'About' });
  const indicator = nav.getByTestId('desktop-nav-indicator');

  await expect(aboutLink).toHaveAttribute('aria-current', 'page');
  await expect(homeLink).not.toHaveAttribute('aria-current', 'page');
  await expect(indicator).toHaveAttribute('data-target-href', '/about');
});

test('desktop / in light theme renders active indicator', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only nav interaction check');

  await gotoWithTheme(page, '/', 'light');

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const indicator = nav.getByTestId('desktop-nav-indicator');

  await expect(indicator).toHaveAttribute('data-target-href', '/');
  await expect(indicator).toHaveAttribute('data-visible', 'true');
});

test('desktop hover moves indicator to hovered link then returns to active route on hover out', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only nav interaction check');

  await gotoWithTheme(page, '/', 'dark');

  const nav = page.getByRole('navigation', { name: 'Main navigation' });
  const projectsLink = nav.getByRole('link', { name: 'Projects' });
  const indicator = nav.getByTestId('desktop-nav-indicator');

  await expect(indicator).toHaveAttribute('data-target-href', '/');

  await projectsLink.hover();

  await expect(projectsLink).toHaveAttribute('data-hovered', 'true');
  await expect(indicator).toHaveAttribute('data-target-href', '/projects');

  await nav.getByRole('button', { name: 'Ask Thomas AI' }).hover();

  await expect(projectsLink).toHaveAttribute('data-hovered', 'false');
  await expect(indicator).toHaveAttribute('data-target-href', '/');
});
