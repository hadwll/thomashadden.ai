import { expect, type Page, test } from '@playwright/test';

const QUESTION_SET = {
  success: true,
  data: {
    version: '1.0',
    totalQuestions: 7,
    estimatedMinutes: 2,
    questions: [
      {
        id: 'q1',
        order: 1,
        text: 'What best describes your business sector?',
        type: 'single_choice',
        options: [
          { id: 'q1-o1', label: 'Engineering or Manufacturing' },
          { id: 'q1-o2', label: 'Construction or Electrical' },
          { id: 'q1-o3', label: 'Professional Services' },
          { id: 'q1-o4', label: 'Retail or Hospitality' },
          { id: 'q1-o5', label: 'Other' }
        ]
      },
      {
        id: 'q2',
        order: 2,
        text: 'How many people work in your business?',
        type: 'single_choice',
        options: [{ id: 'q2-o1', label: 'Just me' }]
      },
      {
        id: 'q3',
        order: 3,
        text: "How would you describe your business's current relationship with AI?",
        type: 'single_choice',
        options: [{ id: 'q3-o1', label: "We haven't looked at it yet" }]
      },
      {
        id: 'q4',
        order: 4,
        text: 'Where does your business most feel the pressure to do things better or faster?',
        type: 'single_choice',
        options: [{ id: 'q4-o1', label: 'Reporting and data analysis' }]
      },
      {
        id: 'q5',
        order: 5,
        text: 'How well does your business currently capture and use data?',
        type: 'single_choice',
        options: [{ id: 'q5-o1', label: "We don't really track data systematically" }]
      },
      {
        id: 'q6',
        order: 6,
        text: 'If a low-risk AI pilot were available for your business, how likely would you be to try it?',
        type: 'single_choice',
        options: [{ id: 'q6-o1', label: 'Possibly if the case was clear' }]
      },
      {
        id: 'q7',
        order: 7,
        text: 'What feels like the biggest barrier to adopting AI in your business right now?',
        type: 'single_choice',
        options: [{ id: 'q7-o1', label: 'Cost and ROI uncertainty' }]
      }
    ]
  }
};

function json(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body)
  };
}

function createSessionCreateResponse(sessionToken: string) {
  return json({
    success: true,
    data: {
      sessionToken,
      status: 'in_progress',
      totalQuestions: 7
    }
  });
}

function createAnswerResponse(answeredCount: number, isComplete: boolean) {
  return json({
    success: true,
    data: {
      answeredCount,
      isComplete
    }
  });
}

async function installReadinessMocks(page: Page) {
  let answerCount = 0;

  await page.route('**/api/readiness-check/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.pathname.endsWith('/api/readiness-check/questions') && request.method() === 'GET') {
      await route.fulfill(json(QUESTION_SET));
      return;
    }

    if (url.pathname.endsWith('/api/readiness-check/session') && request.method() === 'POST') {
      const body = JSON.parse(request.postData() ?? '{}') as { sessionToken?: string };
      await route.fulfill(createSessionCreateResponse(body.sessionToken ?? '11111111-1111-4111-8111-111111111111'));
      return;
    }

    if (url.pathname.endsWith('/api/readiness-check/answer') && request.method() === 'POST') {
      answerCount += 1;
      await route.fulfill(createAnswerResponse(answerCount, answerCount === 7));
      return;
    }

    if (url.pathname.includes('/api/readiness-check/session/') && request.method() === 'GET') {
      await route.fulfill(
        json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Requested readiness session was not found.'
            }
          },
          404
        )
      );
      return;
    }

    throw new Error(`Unexpected request: ${request.method()} ${url.pathname}`);
  });
}

async function gotoReadiness(page: Page) {
  const response = await page.goto('/readiness');

  expect(response, '/readiness should respond').not.toBeNull();
  expect(response?.ok(), '/readiness should respond with OK').toBeTruthy();
}

async function expectVisibleProgress(page: Page, questionNumber: number) {
  const textLocator = page.getByText(new RegExp(`question ${questionNumber} of 7`, 'i'));
  if (await textLocator.count()) {
    await expect(textLocator).toBeVisible();
    return;
  }

  await expect(
    page.getByRole('progressbar', { name: new RegExp(`question ${questionNumber} of 7`, 'i') })
  ).toBeVisible();
}

async function resetBrowserStorage(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}

async function answerThroughCompletion(page: Page) {
  for (let index = 0; index < QUESTION_SET.data.questions.length; index += 1) {
    const question = QUESTION_SET.data.questions[index];
    const selectedOption = question.options[0];

    await expect(page.getByText(question.text)).toBeVisible();
    await page.getByRole('button', { name: selectedOption.label }).click();

    if (index < QUESTION_SET.data.questions.length - 1) {
      await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
      await page.getByRole('button', { name: /next/i }).click();
      continue;
    }

    await expect(page.getByText(/your results are ready/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /see my results/i })).toBeVisible();
  }
}

async function assertAuthGateVisible(page: Page) {
  await expect(page.getByText(/sign in to see your results/i)).toBeVisible();
  await expect(page.getByText(/assessment is ready/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with linkedin/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /continue with email/i })).toBeVisible();
}

test.describe('readiness auth gate', () => {
  test('desktop completed readiness journey reaches the auth gate and keeps email retry-safe', async ({
    page,
    isMobile
  }) => {
    test.skip(isMobile, 'desktop-only coverage');

    await installReadinessMocks(page);
    await resetBrowserStorage(page);
    await gotoReadiness(page);
    await answerThroughCompletion(page);

    await expect(page.getByRole('button', { name: /see my results/i })).toBeVisible();
    await page.getByRole('button', { name: /see my results/i }).click();

    await assertAuthGateVisible(page);
    await expect(page.getByText(/your score will appear after the auth step/i)).toHaveCount(0);

    await page.getByRole('button', { name: /continue with email/i }).click();
    await expect(page.getByRole('textbox', { name: /email address/i })).toBeVisible();

    await page.getByRole('textbox', { name: /email address/i }).fill('not-an-email');
    await page.getByRole('button', { name: /send sign-in link/i }).click();

    await expect(page.getByRole('alert')).toContainText(/enter a valid email/i);
    await expect(page.getByRole('button', { name: /continue with linkedin/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with email/i })).toBeVisible();
  });

  test('mobile completed readiness journey reaches the auth gate and exposes both sign-in paths', async ({
    page,
    isMobile
  }) => {
    test.skip(!isMobile, 'mobile-only coverage');

    await installReadinessMocks(page);
    await resetBrowserStorage(page);
    await gotoReadiness(page);
    await answerThroughCompletion(page);

    await expect(page.getByRole('button', { name: /see my results/i })).toBeVisible();
    await page.getByRole('button', { name: /see my results/i }).click();

    await assertAuthGateVisible(page);
    await expect(page.getByText(/your results are ready/i)).toHaveCount(0);
  });
});
