import { expect, test } from '@playwright/test';

const DESKTOP_CHIP_PROMPT = 'Where does AI fit into industry?';
const MOBILE_FIRST_PROMPT = 'How can AI help an engineering business?';
const MOBILE_SECOND_PROMPT = 'What is Thomas working on?';

const DESKTOP_STREAM_BODY =
  'data: {"chunk":"Mocked stream response","queryId":"qry_sprint3_stream_1"}\n\n' +
  'data: {"chunk":" for desktop chip flow.","queryId":"qry_sprint3_stream_1"}\n\n' +
  'data: {"done":true,"queryType":"general_ai","sources":[{"title":"AI Delivery Blueprint","url":"/projects","relevance":0.93}],"suggestedActions":[{"type":"readiness_check","label":"Take the AI Readiness Check","url":"/readiness"}],"queryId":"qry_sprint3_stream_1"}\n\n';

test.describe('SPR-03 homepage LLM closure (mocked)', () => {
  test('desktop homepage vessel supports chip submission and renders streamed answer metadata', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop-only closure coverage');

    const observedRequests: Array<Record<string, unknown>> = [];

    await page.route('**/api/dev/rag/ingest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            filesProcessed: 3,
            chunksCreated: 12,
            durationMs: 90,
            embeddingModel: 'text-embedding-3-large',
            status: 'success',
            errors: []
          }
        })
      });
    });

    await page.route('**/api/llm/query', async (route) => {
      const request = route.request();

      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      observedRequests.push((request.postDataJSON() as Record<string, unknown>) ?? {});

      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream'
        },
        body: DESKTOP_STREAM_BODY
      });
    });

    await page.goto('/');

    await expect(page.getByTestId('home-llm-shell')).toBeVisible();
    await expect(page.getByTestId('home-llm-prompt-row')).toBeVisible();

    await page.getByRole('button', { name: DESKTOP_CHIP_PROMPT }).click();

    await expect.poll(() => observedRequests.length).toBe(1);
    expect(observedRequests[0]?.context).toEqual({ source: 'homepage_chip' });
    expect(observedRequests[0]?.stream).toBe(true);

    await expect(page.getByText('Mocked stream response for desktop chip flow.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'AI Delivery Blueprint' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Take the AI Readiness Check' })).toHaveAttribute('href', '/readiness');
  });

  test('desktop typed submission shows safe error state and remains usable after retry', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop-only closure coverage');

    const observedRequests: Array<Record<string, unknown>> = [];
    let callCount = 0;

    await page.route('**/api/llm/query', async (route) => {
      const request = route.request();

      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      callCount += 1;
      observedRequests.push((request.postDataJSON() as Record<string, unknown>) ?? {});

      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'LLM_ERROR',
              message: "I'm having a moment - please try again in a few seconds."
            }
          })
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            answer: 'Retry succeeded with a stable desktop response.',
            queryType: 'general_ai',
            sources: [
              {
                title: 'Research Overview',
                url: '/research',
                relevance: 0.9
              }
            ],
            suggestedActions: [
              {
                type: 'readiness_check',
                label: 'Take the AI Readiness Check',
                url: '/readiness'
              }
            ],
            queryId: 'qry_desktop_retry_success'
          }
        })
      });
    });

    await page.goto('/');

    const promptRow = page.getByTestId('home-llm-prompt-row');
    const textbox = promptRow.getByRole('textbox', { name: 'Ask Thomas AI' });

    await textbox.fill('First typed request should fail safely');
    await promptRow.getByRole('button', { name: 'Ask' }).click();

    await expect.poll(() => observedRequests.length).toBe(1);
    expect(observedRequests[0]?.context).toEqual({ source: 'homepage_input' });

    await expect(page.getByText("I'm having a moment - please try again in a few seconds.")).toBeVisible();

    await textbox.fill('Second typed request should recover');
    await promptRow.getByRole('button', { name: 'Ask' }).click();

    await expect.poll(() => observedRequests.length).toBe(2);
    await expect(page.getByText('Retry succeeded with a stable desktop response.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Research Overview' })).toBeVisible();
  });

  test('mobile homepage uses launcher flow with answer card, source pills, dots, and coherent follow-up', async ({
    page,
    isMobile
  }) => {
    test.skip(!isMobile, 'mobile-only closure coverage');

    let requestCount = 0;

    await page.route('**/api/llm/query', async (route) => {
      const request = route.request();

      if (request.method() !== 'POST') {
        await route.continue();
        return;
      }

      requestCount += 1;

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            answer: requestCount === 1 ? 'Mobile answer card one.' : 'Mobile answer card two.',
            queryType: 'general_ai',
            sources: [
              {
                title: requestCount === 1 ? 'About Thomas' : 'Projects',
                url: requestCount === 1 ? '/about' : '/projects',
                relevance: 0.94
              }
            ],
            suggestedActions: [
              {
                type: 'readiness_check',
                label: 'Take the AI Readiness Check',
                url: '/readiness'
              }
            ],
            queryId: `qry_mobile_${requestCount}`
          }
        })
      });
    });

    await page.goto('/');

    await expect(page.getByTestId('home-llm-mobile-launcher')).toBeVisible();
    await expect(page.getByTestId('home-llm-prompt-row')).toHaveCount(0);
    await expect(page.getByTestId('home-llm-chip-rail')).toHaveCount(0);

    await page.getByRole('button', { name: MOBILE_FIRST_PROMPT }).click();

    await expect(page.getByTestId('home-llm-answer-carousel')).toBeVisible();
    await expect(page.getByTestId('home-llm-carousel-dots')).toBeVisible();
    await expect(page.getByText('Mobile answer card one.')).toBeVisible();
    await expect(page.getByTestId('home-llm-sources').getByRole('link', { name: 'About Thomas' })).toBeVisible();

    await page.getByRole('button', { name: MOBILE_SECOND_PROMPT }).click();

    await expect(page.getByText('Mobile answer card two.')).toBeVisible();
    await expect(page.getByTestId('home-llm-sources').getByRole('link', { name: 'Projects' })).toBeVisible();
    await expect(page.getByTestId('home-llm-mobile-launcher')).toBeVisible();

    const dots = page.getByTestId('home-llm-carousel-dots').getByRole('button');
    await expect(dots).toHaveCount(2);
    await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');
  });
});
