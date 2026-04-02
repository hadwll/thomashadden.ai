import { expect, test } from '@playwright/test';

test('desktop shell chrome is present on an inner route', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop-only smoke');

  const response = await page.goto('/contact');
  expect(response, '/contact should respond').not.toBeNull();
  expect(response?.ok(), '/contact should respond with OK').toBeTruthy();

  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Contact' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('mobile shell chrome is present on an inner route', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only smoke');

  const response = await page.goto('/contact');
  expect(response, '/contact should respond').not.toBeNull();
  expect(response?.ok(), '/contact should respond with OK').toBeTruthy();

  await expect(page.getByRole('banner')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Contact' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
});
