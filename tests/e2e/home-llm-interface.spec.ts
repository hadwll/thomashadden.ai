import { expect, test } from '@playwright/test';

const DESKTOP_CHIP = 'What is RAG?';
const MOBILE_LAUNCHER_PROMPT = 'How can AI help an engineering business?';

const NON_STREAM_PAYLOAD = {
  success: true,
  data: {
    answer: 'Mocked homepage answer: AI readiness starts with workflow mapping and controlled rollout.',
    queryType: 'general_ai',
    sources: [
      {
        title: 'AI Delivery Blueprint',
        url: '/insights/ai-delivery-blueprint',
        relevance: 0.91
      }
    ],
    suggestedActions: [
      {
        type: 'readiness_check',
        label: 'Take the AI Readiness Check',
        url: '/readiness'
      }
    ],
    queryId: 'qry_home_mock_non_stream'
  }
} as const;

const STREAM_BODY =
  'data: {"chunk":"Mocked stream answer","queryId":"qry_home_mock_stream"}\n\n' +
  'data: {"chunk":": AI readiness starts with workflow mapping and controlled rollout.","queryId":"qry_home_mock_stream"}\n\n' +
  'data: {"done":true,"queryType":"general_ai","sources":[{"title":"AI Delivery Blueprint","url":"/insights/ai-delivery-blueprint","relevance":0.91}],"suggestedActions":[{"type":"readiness_check","label":"Take the AI Readiness Check","url":"/readiness"}],"queryId":"qry_home_mock_stream"}\n\n';

test.describe('Homepage LLM interface', () => {
  test('desktop renders homepage LLM shell and submits from chip interaction with mocked answer metadata', async ({
    page,
    isMobile
  }) => {
    test.skip(isMobile, 'desktop-only coverage');

    const observedRequests: Array<Record<string, unknown>> = [];

    await page.route('**/api/llm/query', async (route) => {
      const request = route.request();

      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      observedRequests.push((request.postDataJSON() as Record<string, unknown>) ?? {});
      const requestBody = request.postDataJSON() as { stream?: boolean } | null;

      if (requestBody?.stream) {
        await route.fulfill({
          status: 200,
          headers: {
            'content-type': 'text/event-stream'
          },
          body: STREAM_BODY
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(NON_STREAM_PAYLOAD)
      });
    });

    await page.goto('/');

    await expect(page.getByTestId('home-llm-shell')).toBeVisible();
    await expect(page.getByTestId('home-llm-prompt-row')).toBeVisible();

    await page.getByRole('button', { name: DESKTOP_CHIP }).click();

    await expect.poll(() => observedRequests.length).toBe(1);

    await expect(page.getByText(NON_STREAM_PAYLOAD.data.answer)).toBeVisible();
    await expect(page.getByRole('link', { name: 'AI Delivery Blueprint' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Take the AI Readiness Check' })).toHaveAttribute('href', '/readiness');
  });

  test('mobile renders launcher-style entry and answer carousel with dots using mocked response', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only coverage');

    const observedRequests: Array<Record<string, unknown>> = [];

    await page.route('**/api/llm/query', async (route) => {
      const request = route.request();

      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      observedRequests.push((request.postDataJSON() as Record<string, unknown>) ?? {});

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(NON_STREAM_PAYLOAD)
      });
    });

    await page.goto('/');

    await expect(page.getByTestId('home-llm-mobile-launcher')).toBeVisible();
    await expect(page.getByTestId('home-llm-prompt-row')).toHaveCount(0);
    await expect(page.getByTestId('home-llm-chip-rail')).toHaveCount(0);

    await page.getByRole('button', { name: MOBILE_LAUNCHER_PROMPT }).click();

    await expect.poll(() => observedRequests.length).toBe(1);

    await expect(page.getByText(NON_STREAM_PAYLOAD.data.answer)).toBeVisible();
    await expect(page.getByTestId('home-llm-answer-carousel')).toBeVisible();
    await expect(page.getByTestId('home-llm-carousel-dots')).toBeVisible();
  });
});
