import { expect, test } from '@playwright/test';

const THOMAS_QUERY = 'What is Thomas working on?';
const MOBILE_INITIAL_PROMPT = 'How can AI help an engineering business?';

const THOMAS_PROFILE_PAYLOAD = {
  success: true,
  data: {
    answer:
      'Thomas is currently focused on practical AI projects, engineering delivery, and research themes tied to measurable operational outcomes.',
    queryType: 'thomas_profile',
    sources: [
      {
        title: 'Projects Overview',
        url: '/projects',
        relevance: 0.94
      },
      {
        title: 'Current Research',
        url: '/research',
        relevance: 0.9
      }
    ],
    suggestedActions: [],
    queryId: 'qry_home_rag_mock'
  }
} as const;

test.describe('Homepage LLM Thomas-profile mocked RAG flow', () => {
  test('desktop renders mocked Thomas-profile answer and internal source links after query submission', async ({
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

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(THOMAS_PROFILE_PAYLOAD)
      });
    });

    await page.goto('/');

    await expect(page.getByTestId('home-llm-shell')).toBeVisible();
    await expect(page.getByTestId('home-llm-prompt-row')).toBeVisible();

    await page.getByRole('textbox', { name: 'Ask Thomas AI' }).fill(THOMAS_QUERY);
    await page.getByTestId('home-llm-prompt-row').getByRole('button', { name: 'Ask' }).click();

    await expect.poll(() => observedRequests.length).toBe(1);
    expect(observedRequests[0]?.query).toBe(THOMAS_QUERY);

    await expect(page.getByText(THOMAS_PROFILE_PAYLOAD.data.answer)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Projects Overview' })).toHaveAttribute('href', '/projects');
    await expect(page.getByRole('link', { name: 'Current Research' })).toHaveAttribute('href', '/research');
  });

  test('mobile launcher path renders mocked Thomas-profile answer and source links inside mobile answer surface', async ({
    page,
    isMobile
  }) => {
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
        body: JSON.stringify(THOMAS_PROFILE_PAYLOAD)
      });
    });

    await page.goto('/');

    await expect(page.getByTestId('home-llm-mobile-launcher')).toBeVisible();

    await page.getByRole('button', { name: MOBILE_INITIAL_PROMPT }).click();
    await expect.poll(() => observedRequests.length).toBe(1);

    await page.getByRole('button', { name: THOMAS_QUERY }).click();
    await expect.poll(() => observedRequests.length).toBe(2);
    expect(observedRequests[1]?.query).toBe(THOMAS_QUERY);

    await expect(page.getByTestId('home-llm-answer-carousel')).toBeVisible();
    await expect(page.getByText(THOMAS_PROFILE_PAYLOAD.data.answer)).toBeVisible();

    const mobileAnswerSurface = page.getByTestId('home-llm-answer-carousel');
    await expect(mobileAnswerSurface.getByRole('link', { name: 'Projects Overview' })).toHaveAttribute('href', '/projects');
    await expect(mobileAnswerSurface.getByRole('link', { name: 'Current Research' })).toHaveAttribute('href', '/research');
  });
});
