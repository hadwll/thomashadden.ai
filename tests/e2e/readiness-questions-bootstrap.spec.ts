import { expect, test } from '@playwright/test';

const EXPECTED_FIRST_QUESTION_TEXT = 'What best describes your business sector?';
const EXPECTED_FIRST_QUESTION_OPTION_LABELS = [
  'Engineering or Manufacturing',
  'Construction or Electrical',
  'Professional Services',
  'Retail or Hospitality',
  'Other'
];

test('readiness bootstrap renders question content on /readiness', async ({ page }) => {
  const response = await page.goto('/readiness');

  expect(response, '/readiness should respond').not.toBeNull();
  expect(response?.ok(), '/readiness should respond with OK').toBeTruthy();

  await expect(page.getByText('Placeholder route for SPR-01 bootstrap.')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: /readiness/i })).toBeVisible();
  await expect(page.getByText(EXPECTED_FIRST_QUESTION_TEXT)).toBeVisible();
  await expect(page.getByText(/7\s+questions/i)).toBeVisible();
  await expect(page.getByText(/2\s+minutes/i)).toBeVisible();

  for (const label of EXPECTED_FIRST_QUESTION_OPTION_LABELS) {
    await expect(page.getByText(label)).toBeVisible();
  }
});
