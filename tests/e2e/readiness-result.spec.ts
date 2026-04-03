import { expect, type Page, test } from '@playwright/test';

const RESULT_SESSION_TOKEN = '55555555-5555-4555-8555-555555555555';

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
      resultId: 'result_early_stage_001',
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

async function primeAuthenticatedResultRoute(page: Page, sessionToken = RESULT_SESSION_TOKEN) {
  await page.addInitScript(
    ({ token }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('readiness_session_token', token);
      window.history.replaceState({}, '', '/readiness/result');
    },
    { token: sessionToken }
  );
}

async function installResultMocks(page: Page, options: { linkStatus?: number; resultStatus?: number }) {
  const requests: Array<{ method: string; pathname: string; body?: Record<string, unknown> }> = [];

  await page.route('**/api/readiness-check/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname.endsWith('/api/readiness-check/link-session') && method === 'POST') {
      const body = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      requests.push({ method, pathname: url.pathname, body });
      await new Promise((resolve) => setTimeout(resolve, 100));

      if ((options.linkStatus ?? 200) === 200) {
        await route.fulfill(createLinkSuccessResponse());
        return;
      }

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
          options.linkStatus
        )
      );
      return;
    }

    if (url.pathname.includes('/api/readiness-check/result/') && method === 'GET') {
      requests.push({ method, pathname: url.pathname });
      await new Promise((resolve) => setTimeout(resolve, 100));

      if ((options.resultStatus ?? 200) === 200) {
        await route.fulfill(createResultResponse());
        return;
      }

      await route.fulfill(
        json(
          {
            success: false,
            error: {
              code: 'NOT_FOUND',
              message: 'Requested readiness result is not ready yet.'
            }
          },
          404
        )
      );
      return;
    }

    throw new Error(`Unexpected request: ${method} ${url.pathname}`);
  });

  return requests;
}

test.describe('readiness result route', () => {
  test('desktop authenticated post-auth flow links the session first and then renders the result surface', async ({
    page,
    isMobile
  }) => {
    test.skip(isMobile, 'desktop-only coverage');

    const requests = await installResultMocks(page, { linkStatus: 200, resultStatus: 200 });
    await primeAuthenticatedResultRoute(page);

    const response = await page.goto('/readiness/result');

    expect(response, '/readiness/result should respond').not.toBeNull();
    expect(response?.ok(), '/readiness/result should respond with OK').toBeTruthy();

    await expect(page.getByText(/loading your results/i)).toBeVisible();
    await expect(page.getByText('Early-Stage')).toBeVisible();
    await expect(page.getByText('18')).toBeVisible();
    await expect(page.getByText('/100')).toBeVisible();
    await expect(page.getByRole('link', { name: /start with a conversation/i })).toHaveAttribute(
      'href',
      '/contact?source=readiness_check&result=early_stage'
    );

    expect(requests[0]).toMatchObject({
      method: 'POST',
      pathname: '/api/readiness-check/link-session',
      body: {
        sessionToken: RESULT_SESSION_TOKEN
      }
    });
    expect(requests[1]).toMatchObject({
      method: 'GET',
      pathname: `/api/readiness-check/result/${RESULT_SESSION_TOKEN}`
    });
    await expect(page.getByText('Placeholder route for SPR-01 bootstrap.')).toHaveCount(0);
  });

  test('mobile authenticated post-auth flow still performs the two-step sequence and shows the result instead of the placeholder', async ({
    page,
    isMobile
  }) => {
    test.skip(!isMobile, 'mobile-only coverage');

    const requests = await installResultMocks(page, { linkStatus: 200, resultStatus: 200 });
    await primeAuthenticatedResultRoute(page);

    const response = await page.goto('/readiness/result');

    expect(response, '/readiness/result should respond').not.toBeNull();
    expect(response?.ok(), '/readiness/result should respond with OK').toBeTruthy();

    await expect(page.getByText(/loading your results/i)).toBeVisible();
    await expect(page.getByText('Early-Stage')).toBeVisible();
    await expect(page.getByRole('link', { name: /start with a conversation/i })).toBeVisible();

    expect(requests[0]).toMatchObject({
      method: 'POST',
      pathname: '/api/readiness-check/link-session',
      body: {
        sessionToken: RESULT_SESSION_TOKEN
      }
    });
    expect(requests[1]).toMatchObject({
      method: 'GET',
      pathname: `/api/readiness-check/result/${RESULT_SESSION_TOKEN}`
    });
  });

  test('404 link-session failures are user-safe and do not crash', async ({ page }) => {
    const requests = await installResultMocks(page, { linkStatus: 404, resultStatus: 200 });
    await primeAuthenticatedResultRoute(page);

    await page.goto('/readiness/result');

    const alert = page.locator('main [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/session not found|start again|restart/i);
    await expect(page.getByText('Early-Stage')).toHaveCount(0);
    expect(requests).toHaveLength(1);
  });

  test('403 link-session failures are user-safe and do not crash', async ({ page }) => {
    const requests = await installResultMocks(page, { linkStatus: 403, resultStatus: 200 });
    await primeAuthenticatedResultRoute(page);

    await page.goto('/readiness/result');

    const alert = page.locator('main [role="alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/different account/i);
    await expect(page.getByText('Early-Stage')).toHaveCount(0);
    expect(requests).toHaveLength(1);
  });

  test('unauthenticated access stays user-safe and does not show result data', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
      window.history.replaceState({}, '', '/readiness/result');
    });

    const response = await page.goto('/readiness/result');

    expect(response, '/readiness/result should respond').not.toBeNull();
    expect(response?.ok(), '/readiness/result should respond with OK').toBeTruthy();

    const returnLink = page.getByRole('link', { name: /back to assessment start|return to readiness/i });
    if (await returnLink.count()) {
      await expect(returnLink).toHaveAttribute('href', '/readiness');
    } else {
      await expect(page).toHaveURL(/\/readiness$/);
    }

    await expect(page.getByText('Early-Stage')).toHaveCount(0);
    await expect(page.getByText('Placeholder route for SPR-01 bootstrap.')).toHaveCount(0);
  });
});
