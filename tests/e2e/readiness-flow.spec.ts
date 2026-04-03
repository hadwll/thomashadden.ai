import { expect, type Page, test } from '@playwright/test';

const FIRST_SESSION_TOKEN = '11111111-1111-4111-8111-111111111111';
const RECOVERY_SESSION_TOKEN = '22222222-2222-4222-8222-222222222222';
const RESTART_SESSION_TOKEN = '33333333-3333-4333-8333-333333333333';

const QUESTION_TEXTS = [
  'What best describes your business sector?',
  'How many people work in your business?',
  "How would you describe your business's current relationship with AI?",
  'Where does your business most feel the pressure to do things better or faster?',
  'How well does your business currently capture and use data?',
  'If a low-risk AI pilot were available for your business, how likely would you be to try it?',
  'What feels like the biggest barrier to adopting AI in your business right now?'
];

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
        text: QUESTION_TEXTS[0],
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
        text: QUESTION_TEXTS[1],
        type: 'single_choice',
        options: [{ id: 'q2-o1', label: 'Just me' }]
      },
      {
        id: 'q3',
        order: 3,
        text: QUESTION_TEXTS[2],
        type: 'single_choice',
        options: [{ id: 'q3-o1', label: "We haven't looked at it yet" }]
      },
      {
        id: 'q4',
        order: 4,
        text: QUESTION_TEXTS[3],
        type: 'single_choice',
        options: [{ id: 'q4-o1', label: 'Reporting and data analysis' }]
      },
      {
        id: 'q5',
        order: 5,
        text: QUESTION_TEXTS[4],
        type: 'single_choice',
        options: [{ id: 'q5-o1', label: "We don't really track data systematically" }]
      },
      {
        id: 'q6',
        order: 6,
        text: QUESTION_TEXTS[5],
        type: 'single_choice',
        options: [{ id: 'q6-o1', label: 'Possibly if the case was clear' }]
      },
      {
        id: 'q7',
        order: 7,
        text: QUESTION_TEXTS[6],
        type: 'single_choice',
        options: [{ id: 'q7-o1', label: 'Cost and ROI uncertainty' }]
      }
    ]
  }
};

type SessionStateFixture = {
  sessionToken: string;
  status: 'in_progress' | 'abandoned' | 'completed';
  answeredQuestions: number[];
  nextQuestionIndex: number;
  totalQuestions: 7;
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

function createSessionStateResponse(session: SessionStateFixture) {
  return json({
    success: true,
    data: session
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

async function installReadinessMocks(page: Page, options?: { recoverySession?: SessionStateFixture }) {
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
      await route.fulfill(createSessionCreateResponse(body.sessionToken ?? FIRST_SESSION_TOKEN));
      return;
    }

    if (url.pathname.includes('/api/readiness-check/session/') && request.method() === 'GET') {
      const token = url.pathname.split('/').pop() ?? '';
      if (options?.recoverySession && options.recoverySession.sessionToken === token) {
        await route.fulfill(createSessionStateResponse(options.recoverySession));
        return;
      }

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

    if (url.pathname.endsWith('/api/readiness-check/answer') && request.method() === 'POST') {
      answerCount += 1;
      await route.fulfill(
        createAnswerResponse(answerCount, answerCount === 7)
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

test('readiness flow advances one question at a time with visible progress and a terminal completion state', async ({ page }) => {
  await installReadinessMocks(page);

  await gotoReadiness(page);

  await expect(page.getByText(QUESTION_TEXTS[0])).toBeVisible();
  await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
  await expectVisibleProgress(page, 1);
  await expect(page.getByRole('button', { name: 'Engineering or Manufacturing' })).toBeVisible();

  await page.getByRole('button', { name: 'Engineering or Manufacturing' }).click();
  await expect(page.getByText(QUESTION_TEXTS[0])).toBeVisible();
  await expect(page.getByText(QUESTION_TEXTS[1])).toHaveCount(0);
  await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();

  await page.getByRole('button', { name: /next/i }).click();
  await expect(page.getByText(QUESTION_TEXTS[0])).toHaveCount(0);
  await expect(page.getByText(QUESTION_TEXTS[1])).toBeVisible();
  await expectVisibleProgress(page, 2);
});

test('readiness recovery prompt can restart to a fresh first question state', async ({ page }) => {
  await installReadinessMocks(page, {
    recoverySession: {
      sessionToken: RECOVERY_SESSION_TOKEN,
      status: 'abandoned',
      answeredQuestions: [0, 1, 2],
      nextQuestionIndex: 3,
      totalQuestions: 7
    }
  });

  await page.addInitScript(
    ({ token }) => {
      localStorage.setItem('readiness_session_token', token);
      localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');
    },
    { token: RECOVERY_SESSION_TOKEN }
  );

  await gotoReadiness(page);

  await expect(page.getByText(/continue where you left off\?/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /start again/i })).toBeVisible();

  await page.getByRole('button', { name: /start again/i }).click();

  await expect(page.getByText(QUESTION_TEXTS[0])).toBeVisible();
  await expectVisibleProgress(page, 1);
  await expect(page.evaluate(() => localStorage.getItem('readiness_session_token'))).resolves.toBe(
    RESTART_SESSION_TOKEN
  );
});

test('readiness completion reaches the pre-auth results-ready state after seven answers', async ({ page }) => {
  await installReadinessMocks(page, {
    recoverySession: {
      sessionToken: RECOVERY_SESSION_TOKEN,
      status: 'completed',
      answeredQuestions: [0, 1, 2, 3, 4, 5, 6],
      nextQuestionIndex: 7,
      totalQuestions: 7
    }
  });

  await page.addInitScript(
    ({ token }) => {
      localStorage.setItem('readiness_session_token', token);
      localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');
    },
    { token: RECOVERY_SESSION_TOKEN }
  );

  await gotoReadiness(page);

  await expect(page.getByText(/your results are ready/i)).toBeVisible();
  await expect(page.getByText(QUESTION_TEXTS[6])).toHaveCount(0);
  await expect(page.getByRole('button', { name: /see my results/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /linkedin/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /email/i })).toHaveCount(0);
});
