import { expect, test } from '@playwright/test';

test('home route boots and shows placeholder heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await expect(page.getByText('Placeholder route for SPR-01 bootstrap.')).toBeVisible();
});

test('secondary route boots from direct navigation', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1, name: 'About' })).toBeVisible();
});
