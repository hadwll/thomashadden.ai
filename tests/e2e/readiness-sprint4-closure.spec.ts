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

const RESUMABLE_SESSION_TOKEN = '88888888-8888-4888-8888-888888888888';
const ABANDONED_SESSION_TOKEN = '99999999-9999-4999-8999-999999999999';
const RESULT_SESSION_TOKEN = '55555555-5555-4555-8555-555555555555';
const AUTH_NAME = 'Jane Reviewer';
const AUTH_EMAIL = 'jane@example.com';

function json(body: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(body)
  };
}

function createResultResponse() {
  return json({
    success: true,
    data: {
      resultId: `result_${RESULT_SESSION_TOKEN}`,
      category: 'early_stage',
      categoryLabel: 'Early-Stage',
      score: 18,
      summary:
        "Your business is at the beginning of the AI journey - and that's completely normal. The good news is that starting with a clear picture of where you are is exactly the right first move.",
      nextStep:
        'A short conversation about your business and the areas where you are feeling the most pressure is the best place to start.',
      cta: {
        label: 'Start with a conversation — get in touch',
        url: '/contact?source=readiness_check&result=early_stage'
      }
    }
  });
}

function createLinkSuccessResponse() {
  return json({
    success: true,
    data: {
      linked: true
    }
  });
}

async function seedBrowserState(page: Page, pathname: string, sessionToken?: string) {
  await page.addInitScript(
    ({ nextPathname, token }) => {
      localStorage.clear();
      sessionStorage.clear();

      if (token) {
        localStorage.setItem('readiness_session_token', token);
        localStorage.setItem('readiness_session_started', '2026-04-03T11:30:00.000Z');
      }

      window.history.replaceState({}, '', nextPathname);
    },
    { nextPathname: pathname, token: sessionToken }
  );
}

async function installSprint4Mocks(
  page: Page,
  options: {
    linkStatus?: number;
    resultStatus?: number;
    sessionStatus?: 'in_progress' | 'abandoned' | 'completed';
    missingSession?: boolean;
    authenticatedContact?: boolean;
  } = {}
) {
  const requestLog: Array<{ method: string; pathname: string; body?: Record<string, unknown> }> = [];
  const answerCountByToken = new Map<string, number>();

  await page.route('**/api/readiness-check/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname.endsWith('/api/readiness-check/questions') && method === 'GET') {
      requestLog.push({ method, pathname: url.pathname });
      await route.fulfill(json(QUESTION_SET));
      return;
    }

    if (url.pathname.endsWith('/api/readiness-check/session') && method === 'POST') {
      const body = JSON.parse(request.postData() ?? '{}') as { sessionToken?: string };
      requestLog.push({ method, pathname: url.pathname, body });
      answerCountByToken.set(body.sessionToken ?? RESUMABLE_SESSION_TOKEN, 0);

      await route.fulfill(
        json({
          success: true,
          data: {
            sessionToken: body.sessionToken ?? RESUMABLE_SESSION_TOKEN,
            status: 'in_progress',
            totalQuestions: 7
          }
        })
      );
      return;
    }

    if (url.pathname.includes('/api/readiness-check/session/') && method === 'GET') {
      const token = url.pathname.split('/').pop() ?? RESUMABLE_SESSION_TOKEN;
      requestLog.push({ method, pathname: url.pathname });

      if (options.missingSession || token === '00000000-0000-4000-8000-000000000000') {
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

      const sessionStatus = options.sessionStatus ?? 'in_progress';
      const sessionPayload =
        token === ABANDONED_SESSION_TOKEN || sessionStatus === 'abandoned'
          ? {
              sessionToken: token,
              status: 'abandoned' as const,
              answeredQuestions: [0, 1, 2],
              nextQuestionIndex: 3,
              totalQuestions: 7
            }
          : token === RESULT_SESSION_TOKEN || sessionStatus === 'completed'
            ? {
                sessionToken: token,
                status: 'completed' as const,
                answeredQuestions: [0, 1, 2, 3, 4, 5, 6],
                nextQuestionIndex: 7,
                totalQuestions: 7
              }
            : {
                sessionToken: token,
                status: 'in_progress' as const,
                answeredQuestions: [0, 1, 2],
                nextQuestionIndex: 3,
                totalQuestions: 7
              };

      answerCountByToken.set(token, sessionPayload.answeredQuestions.length);

      await route.fulfill(
        json({
          success: true,
          data: sessionPayload
        })
      );
      return;
    }

    if (url.pathname.endsWith('/api/readiness-check/answer') && method === 'POST') {
      const body = JSON.parse(request.postData() ?? '{}') as {
        sessionToken?: string;
        questionId?: string;
        optionId?: string;
      };
      requestLog.push({ method, pathname: url.pathname, body });

      const nextAnsweredCount = (answerCountByToken.get(body.sessionToken ?? '') ?? 0) + 1;
      answerCountByToken.set(body.sessionToken ?? '', nextAnsweredCount);

      await route.fulfill(
        json({
          success: true,
          data: {
            answeredCount: nextAnsweredCount,
            isComplete: nextAnsweredCount >= 7
          }
        })
      );
      return;
    }

    if (url.pathname.endsWith('/api/readiness-check/link-session') && method === 'POST') {
      const body = JSON.parse(request.postData() ?? '{}') as { sessionToken?: string };
      requestLog.push({ method, pathname: url.pathname, body });

      if ((options.linkStatus ?? 200) !== 200) {
        await route.fulfill(
          json(
            {
              success: false,
              error: {
                code: options.linkStatus === 403 ? 'FORBIDDEN' : 'NOT_FOUND',
                message:
                  options.linkStatus === 403
                    ? 'This assessment is linked to a different account.'
                    : 'Requested readiness session was not found.'
              }
            },
            options.linkStatus ?? 404
          )
        );
        return;
      }

      await route.fulfill(createLinkSuccessResponse());
      return;
    }

    if (url.pathname.includes('/api/readiness-check/result/') && method === 'GET') {
      requestLog.push({ method, pathname: url.pathname });

      if ((options.resultStatus ?? 200) !== 200) {
        await route.fulfill(
          json(
            {
              success: false,
              error: {
                code: 'INTERNAL_ERROR',
                message: 'Requested readiness result failed.'
              }
            },
            options.resultStatus ?? 500
          )
        );
        return;
      }

      await route.fulfill(createResultResponse());
      return;
    }

    throw new Error(`Unexpected request: ${method} ${url.pathname}`);
  });

  await page.route('**/auth/callback**', async (route) => {
    requestLog.push({ method: route.request().method(), pathname: '/auth/callback' });
    await route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: `<!doctype html>
        <html lang="en">
          <body>
            <script>
              window.location.replace('/readiness/result');
            </script>
          </body>
        </html>`
    });
  });

  await page.route('**/auth/v1/user**', async (route) => {
    if (!options.authenticatedContact) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Auth session missing'
        })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user_123',
        email: AUTH_EMAIL,
        user_metadata: {
          name: AUTH_NAME
        }
      })
    });
  });

  return requestLog;
}

async function answerRemainingQuestions(page: Page, startingIndex: number) {
  for (let index = startingIndex; index < QUESTION_SET.data.questions.length; index += 1) {
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
  }
}

async function expectContactHandoff(page: Page) {
  await expect(page).toHaveURL(/\/contact\?source=readiness_check&result=early_stage$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Contact' })).toBeVisible();
  await expect(page.getByTestId('contact-form-shell')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue(AUTH_NAME);
  await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue(AUTH_EMAIL);
  await expect(page.getByLabel('Subject')).toHaveValue('AI Readiness follow-up');
  await expect(page.getByLabel('Enquiry type')).toHaveValue('business_enquiry');
}

test.describe('readiness sprint 4 closure', () => {
  test('continues a resumed assessment, reaches the auth gate, and carries the result into contact', async ({
    page
  }) => {
    const requestLog = await installSprint4Mocks(page, {
      linkStatus: 200,
      resultStatus: 200,
      authenticatedContact: true
    });

    await seedBrowserState(page, '/readiness', RESUMABLE_SESSION_TOKEN);

    const response = await page.goto('/readiness');

    expect(response, '/readiness should respond').not.toBeNull();
    expect(response?.ok(), '/readiness should respond with OK').toBeTruthy();

    await expect(page.getByText(/continue where you left off\?/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
    await page.getByRole('button', { name: /continue/i }).click();

    await answerRemainingQuestions(page, 3);

    await expect(page.getByRole('button', { name: /see my results/i })).toBeVisible();
    await page.getByRole('button', { name: /see my results/i }).click();

    await expect(page.getByText(/sign in to see your results/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with linkedin/i })).toBeVisible();

    await Promise.all([
      page.waitForURL((url) => url.pathname === '/auth/callback' || url.pathname === '/readiness/result'),
      page.getByRole('button', { name: /continue with linkedin/i }).click()
    ]);

    await expect(page.getByRole('link', { name: /start with a conversation/i })).toBeVisible();
    await expect(page.getByText('Early-Stage')).toBeVisible();

    const cta = page.getByRole('link', { name: /start with a conversation/i });
    await Promise.all([
      page.waitForURL((url) => url.pathname === '/contact' && url.search === '?source=readiness_check&result=early_stage'),
      cta.click()
    ]);

    await expectContactHandoff(page);
    expect(requestLog.some((entry) => entry.pathname === '/auth/callback')).toBe(true);
  });

  test('restarts an abandoned session from question 1 before continuing the journey', async ({ page }) => {
    await installSprint4Mocks(page, {
      authenticatedContact: true
    });

    await seedBrowserState(page, '/readiness', ABANDONED_SESSION_TOKEN);

    const response = await page.goto('/readiness');

    expect(response, '/readiness should respond').not.toBeNull();
    expect(response?.ok(), '/readiness should respond with OK').toBeTruthy();

    await expect(page.getByText(/continue where you left off\?/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /start again/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /continue/i })).toHaveCount(0);

    await page.getByRole('button', { name: /start again/i }).click();

    await expect(page.getByText(QUESTION_SET.data.questions[0].text)).toBeVisible();
    await expect(page.getByText(/question 1 of 7/i)).toBeVisible();
  });

  test('keeps auth failures user-safe when the result route is opened without a valid session', async ({ page }) => {
    await installSprint4Mocks(page, {
      authenticatedContact: false
    });

    await seedBrowserState(page, '/readiness/result', RESULT_SESSION_TOKEN);

    const response = await page.goto('/readiness/result');

    expect(response, '/readiness/result should respond').not.toBeNull();
    expect(response?.ok(), '/readiness/result should respond with OK').toBeTruthy();

    const alert = page.locator('main [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/sign in|back to assessment start|auth/i);
  });

  test('keeps protected result failures user-safe after link-session succeeds', async ({ page }) => {
    await installSprint4Mocks(page, {
      linkStatus: 200,
      resultStatus: 500,
      authenticatedContact: true
    });

    await seedBrowserState(page, '/readiness/result', RESULT_SESSION_TOKEN);

    const response = await page.goto('/readiness/result');

    expect(response, '/readiness/result should respond').not.toBeNull();
    expect(response?.ok(), '/readiness/result should respond with OK').toBeTruthy();

    const alert = page.locator('main [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/unable to load|restart|result/i);
  });

  test('keeps missing-session failures user-safe when the chain cannot link the stored session', async ({ page }) => {
    await installSprint4Mocks(page, {
      linkStatus: 404,
      authenticatedContact: true,
      missingSession: true
    });

    await seedBrowserState(page, '/readiness/result', RESULT_SESSION_TOKEN);

    const response = await page.goto('/readiness/result');

    expect(response, '/readiness/result should respond').not.toBeNull();
    expect(response?.ok(), '/readiness/result should respond with OK').toBeTruthy();

    const alert = page.locator('main [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/session|restart|not found|different account/i);
  });
});
