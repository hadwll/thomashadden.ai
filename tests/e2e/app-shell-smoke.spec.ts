import { expect, test } from '@playwright/test';

test('home route boots with Sprint 2 hero composition', async ({ page }) => {
  const response = await page.goto('/');

  expect(response, 'home route should respond').not.toBeNull();
  expect(response?.ok(), 'home route should respond with OK').toBeTruthy();

  await expect(page.getByRole('heading', { level: 1, name: 'Thomas Hadden' })).toBeVisible();
  await expect(page.locator('main')).toBeVisible();
});

test('about route boots from direct navigation', async ({ page }) => {
  const response = await page.goto('/about');

  expect(response, '/about route should respond').not.toBeNull();
  expect(response?.ok(), '/about route should respond with OK').toBeTruthy();

  await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
});
